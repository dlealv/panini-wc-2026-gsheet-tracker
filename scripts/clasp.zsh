#!/bin/zsh
# /scripts/clasp.zsh
#
# clasp.zsh — Google Apps Script deployment orchestrator
# Purpose:
#   Provides controlled push, pull, and deployment workflows for Google Apps Script
#   projects using clasp, while preserving a modular local "src/" architecture.
# Key responsibilities:
#   - Converts between flat GAS structure and modular local structure
#   - Creates automatic backups before destructive operations
#   - Updates existing Apps Script deployments to the latest project version
#   - Isolates all clasp execution in temporary workspaces
#   - Prevents accidental state drift via controlled .clasp.json rewriting
# Safety guarantees:
#   - All operations run in isolated /tmp workspaces
#   - Remote state is always snapshotted before push
#   - Local src/ is always backed up before pull overwrite
#   - Deploy operations never modify local source files
#   - Temporary artifacts are always cleaned up
# Dry-run mode:
#   - No network calls (clasp pull/push/deploy is skipped)
#   - No modifications to src/
#   - Mock workspaces are generated for validation
#   - Backup archives are still produced for pipeline verification
# Usage:
#   zsh scripts/clasp.zsh pull   [--env PREFIX | --file PATH]
#   zsh scripts/clasp.zsh push   [--env PREFIX | --file PATH]
#   zsh scripts/clasp.zsh deploy [--env PREFIX | --file PATH]
#   One of --env/--file is always required - there is no bare/default invocation. Both resolve to a config
#   file providing SCRIPT_ID, DEPLOYMENT_ID, and DEPLOYMENT_NAME:
#     --env PREFIX loads scripts/PREFIX_clasp.cfg.zsh (e.g. --env TEST -> scripts/TEST_clasp.cfg.zsh)
#     --file PATH  loads PATH directly - a bare filename (no "/") is resolved under scripts/,
#                  anything containing "/" is used as given (relative to cwd, or absolute)
#   scripts/ENV_clasp.cfg.zsh is the tracked template (placeholder values only, safe to commit); every real
#   config file (scripts/*_clasp.cfg.zsh) is gitignored and created locally. Expected format:
#     SCRIPT_ID="your_script_id_here"
#     DEPLOYMENT_ID="your_deployment_id_here"
#     DEPLOYMENT_NAME="your_deployment_description_here"
#   A config file (rather than inline scriptId/deploymentId values on the command line) is deliberate:
#   scriptId/deploymentId are long, opaque, easily-confused strings - naming each one inside a file makes it
#   self-labeling, and keeps both values out of shell history and process listings entirely.
#  clasp requires Node v18; this script will attempt to switch to the correct version via NVM if a mismatch is detected.
#  See docs/TechnicalArchitecture.md ("Local Clasp Configuration") for details.
# -------------------------------------------------------------------------------------

set -e # Exit immediately if a command exits with a non-zero status
setopt null_glob # Enable nullglob to avoid issues with empty file patterns

# #region Global variables

