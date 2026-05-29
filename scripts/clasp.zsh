#!/bin/zsh
# /scripts/clasp.zsh
# ------------------------------------------------------------------------------------
# clasp.zsh — Google Apps Script deployment orchestrator
# ------------------------------------------------------------------------------------
# Purpose:
#   Provides a controlled pull/push workflow for Google Apps Script projects
#   using clasp, while preserving a modular local "src/" architecture.
#
# Key responsibilities:
#   - Converts between flat GAS structure and modular local structure
#   - Creates automatic backups before destructive operations
#   - Isolates all clasp execution in temporary workspaces
#   - Prevents accidental state drift via controlled .clasp.json rewriting
#
# Safety guarantees:
#   - All operations run in isolated /tmp workspace
#   - Remote state is always snapshotted before push
#   - Local src/ is always backed up before pull overwrite
#   - Temporary artifacts are always cleaned up
#
# Dry-run mode:
#   - No network calls (clasp pull/push is skipped)
#   - No modifications to src/
#   - Mock workspaces are generated for validation
#   - Backup archives are still produced for pipeline verification
#
# Usage:
#   zsh scripts/clasp.zsh pull [scriptId]
#   zsh scripts/clasp.zsh push [scriptId]
# ------------------------------------------------------------------------------------

set -e # Exit immediately if a command exits with a non-zero status
setopt null_glob # Enable nullglob to avoid issues with empty file patterns

# Global variables and constants

CMD=$1
CUSTOM_SCRIPT_ID=$2
CLASP_TEMPLATE=".clasp.json.template"
SRC_DIR="src"
BACKUP_DIR="backup"
DEFAULT_ROOT="__ROOT_DIR__"
ORIGINAL_SCRIPT_ID=""
LOG_LEVEL=${LOG_LEVEL:0} # 0 = minimal, 1 = normal
#DRY_RUN=${DRY_RUN:-true} # Toggle this to true to enable dry run mode (no actual file changes or network calls)
DRY_RUN=${DRY_RUN:-false} # Toggle this to true to enable dry run mode (no actual file changes or network calls)

TMP_WORKDIR="/tmp/clasp_run_$$"
CLASP_CONFIG="$TMP_WORKDIR/.clasp.json"
TMP_CLASP="$TMP_WORKDIR/tmp_clasp"
TMP_DOWNLOAD="$TMP_WORKDIR/gas_download"

# ------------------------------------------------------------
# DRY RUN HELPER FUNCTIONS
# ------------------------------------------------------------

# Helper: DRY_RUN check
is_dry_run() {
    [[ "$DRY_RUN" == "true" ]]
}

# Helper: DRY_RUN block for pull_execute
dry_run_pull_execute() {
    echo "[DRY RUN] Generating simulated remote GAS payload in tmp_clasp..."
    rm -rf "$TMP_CLASP"
    mkdir -p "$TMP_CLASP"
    touch "$TMP_CLASP/Code.gs"
    touch "$TMP_CLASP/Commons.gs"
    touch "$TMP_CLASP/Example.html"
    touch "$TMP_CLASP/appsscript.json"
}

# Helper: DRY_RUN block for pull_after
dry_run_pull_after() {
    echo "[DRY RUN] Validating simulated remote payload. Files available in tmp_clasp before transformation:"
    find "$TMP_CLASP" -maxdepth 1 -type f -print

    echo "[DRY RUN] Simulated payload validation completed"
    echo "[DRY RUN] Simulating file moves from tmp_clasp dir to src..."

    # simulate .gs file moves
    find "$TMP_CLASP" -maxdepth 1 -name "*.gs" | while read f; do
        base=$(basename "$f" .gs)
        echo "[DRY RUN] would move $f -> src/${base}.gs"
    done

    # simulate html file moves
    find "$TMP_CLASP" -maxdepth 1 -name "*.html" | while read f; do
        base=$(basename "$f")
        echo "[DRY RUN] would move $f -> src/html/${base}"
    done

    # simulate appsscript.json
    if [[ -f "$TMP_CLASP/appsscript.json" ]]; then
        echo "[DRY RUN] would move $TMP_CLASP/appsscript.json -> src/appsscript.json"
    fi

    echo "[DRY RUN] Simulated transformation completed successfully"
    echo "Pull process completed successfully (DRY RUN)"
}