CMD=$1
[[ $# -gt 0 ]] && shift # remaining args ($@) are parsed as flags by parse_options(), once functions are defined

OPT_ENV=""
OPT_FILE=""
# Populated by resolve_and_load_config() from the selected config file - see Usage above for the file format.
SCRIPT_ID=""
DEPLOYMENT_ID=""
DEPLOYMENT_NAME=""

SCRIPT_DIR="${0:A:h}"
CLASP_TEMPLATE="$SCRIPT_DIR/.clasp.json.template"
SRC_DIR="src"
BACKUP_DIR="backup"
DEFAULT_ROOT="__ROOT_DIR__"
DEFAULT_SCRIPT_ID="__SCRIPT_ID__"
LOG_LEVEL=${LOG_LEVEL:-0} # 0 = minimal, 1 = normal
DRY_RUN=${DRY_RUN:-false} # Toggle this to true to enable dry run mode (no actual file changes or network calls)
REQUIRED_NODE_VERSION="18" # Centralized Node version requirement for clasp execution

TMP_WORKDIR="/tmp/clasp_run_$$"
CLASP_CONFIG="$TMP_WORKDIR/.clasp.json"
TMP_CLASP="$TMP_WORKDIR/tmp_clasp"
TMP_DOWNLOAD="$TMP_WORKDIR/gas_download"

# endregion Global variables

# #region helpers

# Displays the help message for the script, including usage instructions, commands, options, arguments, environment
# variables, examples, and safety information.
show_help() {
cat <<EOF
clasp.zsh — Google Apps Script deployment orchestrator

USAGE
    zsh scripts/clasp.zsh <command> (--env PREFIX | --file PATH)
COMMANDS
    pull        Pull Apps Script project into the local src/ structure.
    push        Push the local src/ project to Apps Script.
    deploy      Create a new Apps Script version and update a deployment.
OPTIONS
    -h, --help, -help, help    Show this help message and exit.
    --env PREFIX               Loads scripts/PREFIX_clasp.cfg.zsh.
                                Example: --env TEST -> scripts/TEST_clasp.cfg.zsh
    --file PATH                Loads PATH directly. A bare filename (no "/") is resolved under
                                scripts/; anything containing "/" is used as given (relative or absolute).
    One of --env or --file is always required - there is no default/bare invocation.
CONFIG FILE FORMAT
    SCRIPT_ID="your_script_id_here"
    DEPLOYMENT_ID="your_deployment_id_here"
    DEPLOYMENT_NAME="your_deployment_description_here"
    All three fields are required regardless of command (pull/push only use SCRIPT_ID).
ENVIRONMENT VARIABLES
    LOG_LEVEL=0|1, 0 = minimal output (default), 1 = verbose logging
    DRY_RUN=true|1|yes|on. Simulates execution without network calls.
    DRY_RUN=false|0|no|off (default), or unset. Executes normally.
    Any other value is a hard error - never silently treated as "not dry run".
LOCAL SETUP
    scripts/ENV_clasp.cfg.zsh is the tracked template (placeholder values, safe to commit).
    Copy it to scripts/<PREFIX>_clasp.cfg.zsh and fill in real values (gitignored, never
    committed) - see docs/TechnicalArchitecture.md ("Local Clasp Configuration") for details.
EXAMPLES
    zsh scripts/clasp.zsh pull --env TEST
    zsh scripts/clasp.zsh push --env TEST
    zsh scripts/clasp.zsh deploy --env TEST
    zsh scripts/clasp.zsh push --file OTHER_clasp.cfg.zsh
    DRY_RUN=true zsh scripts/clasp.zsh push --env TEST
    LOG_LEVEL=1 zsh scripts/clasp.zsh deploy --file /path/to/prod_clasp.cfg.zsh
SAFETY
    • All clasp operations run in isolated temporary workspaces.
    • Remote projects are backed up before push.
    • Local src/ is backed up before pull.
    • Deploy never modifies local source files.
EOF
}

# Helper: Verifies current Node version matches required baseline. 
# Lazily invokes NVM env switches only when an active discrepancy is detected.
ensure_node_version() {
    # Check if the active version already starts with the required version number (e.g., v18.)
    if [[ "$(node -v)" == "v${REQUIRED_NODE_VERSION}."* ]]; then
        log 1 "[CONF] Already using required Node version: $(node -v)"
        return 0
    fi

    log 1 "[CONF] Node mismatch detected. Activating NVM context..."
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        \. "$NVM_DIR/nvm.sh"
        nvm use "$REQUIRED_NODE_VERSION" > /dev/null
    else
        log 0 "[ERROR] NVM not found. Cannot force Node v${REQUIRED_NODE_VERSION} context. Install nvm and ensure it's available in the shell environment."
        exit 1
    fi
    log 1 "[CONF] Switched to required Node version: $(node -v)"
}

# Helper: DRY_RUN check. Recognizes true/1/yes/on and false/0/no/off (case-insensitive) explicitly; any other
# value is a hard error rather than silently falling through to a real (network-touching) run - DRY_RUN is
# safety-critical, so an unrecognized value (e.g. a typo) must never be misread as "not dry run".
is_dry_run() {
    case "${DRY_RUN:l}" in
        true|1|yes|on) return 0 ;;
        false|0|no|off|"") return 1 ;;
        *)
            log 0 "[ERROR] Unrecognized DRY_RUN value '$DRY_RUN'. Use true/1/yes/on or false/0/no/off."
            exit 1
            ;;
    esac
}

# Prints "$@" (the message) only when LOG_LEVEL >= "$1" (the level), then shifts it off. Centralizes verbosity
# gating in one place instead of scattering "if LOG_LEVEL..." checks or a fixed detail/terse split: level 0
# is the terse, always-shown result of a completed step (LOG_LEVEL defaults to 0, so a level-0 message always
# prints); level 1+ is progressively more detailed narration. New levels can be introduced later without
# touching call sites - only the level argument passed at each one. Errors/warnings/DRY_RUN diagnostics stay
# plain `echo` throughout this script, since they must always print regardless of any level.
log() {
    local level=$1
    shift
    [[ "$LOG_LEVEL" -ge "$level" ]] && echo "$@"
    return 0
}

# Helper: DRY_RUN block for pull_execute
dry_run_pull_execute() {
    log 1 "[DRY RUN] Generating simulated remote GAS payload in tmp_clasp..."
    rm -rf "$TMP_CLASP"
    mkdir -p "$TMP_CLASP"
    touch "$TMP_CLASP/Code.gs"
    touch "$TMP_CLASP/Commons.gs"
    touch "$TMP_CLASP/Example.html"
    touch "$TMP_CLASP/appsscript.json"
}

# Helper: DRY_RUN block for pull_after
dry_run_pull_after() {
    log 1 "[DRY RUN] Validating simulated remote payload. Files available in tmp_clasp before transformation:"
    if [[ "$LOG_LEVEL" -ge 1 ]]; then
        find "$TMP_CLASP" -maxdepth 1 -type f -print
    fi
    log 1 "[DRY RUN] Simulated payload validation completed"
    log 1 "[DRY RUN] Simulating file moves from tmp_clasp dir to src..."
    # simulate .gs file moves
    find "$TMP_CLASP" -maxdepth 1 -name "*.gs" | while read f; do
        base=$(basename "$f" .gs)
        log 1 "[DRY RUN] would move $f -> src/${base}.gs"
    done
    # simulate html file moves
    find "$TMP_CLASP" -maxdepth 1 -name "*.html" | while read f; do
        base=$(basename "$f")
        log 1 "[DRY RUN] would move $f -> src/html/${base}"
    done
    # simulate appsscript.json
    if [[ -f "$TMP_CLASP/appsscript.json" ]]; then
        log 1 "[DRY RUN] would move $TMP_CLASP/appsscript.json -> src/appsscript.json"
    fi
    log 1 "[DRY RUN] Simulated transformation completed successfully"
    log 0 "[DRY RUN] Simulated transform of tmp_clasp into src structure."
    log 0 "[DRY RUN] Pull process completed."
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
        log 1 "[DRY RUN] ZIP snapshot view (.js → .gs conversion preview)..." >&2
    fi
    for f in "$src"/*(.N); do
        local base="${f:t}"
        if [[ "$base" == *.js ]]; then
            local newname="${base%.js}.gs"
            if [[ "$mode" == "dry_run" ]]; then
                log 1 "[DRY RUN] converted for backup: $base -> $newname" >&2
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
    log 1 "[DRY RUN] Validating push artifact in tmp_clasp dir..."
    log 1 "----------------------------------------"
    if [[ -d "$TMP_CLASP" ]]; then
        [[ "$LOG_LEVEL" -ge 1 ]] && ls -la "$TMP_CLASP"
    else
        log 0 "[ERROR] TMP_CLASP missing"
    fi
    log 1 "----------------------------------------"
}

# Parses the flags remaining in $@ after CMD has been shifted off: --env, --file. Any unrecognized token is a
# hard error (prints usage, exits 1) rather than being silently ignored.
parse_options() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --env)
                OPT_ENV="$2"
                shift 2
                ;;
            --file)
                OPT_FILE="$2"
                shift 2
                ;;
            *)
                log 0 "[ERROR] Unknown option '$1'"
                log 0
                show_help
                exit 1
                ;;
        esac
    done
}

# Cross-platform sed in-place editing helper function to handle differences between GNU and BSD sed implementations.
sed_safe() {
    local expr="$1"
    local file="$2"
    case "$(uname -s)" in
        Darwin)
            sed -i '' "$expr" "$file"
            ;;
        Linux)
            sed -i "$expr" "$file"
            ;;
        *)
            log 0 "[ERROR] Unsupported OS: $(uname -s)"
            exit 1
            ;;
    esac
}

# Resolves the --env/--file selection (parse_options() must have already run) into a config file path.
# Assumes exactly one of OPT_ENV/OPT_FILE is set - enforced by the caller, resolve_and_load_config().
resolve_config_path() {
    if [[ -n "$OPT_ENV" ]]; then
        echo "$SCRIPT_DIR/${OPT_ENV}_clasp.cfg.zsh"
        return
    fi
    case "$OPT_FILE" in
        */*) echo "$OPT_FILE" ;;
        *) echo "$SCRIPT_DIR/$OPT_FILE" ;;
    esac
}