# Helper: DRY_RUN block for push_before remote snapshot simulation - includes ZIP view
# generation with conversion preview
build_gas_zip_view() {
    local src=$1
    local mode=$2
    local view="${src}_zip_view"
    rm -rf "$view"
    mkdir -p "$view"
    if [[ "$mode" == "dry_run" ]]; then
        echo "[DRY RUN] ZIP snapshot view (.js → .gs conversion preview)..." >&2
    fi
    for f in "$src"/*(.N); do
        local base="${f:t}"
        if [[ "$base" == *.js ]]; then
            local newname="${base%.js}.gs"
            if [[ "$mode" == "dry_run" ]]; then
                echo "[DRY RUN] converted for backup: $base -> $newname" >&2
            fi
            cp "$f" "$view/$newname"
        else
            cp "$f" "$view/$base"
        fi
    done
    echo "$view"
}

# Helper: DRY_RUN block for push_execute validation
dry_run_validate_push_artifact() {
    echo "[DRY RUN] Validating push artifact in tmp_clasp dir..."
    echo "----------------------------------------"
    if [[ -d "$TMP_CLASP" ]]; then
        ls -la "$TMP_CLASP"
    else
        echo "[DRY RUN] ERROR: TMP_CLASP missing"
    fi
    echo "----------------------------------------"
}

# ------------------------------------------------------------
# HELPER FUNCTIONS
# ------------------------------------------------------------

# Logs the current state of the .clasp.json configuration file for debugging purposes.
log_clasp_state() {
    local context=$1
    if [[ "$LOG_LEVEL" -eq 0 ]]; then
        echo "[CLASP CONFIG] Updated $CLASP_CONFIG $context"
        return
    fi
    if [[ -n "$context" ]]; then
        echo "========== clasp.json state [$context] =========="
    else
        echo "========== clasp.json state =========="
    fi
    cat "$CLASP_CONFIG"
    printf '\n======================================\n'
}

# Initializes an isolated runtime clasp workspace and generates a temporary .clasp.json from template.
init_clasp_config() {
    if [[ "$TMP_WORKDIR" == "/" || -z "$TMP_WORKDIR" ]]; then
        echo "Unsafe TMP_WORKDIR"
        exit 1
    fi

    rm -rf "$TMP_WORKDIR"
    mkdir -p "$TMP_WORKDIR"
    cp "$CLASP_TEMPLATE" "$TMP_WORKDIR/.clasp.json.template"
    cp "$CLASP_TEMPLATE" "$TMP_WORKDIR/.clasp.json"
    cp -R "$SRC_DIR" "$TMP_WORKDIR/"
}

# Reads, tracks, and handles dynamic structural scriptId value swaps inside the active clasp configuration module.
update_script_id() {
    local phase=$1
    if [[ -z "$CUSTOM_SCRIPT_ID" ]]; then
        return
    fi
    if [[ "$phase" == "start" ]]; then
        ORIGINAL_SCRIPT_ID=$(sed -n 's|.*"scriptId":[[:space:]]*"\([^"]*\)".*|\1|p' "$CLASP_CONFIG")
        sed -i '' "s|\"scriptId\":.*|\"scriptId\": \"$CUSTOM_SCRIPT_ID\",|" "$CLASP_CONFIG"
    elif [[ "$phase" == "rollback" ]]; then
        sed -i '' "s|\"scriptId\":.*|\"scriptId\": \"$ORIGINAL_SCRIPT_ID\",|" "$CLASP_CONFIG"
    fi
    log_clasp_state "after scriptId update ($phase)"
}

# Cleans all temporary runtime workspaces created during execution.
cleanup_workspace() {
    echo "[CLEANUP] Removing temporary workspace..."
    if [[ -d "$TMP_WORKDIR" ]]; then
        echo "[CLEANUP] Path: $TMP_WORKDIR"
        rm -rf "$TMP_WORKDIR"
        echo "[CLEANUP] completed"
    else
        echo "[CLEANUP] Workspace already removed"
    fi
}

# Prepares a temporary view of the source directory for zip output, converting .js files to .gs
# and maintaining structure. In dry run mode, it simulates the process and logs the intended actions
# without making changes.
dry_run_remote_snapshot() {
    rm -rf "$TMP_DOWNLOAD"
    mkdir -p "$TMP_DOWNLOAD"
    echo "// mock remote Apps Script file" > "$TMP_DOWNLOAD/Code.js"
    echo "// mock helper file" > "$TMP_DOWNLOAD/Commons.js"
    echo "<!-- mock html file -->" > "$TMP_DOWNLOAD/Example.html"
    echo '{"timeZone":"America/New_York"}' > "$TMP_DOWNLOAD/appsscript.json"
    echo "[DRY RUN] Simulating remote GAS snapshot..."
    local zip_view
    zip_view=$(build_gas_zip_view "$TMP_DOWNLOAD" "dry_run")
    create_zip_backup "$zip_view" "gas"
    echo "[DRY RUN] Logical snapshot validated"
    echo "[DRY RUN] Snapshot simulation completed"
    rm -rf "$zip_view"
    rm -rf "$TMP_DOWNLOAD"
}

# Executes a clasp command inside a controlled temporary rootDir context.
# This function temporarily overrides "rootDir" in .clasp.json, runs a clasp
# command in the specified working directory, and restores the original rootDir
# after execution.
#
# Allowed commands:
#   push  → uploads local project to Apps Script
#   pull  → downloads remote Apps Script project locally
#
# Usage:
#   call_clasp push <working_dir>
#   call_clasp pull <working_dir>
call_clasp() {
    local cmd=$1
    local working_dir=$2
    log_clasp_state "[call_clasp $cmd] (working_dir: $working_dir) before rootDir update"
    sed -i '' "s|\"rootDir\"[[:space:]]*:[[:space:]]*.*|\"rootDir\": \"$working_dir\"|" "$CLASP_CONFIG"
    log_clasp_state "[call_clasp $cmd] (working_dir: $working_dir) after rootDir update"
    echo "Running clasp $cmd in isolated workspace"
    (
        if is_dry_run; then
            echo "[DRY RUN] clasp $cmd skipped"
        else
            trap 'restore_clasp_rootDir' EXIT INT TERM
            cd "$TMP_WORKDIR"
            if [[ "$cmd" == "push" ]]; then
                CI=true clasp push --force </dev/null
            else
                CI=true clasp pull </dev/null
            fi
        fi
    )
    restore_clasp_rootDir
    log_clasp_state "[call_clasp $cmd] (working_dir: $working_dir) after clasp execution"
}

# Restores rootDir
restore_clasp_rootDir() {
    if [[ -f "$CLASP_CONFIG" ]]; then
        sed -i '' "s|\"rootDir\":.*|\"rootDir\": \"$DEFAULT_ROOT\"|" "$CLASP_CONFIG"
    fi
}

# Creates a uniquely timestamped zip backup archive of a target directory inside the backup directory.
create_zip_backup() {
    local target_folder=$1
    local file_suffix=$2
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local script_root="${0:A:h}"
    local backup_dir="${script_root}/${BACKUP_DIR}"
    mkdir -p "$backup_dir"
    local dry_run_suffix=""
    if is_dry_run; then
        dry_run_suffix="_dry_run"
    fi
    local backup_file="${backup_dir}/${timestamp}_${file_suffix}${dry_run_suffix}.zip"
    echo "--------------------------------------------------"
    echo "[BACKUP] Target folder: $target_folder"
    echo "[BACKUP] Output file: $backup_file"
    echo "--------------------------------------------------"
    # VALIDATION (must live here — not in caller)
    if [[ ! -d "$target_folder" ]]; then
        echo "[BACKUP] ERROR: folder does not exist"
        echo "           $target_folder"
        return 1
    fi
    if [[ -z "$(ls -A "$target_folder" 2>/dev/null)" ]]; then
        echo "[BACKUP] WARNING: folder is empty → skipping backup"
        return 0
    fi
    echo "[BACKUP] Creating archive..."
    (cd "$target_folder" && zip -r "$backup_file" . > /dev/null)
    echo "[BACKUP] SUCCESS. Created: $backup_file"
}

# Scans local source folders using native find commands and flattens all files cleanly into the build staging workspace.
flat_build_local_src() {
    echo "[BUILD_ARTIFACT] Creating flattened GAS deployment workspace..."
    rm -rf "$TMP_CLASP"
    mkdir -p "$TMP_CLASP"
    find "$SRC_DIR" -maxdepth 1 -name "*.gs" -exec cp {} "$TMP_CLASP/" \;
    find "$SRC_DIR/html" -maxdepth 1 -name "*.html" -exec cp {} "$TMP_CLASP/" \;
    for file in "appsscript.js" "appsscript.json"; do
        if [[ -f "$SRC_DIR/$file" ]]; then
            cp "$SRC_DIR/$file" "$TMP_CLASP/"
        fi
    done
    echo "[BUILD_ARTIFACT] Build completed flattened inside '$TMP_CLASP/' dir"
}

# Pulls live remote assets to a temporary folder to create a preventive rollback backup before pushing.
fetch_remote_snapshot() {
    echo "[REMOTE_SNAPSHOT] Capturing live GAS state before push..."
    if is_dry_run; then
        dry_run_remote_snapshot
        return
    fi
    rm -rf "$TMP_DOWNLOAD"
    mkdir -p "$TMP_DOWNLOAD"
    call_clasp pull "$TMP_DOWNLOAD"
    local zip_view
    zip_view=$(build_gas_zip_view "$TMP_DOWNLOAD" "real")
    create_zip_backup "$zip_view" "gas"
    rm -rf "$zip_view"
    rm -rf "$TMP_DOWNLOAD"
}

# ------------------------------------------------------------
# PULL PIPELINE FUNCTIONS
# ------------------------------------------------------------

# Action to carry out before pull execution, including local snapshotting and temp workspace preparation
# for incoming remote assets.
pull_before() {
    echo "Preparing workspace environment for pull..."
    # Backup current local state BEFORE overwrite
    echo "Creating src backup before pull..."
    create_zip_backup "$SRC_DIR" "src"
}

# Modifies target pathways temporarily and streams live server configuration code maps down from Apps Script instances.
pull_execute() {
    echo "Pulling files from Apps Script..."
    if is_dry_run; then
        dry_run_pull_execute
        return
    fi
    call_clasp pull "$TMP_CLASP"
}

# Processes flat server assets, translates extensions (.js to .gs), maps layouts, and runs structural empty checks.
pull_after() {
    echo "[BUILD_ARTIFACT] Transforming tmp_clasp into src structure..."
    mkdir -p "$SRC_DIR/html"
    if is_dry_run; then
        dry_run_pull_after
        return 0
    fi
    find "$TMP_CLASP" -maxdepth 1 -name "*.html" -exec mv {} "$SRC_DIR/html/" \;
    for f in "$TMP_CLASP"/*.js; do
        if [[ -f "$f" ]]; then
            base=$(basename "$f" .js)
            mv "$f" "$SRC_DIR/${base}.gs"
        fi
    done
    if [[ -f "$TMP_CLASP/appsscript.json" ]]; then
        mv "$TMP_CLASP/appsscript.json" "$SRC_DIR/"
    fi
    if [[ -n "$(ls -A "$TMP_CLASP" 2>/dev/null)" ]]; then
        echo "ERROR: Temporary folder not empty. Something failed during parsing:"
        ls -la "$TMP_CLASP"
        exit 1
    fi
    cleanup_workspace
    echo "Pull process completed successfully."
}

# ------------------------------------------------------------
# PUSH PIPELINE FUNCTIONS
# ------------------------------------------------------------

# Action to carry out before push execution, including remote snapshotting and local staging bundle preparation.
push_before() {
    echo "Preparing workspace environment for production build deployment..."
    echo "[REMOTE_SNAPSHOT] Creating backup of live GAS project..."
    fetch_remote_snapshot
    echo "[BUILD_ARTIFACT] Flattening src into deployment bundle..."
    flat_build_local_src
}

# Points clasp to track the flattened compilation artifact directory and deploys code bundles up to the server.
push_execute() {
    echo "Pushing compiled flat assets..."
    if is_dry_run; then
        dry_run_validate_push_artifact
        echo "[DRY RUN] push skipped (no deployment)"
        return
    fi
    [[ -d "$TMP_CLASP" ]] || { echo "ERROR: TMP_CLASP missing"; exit 1; }
    call_clasp push "$TMP_CLASP"
}

# Erases transient staging workspaces after push lifecycle completion.
push_after() {
    if is_dry_run; then
        echo "Push process completed (DRY RUN - no deployment)"
    else
        echo "Push process completed successfully. Cleaned temporary build directory."
    fi
}

# ------------------------------------------------------------
# MAIN EXECUTION LOGIC
# ------------------------------------------------------------

# Sequential routine blocks managing target processing based on input commands and environment parameter tokens.
# Capture original state ONCE.

if is_dry_run; then
    echo "==================== DRY RUN MODE ENABLED ========================="
    echo "- No network calls."
    echo "- No source modifications."
    echo "- Temporary mock files WILL be created."
    echo "- Backup zip generation IS executed for validation"
    echo "==================================================================="
fi

# Ensure that any exit from the script (including interrupts) triggers a
# cleanup of temporary workspaces and a rollback of any scriptId changes to prevent state drift.
on_exit() {
    if [[ -n "$CUSTOM_SCRIPT_ID" && -f "$CLASP_CONFIG" ]]; then
        update_script_id "rollback"
    fi
    cleanup_workspace
}

init_clasp_config
update_script_id "start"
trap on_exit EXIT INT TERM

if [[ "$CMD" == "pull" ]]; then
    pull_before
    pull_execute
    pull_after
elif [[ "$CMD" == "push" ]]; then
    push_before
    push_execute
    push_after
else
    echo "Usage: zsh scripts/clasp.zsh [pull|push] [optional_script_id]"
    update_script_id "rollback"
    trap - EXIT INT TERM
    exit 1
fi