# Validates --env/--file were given (exactly one, not both, not neither), resolves the target config file
# path, sources it, and validates SCRIPT_ID/DEPLOYMENT_ID/DEPLOYMENT_NAME are all present. Required regardless
# of command (pull/push only use SCRIPT_ID) - one validation rule, matching the config file's "fully describes
# one environment/profile" contract. Runs once, early in main, before any temp workspace is created.
resolve_and_load_config() {
    if [[ -n "$OPT_ENV" && -n "$OPT_FILE" ]]; then
        log 0 "[ERROR] --env and --file cannot both be given. Choose one."
        exit 1
    fi
    if [[ -z "$OPT_ENV" && -z "$OPT_FILE" ]]; then
        log 0 "[ERROR] One of the input arguments --file or --env is required. Run 'zsh scripts/clasp.zsh -h' for more details."
        exit 1
    fi
    local config_path
    config_path=$(resolve_config_path)
    if [[ ! -f "$config_path" ]]; then
        log 0 "[ERROR] Missing clasp configuration file:"
        log 0 "    $config_path"
        log 0 "This file holds your Apps Script scriptId/deploymentId/deployment name and is"
        log 0 "intentionally excluded from git. Create it from the tracked template with:"
        log 0 "    cp scripts/ENV_clasp.cfg.zsh $config_path"
        log 0 "See docs/TechnicalArchitecture.md (\"Local Clasp Configuration\") for details."
        exit 1
    fi
    source "$config_path"
    if [[ -z "$SCRIPT_ID" || -z "$DEPLOYMENT_ID" || -z "$DEPLOYMENT_NAME" ]]; then
        log 0 "[ERROR] $config_path is missing SCRIPT_ID, DEPLOYMENT_ID, or DEPLOYMENT_NAME."
        log 0 "    Fill in all three values (see docs/TechnicalArchitecture.md, \"Local Clasp Configuration\")."
        exit 1
    fi
}

# Logs the current state of the .clasp.json configuration file for debugging purposes. A multi-line dump (the
# file's own content via `cat`), so it doesn't fit log()'s single-message shape - gates itself directly
# instead, at the same LOG_LEVEL >= 1 threshold log() uses for detail.
log_clasp_state() {
    local context=$1
    if [[ "$LOG_LEVEL" -lt 1 ]]; then
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
# If copy_src is true, it also copies the local src/ directory into the temporary workspace for processing.
init_clasp_config() {
    local copy_src=${1:-true}
    if [[ "$TMP_WORKDIR" == "/" || -z "$TMP_WORKDIR" ]]; then
        log 0 "[ERROR] Unsafe TMP_WORKDIR"
        exit 1
    fi
    rm -rf "$TMP_WORKDIR"
    mkdir -p "$TMP_WORKDIR"
    cp "$CLASP_TEMPLATE" "$TMP_WORKDIR/.clasp.json.template"
    cp "$CLASP_TEMPLATE" "$TMP_WORKDIR/.clasp.json"

    if [[ "$copy_src" == "true" ]]; then
        cp -R "$SRC_DIR" "$TMP_WORKDIR/"
    fi
}

# Reads, tracks, and handles dynamic structural scriptId value swaps inside the active clasp configuration
# module. On "start" substitutes the __SCRIPT_ID__ placeholder with the loaded SCRIPT_ID (see
# resolve_and_load_config(), already run by the time this is called). On "rollback" resets back to the
# placeholder - there's no real "original" value to restore since the template never carries one.
update_script_id() {
    local phase=$1
    if [[ "$phase" == "start" ]]; then
        sed_safe "s|\"scriptId\":.*|\"scriptId\": \"$SCRIPT_ID\",|" "$CLASP_CONFIG"
    elif [[ "$phase" == "rollback" ]]; then
        sed_safe "s|\"scriptId\":.*|\"scriptId\": \"$DEFAULT_SCRIPT_ID\",|" "$CLASP_CONFIG"
    fi
    log_clasp_state "after scriptId update ($phase)"
}

# Cleans all temporary runtime workspaces created during execution.
cleanup_workspace() {
    log 1 "[CLEANUP] Removing temporary workspace..."
    if [[ -d "$TMP_WORKDIR" ]]; then
        log 1 "[CLEANUP] Path: $TMP_WORKDIR"
        rm -rf "$TMP_WORKDIR"
        log 0 "[CLEANUP] completed"
    else
        # A no-op second call (pull/deploy already cleaned up explicitly before this fires again via the
        # on_exit trap) - not worth a terse line every run, only shown at LOG_LEVEL=1.
        log 1 "[CLEANUP] Workspace already removed"
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
    log 1 "[DRY RUN] Simulating remote GAS snapshot..."
    log 0 "[DRY RUN] Captured live GAS state (via pull) before push."
    local zip_view
    zip_view=$(build_gas_zip_view "$TMP_DOWNLOAD" "dry_run")
    create_zip_backup "$zip_view" "gas"
    log 1 "[DRY RUN] Logical snapshot validated"
    log 1 "[DRY RUN] Snapshot simulation completed"
    rm -rf "$zip_view"
    rm -rf "$TMP_DOWNLOAD"
}

# Executes a clasp command inside a controlled temporary rootDir context.
# This function temporarily overrides "rootDir" in .clasp.json, runs a clasp
# command in the specified working directory, and restores the original rootDir
# after execution
# Allowed commands:
#   push  → uploads local project to Apps Script
#   pull  → downloads remote Apps Script project locally
# Usage:
#   call_clasp push <working_dir>
#   call_clasp pull <working_dir>
call_clasp() {
    local cmd=$1
    local working_dir=$2
    log_clasp_state "[call_clasp $cmd] (working_dir: $working_dir) before rootDir update"
    sed_safe "s|\"rootDir\"[[:space:]]*:[[:space:]]*.*|\"rootDir\": \"$working_dir\"|" "$CLASP_CONFIG"
    log_clasp_state "[call_clasp $cmd] (working_dir: $working_dir) after rootDir update"
    log 1 "[CLASP] Running clasp $cmd in isolated workspace"
    (
        if is_dry_run; then
            log 0 "[DRY RUN] clasp $cmd skipped"
        else
            trap 'restore_clasp_rootDir' EXIT INT TERM
            cd "$TMP_WORKDIR"
            if [[ "$cmd" == "push" ]]; then
                if [[ "$LOG_LEVEL" -eq 0 ]]; then
                    CI=true clasp push --force </dev/null >/dev/null
                else
                    CI=true clasp push --force </dev/null
                fi
            else
                if [[ "$LOG_LEVEL" -eq 0 ]]; then
                    CI=true clasp pull </dev/null >/dev/null
                else
                    CI=true clasp pull </dev/null
                fi
            fi
        fi
    )
    restore_clasp_rootDir
    log_clasp_state "[call_clasp $cmd] (working_dir: $working_dir) after clasp execution"
}

# Restores rootDir
restore_clasp_rootDir() {
    if [[ -f "$CLASP_CONFIG" ]]; then
        sed_safe "s|\"rootDir\":.*|\"rootDir\": \"$DEFAULT_ROOT\"|" "$CLASP_CONFIG"
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
    log 1 "--------------------------------------------------"
    log 1 "[BACKUP] Target folder: $target_folder"
    log 1 "[BACKUP] Output file: $backup_file"
    log 1 "--------------------------------------------------"
    # VALIDATION (must live here — not in caller)
    if [[ ! -d "$target_folder" ]]; then
        log 0 "[ERROR] folder does not exist"
        log 0 "           $target_folder"
        return 1
    fi
    if [[ -z "$(ls -A "$target_folder" 2>/dev/null)" ]]; then
        log 0 "[WARNING] folder is empty → skipping backup"
        return 0
    fi
    log 1 "[BACKUP] Creating archive..."
    (cd "$target_folder" && zip -r "$backup_file" . > /dev/null)
    log 0 "[BACKUP] SUCCESS. Created: $backup_file"
}

# Scans local source folders using native find commands and flattens all files cleanly into the build staging workspace.
flat_build_local_src() {
    log 1 "[BUILD_ARTIFACT] Creating flattened GAS deployment workspace..."
    rm -rf "$TMP_CLASP"
    mkdir -p "$TMP_CLASP"
    find "$SRC_DIR" -maxdepth 1 -name "*.gs" -exec cp {} "$TMP_CLASP/" \;
    find "$SRC_DIR/html" -maxdepth 1 -name "*.html" -exec cp {} "$TMP_CLASP/" \;
    for file in "appsscript.js" "appsscript.json"; do
        if [[ -f "$SRC_DIR/$file" ]]; then
            cp "$SRC_DIR/$file" "$TMP_CLASP/"
        fi
    done
    log 0 "[BUILD_ARTIFACT] Build completed flattened inside '$TMP_CLASP/' dir"
}

# Pulls live remote assets to a temporary folder to create a preventive rollback backup before pushing.
fetch_remote_snapshot() {
    log 1 "[REMOTE_SNAPSHOT] Capturing live GAS state before push..."
    if is_dry_run; then
        dry_run_remote_snapshot
        return
    fi
    rm -rf "$TMP_DOWNLOAD"
    mkdir -p "$TMP_DOWNLOAD"
    call_clasp pull "$TMP_DOWNLOAD"
    log 0 "[REMOTE_SNAPSHOT] Captured live GAS state (via pull) before push."
    local zip_view
    zip_view=$(build_gas_zip_view "$TMP_DOWNLOAD" "real")
    create_zip_backup "$zip_view" "gas"
    rm -rf "$zip_view"
    rm -rf "$TMP_DOWNLOAD"
}

# #endregion helpers

# #region pull
# ------------------------------------------------------------
# PULL PIPELINE FUNCTIONS
# ------------------------------------------------------------

# Action to carry out before pull execution, including local snapshotting and temp workspace preparation
# for incoming remote assets.
pull_before() {
    log 0 "[PREP] Workspace environment for pull created."
    # Backup current local state BEFORE overwrite
    log 1 "Creating src backup before pull..."
    create_zip_backup "$SRC_DIR" "src"
}

# Modifies target pathways temporarily and streams live server configuration code maps down from Apps Script instances.
pull_execute() {
    log 1 "[CLASP] Pulling files from Apps Script..."
    if is_dry_run; then
        dry_run_pull_execute
        return
    fi
    call_clasp pull "$TMP_CLASP"
}

# Processes flat server assets, translates extensions (.js to .gs), maps layouts, and runs structural empty checks.
pull_after() {
    log 1 "[BUILD_ARTIFACT] Transforming tmp_clasp into src structure..."
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
        log 0 "[ERROR] Temporary folder not empty. Something failed during parsing:"
        ls -la "$TMP_CLASP"
        exit 1
    fi
    log 0 "[BUILD_ARTIFACT] Transformed tmp_clasp into src structure."
    log 0 "[CLASP] Pull process completed successfully."
    cleanup_workspace
}

# #endregion pull

# #region push

# ------------------------------------------------------------
# PUSH PIPELINE FUNCTIONS
# ------------------------------------------------------------

# Action to carry out before push execution, including remote snapshotting and local staging bundle preparation.
push_before() {
    log 0 "[PREP] Workspace environment for build deployment created."
    log 1 "[REMOTE_SNAPSHOT] Creating backup of live GAS project..."
    fetch_remote_snapshot
    log 1 "[BUILD_ARTIFACT] Flattening src into deployment bundle..."
    flat_build_local_src
}

# Points clasp to track the flattened compilation artifact directory and deploys code bundles up to the server.
push_execute() {
    log 1 "[CLASP] Pushing compiled flat assets..."
    if is_dry_run; then
        dry_run_validate_push_artifact
        log 0 "[DRY RUN] push skipped (no deployment)"
        return
    fi
    [[ -d "$TMP_CLASP" ]] || { log 0 "[ERROR] TMP_CLASP missing"; exit 1; }
    call_clasp push "$TMP_CLASP"
}

# Erases transient staging workspaces after push lifecycle completion.
push_after() {
    if is_dry_run; then
        log 0 "[DRY RUN] Push process completed."
    else
        log 0 "[CLASP] Push process completed successfully."
    fi
}

# #endregion push

# #region deploy

# ------------------------------------------------------------
# DEPLOYMENT EXECUTION LOGIC
# ------------------------------------------------------------

# Executes pre-deployment tasks. DEPLOYMENT_ID/DEPLOYMENT_NAME already come from the loaded config file
# (resolve_and_load_config(), run once near the top of main for every command) - nothing left to resolve here.
deploy_before() {
    log 0 "[PREP] Workspace environment for deployment created."
}

# Executes clasp command to create a new version and update the deployment with the new version number.
deploy_execute() {
    log 1 "[CLASP] Creating new Apps Script version..."
    if is_dry_run; then
        log 0 "[DRY RUN] Would create new version and update deployment '$DEPLOYMENT_NAME' ($DEPLOYMENT_ID)."
        return
    fi
    (
        trap 'restore_clasp_rootDir' EXIT INT TERM
        cd "$TMP_WORKDIR"
        VERSION_OUTPUT=$(CI=true clasp version)
        log 1 "$VERSION_OUTPUT"
        VERSION=$(echo "$VERSION_OUTPUT" | grep -oE '[0-9]+' | tail -1)

        if [[ -z "$VERSION" ]]; then
            log 0 "[ERROR] Failed to extract version number"
            exit 1
        fi
        CI=true clasp update-deployment "$DEPLOYMENT_ID" \
            --versionNumber "$VERSION" \
            --description "$DEPLOYMENT_NAME"
        log 0 "[CLASP] Updated deployment '$DEPLOYMENT_NAME' to version $VERSION."
    )
}

# post deployment task, so far no task is identified.
deploy_after() {
    if is_dry_run; then
        log 0 "[DRY RUN] Deploy process completed."
    else
        log 0 "[CLASP] Deploy process completed successfully."
    fi
    cleanup_workspace
}

# #endregion deploy

# #region main

# ------------------------------------------------------------
# MAIN EXECUTION LOGIC
# ------------------------------------------------------------

# Sequential routine blocks managing target processing based on input commands and environment parameter tokens.
# Capture original state ONCE.

# Show help message if requested
case "$CMD" in
    "")
        show_help
        exit 0
        ;;
    pull|push|deploy)
        ;;
    -h|--help|-help|help)
        show_help
        exit 0
        ;;
    *)
        log 0 "[ERROR] Unknown command '$CMD'"
        log 0
        show_help
        exit 1
        ;;
esac
parse_options "$@"
resolve_and_load_config
if [[ -n "$OPT_ENV" ]]; then
    OPTION_DISPLAY="--env $OPT_ENV"
else
    OPTION_DISPLAY="--file $OPT_FILE"
fi
timestamp=$(date +"%Y-%m-%d %H:%M:%S")
log 0 "[$timestamp] clasp.zsh script execution started..."
log 0 "[CONFIG] LOG_LEVEL='$LOG_LEVEL', DRY_RUN='$DRY_RUN', CMD='$CMD', OPTION='$OPTION_DISPLAY'"
# Always shown (both DRY_RUN and real runs, LOG_LEVEL=0) - the resolved values from the config file, so a
# terse run still lets you confirm which project/deployment is actually being targeted, not just which
# config file was selected.
if [[ "$CMD" == "deploy" ]]; then
    log 0 "[CONFIG] scriptId       = '$SCRIPT_ID'"
    log 0 "[CONFIG] deploymentId   = '$DEPLOYMENT_ID'"
    log 0 "[CONFIG] deploymentName = '$DEPLOYMENT_NAME'"
else
    log 0 "[CONFIG] scriptId='$SCRIPT_ID'"
fi

if is_dry_run; then
    log 0 "==================== DRY RUN MODE ENABLED ========================="
    log 0 "- No network calls. No source modifications."
    log 0 "- Temporary mock files WILL be created."
    log 0 "- Backup zip dry-run generation IS executed for validation"
    log 0 "==================================================================="
fi

# Ensure that any exit from the script (including interrupts) triggers a
# cleanup of temporary workspaces and a rollback of any scriptId changes to prevent state drift.
on_exit() {
    if [[ -f "$CLASP_CONFIG" ]]; then
        update_script_id "rollback"
    fi
    cleanup_workspace
}

if [[ "$CMD" == "deploy" ]]; then
    init_clasp_config false
else
    init_clasp_config
fi

# Set up a trap to ensure cleanup on exit, interrupt (Ctrl+C), or termination signals (kill), registered right
# after the temp workspace is created (init_clasp_config above) so any later failure still cleans it up.
trap on_exit EXIT INT TERM
update_script_id "start"

# Main execution router
ensure_node_version  # force correct node version for clasp
if [[ "$CMD" == "pull" ]]; then
    pull_before
    pull_execute
    pull_after
elif [[ "$CMD" == "push" ]]; then
    push_before
    push_execute
    push_after
elif [[ "$CMD" == "deploy" ]]; then
    deploy_before
    deploy_execute
    deploy_after
fi

# #endregion main
