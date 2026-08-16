# 📘 Technical Documentation: Panini WC 2026 GSheet Tracker

This document provides a comprehensive technical overview of the system architecture, file structures, development lifecycle pipelines, and core engineering design constraints governing the Panini WC 2026 Gsheet Tracker project.

---

## 1. System Purpose & Scope

The application is built on a hybrid architecture combining a production **Google Apps Script (GAS) runtime** with a local **Node.js development and testing pipeline**. The system architecture achieves three core goals:
*   Allows application execution natively inside Google Sheets utilizing specialized GAS services.
*   Enables strict, isolated local unit testing using Jest via a deterministic, mocked GAS runtime kernel.
*   Maintains a clean separation between raw business data logic, user interface layouts, and the multi-stage deployment build steps.

---

## 2. Component Communication Flow

The application isolates execution states between the cloud-based Google Sheets environment, local source code editing layouts, and the automated local verification build caches.

### 📥 Data Sync Pipeline Architecture

```text
 Google Sheets (GAS Cloud Runtime)
   │
   ├── [ npm run clasp:pull ] ──>  Executes transactional deployment pipeline via 'scripts/clasp.zsh pull':
   |                              1. Downloads flat assets into 'tmp/tmp_clasp'
   │                              2. Reorganizes flat code into 'src/' folder structure
   │                              3. Converts file extensions (.js -> .gs)
   │                              4. Creates timestamped in backup archive 'backup/YYYYMMDDhhmmss_src.zip'
   |                              5. Move downloaded and transformed files from `tmp/tmp_clasp` into `src/`
   │                              6. Deletes 'tmp_clasp' folder when empty
   ▼
 src/ (MUTABLE LOCAL SOURCE OF TRUTH)
   ├── *.gs (Code.gs, Commons.gs, *Service.gs)
   └── html/ (*Dialog.html, *Helpers.html, *Render.html, *Styles.html, Mobile*.html)
   │
   ├── [ npm run build ] ──>  Triggers 'node scripts/build.js' bridge:
   │                          - Translates '.gs' files to Jest-safe JS
   │                          - Extracts script tags out of HTML layouts from *Helpers.html and *Render.html
   │                          - Appends CommonJS-compatible exports via @export annotations (used for Jest execution layer)
   ▼
 build/ (AUTO-GENERATED TESTING WORKSPACE — DO NOT EDIT MANUALLY)
   ├── (Code.js, Commons.js, *Service.js, *Helpers.html.js, *Render.html.js)
   │
   ├── [ npm run test ] ──>  Triggers 'jest' runner engine:
   │                         - Loads 'test/utils/testKernel.js' Google Spreadsheet mocks
   │                         - Evaluates target test suites (*.unit.test.js)
   │                         - Note: The 'test' task always executes the 'build' first to ensure the latest compiled artifacts are used.
   ▼
 Isolated Test Environment Compliance Checks
   │
   ├── [ npm run clasp:push ] ──> Executes transactional deployment pipeline via 'scripts/clasp.zsh push':
   │                              1. Creates remote backup snapshot (gas_download → backup ZIP)
   │                              2. Builds isolated staging workspace (tmp_clasp)
   │                              3. Flattens src/ and src/html/ into deployable GAS format
   │                              4. Injects scriptId (optional production override)
   │                              5. Executes clasp push to Google Apps Script
   ▼
 Google Apps Script Staging/Production Instance
   │
   │── [ npm run clasp:deploy ] ──> Deploy a new version of the Web app via 'scripts/clasp.zsh deploy':
   │                              1. Creates a new version of the Web app deployment, keeping the same URL link
   │                              2. Preserves the description of the deploy (deployment name)
   |                              Notes: 
   |                              1. It assumes a deployment already exists and the deployment id is known.
   |                              2. It creates a new version of the deployment of the GAS cloud project,
   |                                 so before deploy you need to execute push first.
   |
   ▼
 Google Web app deployment updated (new version of the mobile application deployed)  

```

### 📥 The Pull Sync Sequence (Remote Cloud $\rightarrow$ Local Repository)
*   **Trigger**: Executed locally via `npm run clasp:pull`.
*   **Backup Action**: Automatically bundles your current local `src/` directory into a timestamped recovery archive within the `backup/` folder (`[TIMESTAMP]_src.zip`).
*   **Asset Ingestion**: Downloads the staging/production flat file namespace from the remote Google Apps Script repository directly into a temporary `tmp_clasp/` folder.
*   **Code Restructuring**: Restructures the flat file collection into modular project folders. This converts `.js` scripts back into local `.gs` modules, drops HTML files cleanly into `src/html/`, and runs empty folder checks before deletes the temporary staging workspace after successful reconstruction into `src/`.

### 🔨 The Test Compilation Bridge (Source $\rightarrow$ Build Cache)
*   **Trigger**: Executed locally via `npm run build` (currently executed as part of `test` script task).
*   **Compilation Bridge (`scripts/build.js`)**: Prepares the `build/` folder content into testable scripts.
    1. Translates cloud `.gs` backend files into standard Node-compatible JS modules. Converts `.gs` → `.js`
    2. Extracts encapsulated browser script blocks (`*[Helpers|Render].html`) out of specialized template views in `src/html/`. Converts `.html` → `html.js`
    3. Appends explicit modular common JS exports via dynamic `@export` code flags.
    4. Preserves source traceability via `SOURCE` header of the files in `build/` folder. 
*   **Staging Output (`build/`)**: Caches the transformed scripts (e.g., `build/*.gs`, `build/*[Helpers|Render].html`) as ready test elements. It is an optimized practice to execute this compilation step *only* when the underlying `src/` sources change.

### 🧪 The Isolated Unit Testing Suite (Build Cache $\rightarrow$ Test Execution)
*   **Trigger**: Executed locally via `npm run test`.
*   **Isolated Kernel Evaluation**: Jest processes your test suites (`test/*.unit.test.js`) against the pre-compiled staging assets inside `build/`. It uses an environment simulator (`test/utils/testKernel.js`) that completely stubs global cloud targets (`SpreadsheetApp`, `HtmlService`, `Logger`) and initializes your `global.state = {}` array data.

>To ensure the tests always execute against the latest version of the `src/` folder, the `test` script first runs the `build` script. It is defined as `"test": "npm run build && jest"` in `package.json`.

### 📤 The Push Deployment Pipeline (Local Repository $\rightarrow$ Remote Cloud)
*   **Trigger**: Executed locally via `npm run clasp:push`.
*   **Pre-Push Remote Snapshot**: Runs an isolated remote fetch into a temporary `gas_download/` path and creates a rollback ZIP (`[TIMESTAMP]_gas.zip` in `backup` folder) to protect live code.
*   **Flattening Compilation (`scripts/clasp.zsh`)**: Drops code files from `src/` root and flattens templates out of `src/html/` directly into a temporary flat staging directory (`tmp_clasp/`).
*   **Token Optimization**: Rewrites `.clasp.json` to point to the staging build folder, injects target script credentials if an optional argument is present, uploads the flat assets cleanly to the cloud via `clasp push`, and triggers a native terminal trap to safely restore original tracking records.

### 📲 Web app Deployment (Remote Cloud → Web app Deployment)

The Web app deployment process publishes a new version of an existing Google Apps Script Web app while preserving the current deployment. It assumes that the latest source code has already been uploaded to the remote Apps Script project using `clasp push`.

- **Trigger:** Executed locally using `npm run clasp:deploy`.
- **Pre-deployment:** Prepares the workspace by generating a temporary `.clasp.json` configuration file from the project template.
- **Deployment:** Creates a new version of an existing Web app deployment, preserving the deployment description and using the source code currently stored in the remote Google Apps Script project.
- **Post-deployment:** Cleans up the temporary workspace by removing the generated configuration file.

### `clasp.zsh` script

The `clasp.zsh` script automates the synchronization and deployment workflow. It accepts the following arguments:

1. **Action** (`pull`, `push`, or `deploy`) *(required, positional)*.
2. **`--env PREFIX`** *(required, unless `--file` is given)*. Loads `scripts/PREFIX_clasp.cfg.zsh` - see
   **Local Clasp Configuration** below for the file format.
3. **`--file PATH`** *(required, unless `--env` is given)*. Loads a config file directly. A bare filename (no
   `/`) is resolved under `scripts/`; anything containing `/` is used as given (relative to the current
   directory, or absolute).
4. It accepts also as input argument `-h|--help|-help|help` to print out in the terminal the script usage. In such case no other action is carried except to print the help of the script.

Exactly one of `--env`/`--file` is required on every invocation - there is no bare/default invocation, and
giving both is an error. A config file (rather than inline `scriptId`/`deploymentId` values on the command
line) is deliberate: both values are long, opaque strings (Apps Script project/deployment IDs), easily swapped
by mistake if their meaning depended only on argument order or position. Naming them inside a file makes each
one self-labeling, and keeps both values out of shell history and process listings entirely.

#### Dry-run Mode

The script supports a dry-run mode that simulates the entire workflow without executing any `clasp pull`, `clasp push`, or `clasp deploy` commands and without modifying local or remote files.

```bash
DRY_RUN=true npm run clasp:push
```

`true`/`1`/`yes`/`on` (case-insensitive) all enable dry-run; `false`/`0`/`no`/`off`/unset all mean a real run. Any other value is a hard error rather than silently defaulting to a real, network-touching run - `DRY_RUN` is safety-critical, so an unrecognized value (e.g. a typo) must never be misread as "not dry run."

#### Verbose Logging

At the default `LOG_LEVEL=0`, the script prints exactly one terse line per completed pipeline step (e.g. `[BACKUP] SUCCESS. Created: ...`, `[CLASP] Push process completed successfully.`) - step-starting narration and intermediate detail (raw `clasp` output, per-file simulated moves, `.clasp.json` state dumps, etc.) are suppressed. To enable verbose logging and see that detail during execution:

```bash
LOG_LEVEL=1 npm run clasp:push
```

Dry-run mode and verbose logging can be combined:

```bash
LOG_LEVEL=1 DRY_RUN=true npm run clasp:push
```

#### Default Configuration

If no environment variables are specified, the script uses the following defaults:

- `LOG_LEVEL=0`
- `DRY_RUN=false`

At startup, the script prints the active configuration, for example for `deploy` command:

```bash
[CONFIG] LOG_LEVEL='0', DRY_RUN='0', CMD='deploy', OPTION='--env TEST'
[CONFIG] scriptId       = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
[CONFIG] deploymentId   = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
[CONFIG] deploymentName = 'TEST template panini_FWC 2026'
```
>[!NOTE]
> `scriptId` value is 57 characters long, `deploymentId` is longer, but it doesn't have fix length. Use as deployment name the name used for Apps Script project.

#### Local Clasp Configuration

`scripts/.clasp.json.template` contains only placeholder tokens (`__SCRIPT_ID__`, `__ROOT_DIR__`) - it never
carries a real value, and is safe to commit. Everything else `clasp.zsh` needs (`scriptId`, `deploymentId`,
`deploymentName`) comes from a config file, selected via `--env PREFIX` (loads
`scripts/PREFIX_clasp.cfg.zsh`) or `--file PATH` (loads `PATH` directly). One of these two flags is required
on every invocation - `clasp.zsh` never falls back to a default silently.

`scripts/ENV_clasp.cfg.zsh` is the tracked template (placeholder values only, safe to commit). Every real
config file matches `scripts/*_clasp.cfg.zsh` and is gitignored - create one by copying the template:

```bash
cp scripts/ENV_clasp.cfg.zsh scripts/TEST_clasp.cfg.zsh
```

and filling in real values, in this exact shape:

```zsh
SCRIPT_ID="<Apps Script project's scriptId>"
DEPLOYMENT_ID="<Web app's deploymentId>"
DEPLOYMENT_NAME="<deployment description>"
```

All three fields are required regardless of command - `clasp.zsh` validates the whole file up front, even
though `pull`/`push` only use `SCRIPT_ID`. There's no per-command partial validation; one config file fully
describes one environment/profile.

CI never uses `--env` (which would require a tracked file - impossible, since `PRODUCTION_SCRIPT_ID`/
`PRODUCTION_DEPLOYMENT_ID` are GitHub Actions secrets, not something safe to commit under any name). Instead,
`.github/workflows/deploy.yml` writes a temporary config file from those secrets to `$RUNNER_TEMP` at runtime
and passes it via `--file` - the same "write a secret to a file just before use" pattern the workflow already
uses for `~/.clasprc.json` (see **Continuous Integration (CI) Deployment Blueprint** below).

#### Transactional Configuration Swaps & Safety Cleanups
Because Google's `clasp` utility does not accept directory path parameters via command-line arguments, the script uses the localized configuration file (`.clasp.json.template`) dynamically at runtime. 

To safeguard the repository tracking environment from structural configuration corruption if a network error occurs or a process is aborted (`Ctrl+C`), the synchronization script implements localized `trap` handlers inside its operational execution blocks. 

Whenever an active operation enters a task—such as modifying `rootDir` to a transient build directory or swapping out the active `scriptId` credential token—the system registers an emergency cleanup function. If the deployment succeeds cleanly or encounters a sudden crash, the system fires these safety hooks to automatically restore clasp configurations back to their safe, initial states:
*   `"rootDir"` is reset to its default token placeholder (`"__ROOT_DIR__"`).
*   `"scriptId"` is reset to its default token placeholder (`"__SCRIPT_ID__"`) - the template never carries a
    real value, so there's nothing else to restore it to.

#### Multi-Platform Cross-Run Environment Policy
This synchronization tool framework (`scripts/clasp.zsh`) is written in `zsh` and relies on the native standard `find` command. It executes natively out-of-the-box on macOS and Linux computers. For engineers collaborating on **Windows workstations**, development environments must be configured to run the script inside **Git Bash** or **WSL (Windows Subsystem for Linux)**. Running this script natively inside default Windows Command Prompt (`cmd.exe`) or PowerShell instances will fail.

The script defines `sed_safe` function to ensure `sed` command works for both macOS and Linux platform.


## 3. Directory Layout Specification

```text
panini-wc-2026-gsheet-tracker/
|── .claspignore                  # Indicates folders/files to ignore by clasp.
|── .cspell.json                  # Code Spell Checker extension configuration file (folder/files to exclude).
|── .eslintignore                 # Indicates folders/files to ignore by ESLint (code analysis).
|── .eslintrc.js                  # ESLint configuration file with customized rules.
|── .gitignore                    # Folders/files to ignore by git (repository).
├── package.json                  # Node project descriptors, dependencies, and pipeline bindings.
├── package-lock.json             # Generated, lock to exact version. Required for CI.
├── jsconfig.json                 # VS Code config file to specify JavaScript project's configuration. 
├── .vscode/                      # VS Code project settings.
│    ├── settings.json            # VS Code project file configuration.
├── .github/                      # GitHub-specific configurations, automation workflows, CI project setup.
│    ├── actions/                 # Standard folder for CI project setup.
│    │   └── setup-project/       # Standard folder for CI actions.
│    │       └── action.yml       # CI project common setup to both workflows.
│    └── workflows/               # Dedicated directory used exclusively to store GitHub Actions workflow files
│        ├── deploy.yml           # CI deploy of the project to GAS
│        └── validate.yml         # CI validation, i.e. ESLint and test
├── data/                         # Static datasets associated to the project.
│   └── panini_fwc2026_roster.csv # Panini sticker cards roster.
├── scripts/                      # Folder for utility scripts.
│   ├── build.js                  # JavaScript bridge extracting HTML blocks for local unit tests.
│   ├── clasp.zsh                 # Unified, transactional shell sync-and-backup engine (local GAS ↔ repository).
│   ├── .clasp.json.template      # Placeholder-only clasp config template, used by clasp.zsh.
│   ├── ENV_clasp.cfg.zsh         # Tracked template for clasp.zsh --env/--file config files (placeholders only).
│   ├── *_clasp.cfg.zsh           # GITIGNORED - not present by default; create manually, see §2 "Local Clasp Configuration".
|   ├── fix-jsdoc.js              # Fit short JSDOC comments into a single line.
├── src/                          # MUTABLE LOCAL SOURCE OF TRUTH.
│   ├── appscript.json            # Project manifest. Central configuration file for a Google Apps Script project.
│   ├── Code.gs                   # Structural GAS cloud UI generation menu bindings.
│   ├── Commons.gs                # General runtime utilities and global system declarations.
│   ├── *Service.gs               # Modular system business data service providers.
│   └── html/                     # User Interface markup layouts and layer scripts.
│       ├── *Dialog.html          # Desktop dialog containers handling events and cloud calls.
|       |── *View.html            # View services used by *Dialog.html and Mobile*.html services.
│       ├── *Helpers.html         # Extracted browser-independent pure processing logic.
│       └── *Render.html          # Dedicated UI factory components building visual DOM structures.
│       └── MobileHome.html       # Mobile entry point (navigation drawer, view switching, injected view via include).
│       └── Mobile*View.html      # Wrapper views for mobile services or simplified implementation of the service.
│       └── *Styles.html          # Styles files, i.e. CSS configuration.
├── build/                        # AUTOMATED TARGET CACHE (BLOCK MANUAL MUTATIONS).
│   ├── *.js                      # Code blocks compiled into common JS specifications.
│   └── *.html.js                 # Extracted helpers and render algorithms wrapped for mock evaluation.
├── test/                         # ISOLATED JEST UNIT TESTING GRID.
│   ├── *.unit.test.js            # Target test cases checking functional service compliance.
│   ├── jest.config.js            # Jest configuration file.
│   ├── utils/                    # Folder with test utility files for testing.
│       └── testKernel.js         # Main environment emulation stubbing global Google objects.
└── backup/                       # LOCAL ZIP HISTORY STORAGE (AUTO-GENERATED).
    ├── [TIMESTAMP]_src.zip       # Rollback snapshots of local 'src' right before a pull merge.
    └── [TIMESTAMP]_gas.zip       # Rollback snapshots of cloud remote code right before a push deploy.
```

---

## 4. Data Model: Sticker & Country Representation

Every backend service that reads, writes, or transports per-country sticker data follows the same representation rules, split into two layers: an internal canonical shape used inside the GAS runtime, and a wire-safe shape used whenever data crosses the `google.script.run` boundary to or from the browser. This section defines both layers, the field naming convention that goes with them, and the one deliberate exception (`TradeService.gs`).

### Canonical In-Memory Shape

- `Map<number, number>` — sticker number → count, built and read in encounter order. Example: `Map { 1 => 2, 5 => 0, 18 => 1 }` (sticker 1 has 2 copies, sticker 5 is missing, sticker 18 has 1 copy).
- Used internally in `Commons.gs` (`StickerSheetRepository.getCountries()`, `getCountryCounts()`, `updateStickerCounts()`), `ImportService.gs` (`ImportStickers.parse()`), and `QuickEntryService.gs`.
- Chosen specifically to avoid JavaScript's automatic reordering of integer-like object keys — a plain object such as `{"5":1,"1":3}` silently becomes `{"1":3,"5":1}` on essentially any object construction, including a fresh `JSON.parse()`. A `Map` is the only in-memory container that reliably preserves the order the data was built in.
- Density depends on what the `Map` represents, not a single fixed rule:
  - Rows read directly from the sheet (`getCountries()`, `getCountryCounts()`) are **dense**: one entry per sticker slot (0-20), including zero counts, because every slot has a real, known cell value. Example: `Map { 0=>0, 1=>1, 2=>0, ..., 18=>2, 20=>0 }` — every slot from 0 to 20 is present.
  - Rows built from partial user input (`ImportStickers.parse()`) are **sparse**: only the stickers the user actually typed. Example: input `"MEX,4(2),5"` produces `Map { 4=>2, 5=>1 }` — no entries for any other sticker number.

### Wire-Safe Shape (crossing `google.script.run`)

- A `Map` cannot cross `google.script.run` at all — it serializes to `{}` and the data is silently lost. Every method that sends or receives sticker data converts at the boundary.
- The wire shape is an array of `{number, count}` objects: `[{number:1,count:0}, {number:2,count:1}, ...]`.
  - Used by `ImportService.preview()`'s `stickers` field and `QuickEntryService`'s `stickers` field (in `getInitialData()`/`applyPendingUpdates()`).
  - A raw pairs array (`[[1,0],[2,1]]`) would be equally order-safe, but `{number,count}` objects were chosen for self-documenting call sites (`sticker.number` vs. `sticker[0]`).
- **Never** a plain object keyed by sticker number, e.g. `{"1":0,"2":1}`. This is the one shape that is *not* safe on this boundary: JavaScript enumerates integer-like object keys in ascending numeric order regardless of insertion order, and the reordering happens again on every `JSON.parse()`/object construction — wrapping it in `JSON.stringify()` does not fix this, since the unsafety is a JavaScript object-property-ordering rule, not a transport-layer quirk. Arrays are the only container immune to it, because JSON always preserves array element order.
- Pending-update payloads (received by the backend, not just sent) follow the same per-country grouping as everything else — e.g. `applyPendingUpdates([{code:'MEX', stickers:[{number:4,count:2}]}])` — never a flat list of per-sticker triples.

### Field Naming

A record's own context is never repeated in its field names:

| Concept | Field name | Not |
|---|---|---|
| Country identifier | `code` | `countryCode` |
| Country display name | `name` | `countryName` |
| Sticker identifier | `number` | `sticker`, `stickerNumber` |

This applies to record fields returned or consumed as data. It does not extend to function/method parameter names, which may still use a fully-qualified name for local clarity (e.g. `_buildStickerViews(countryCode, counts)`).

### The Trade Exception

- `TradeService.gs` deliberately does not use the `{number,count}` wire shape, because trading discards counts by design — `2(3)` and `2` both just mean "sticker 2 is present"; a collector either has a sticker to offer or doesn't.
- Trade's wire shape is `Object<countryCode, number[]>` — a country-code-keyed object of plain sticker-number arrays — used throughout parsing, QR bit-mask encoding, matching, and rendering.
- This is safe without any special handling: the outer keys are country codes, which are never numeric-like, so they are never subject to the integer-key reordering problem described above; sticker order is carried entirely by the array.
- The canonical `Map<number,number>` reappears exactly once in the whole Trade flow — `TradeService.executeTrade()` → `_buildTradeUpdates()` — immediately before the final `updateStickerCounts()` write.
- `TradeService.gs` also wraps several of its return fields in `JSON.stringify()` before sending them (`tradeInfo`, `receive`, `send`, `doneMap`, `tradePreferences`), even though none of the shapes involved are actually at risk by the rule above. This is a documented defensive safeguard against undocumented `google.script.run` marshalling behavior across execution contexts (dialog vs. mobile web app), not an order-preservation mechanism — see `NOTE 2` at the top of `TradeService.gs`.

### Rule for New Methods

Any new backend method that sends or receives per-country sticker data must:

1. Use `Map<number,number>` internally.
2. Convert to `[{number,count}, ...]` at the actual `google.script.run` boundary — never a plain object keyed by sticker number.
3. Use `code`/`name`/`number`/`count` as record field names, consistent with the rest of the codebase.
4. Document the payload with a concrete `@param`/`@returns` example in JSDoc, showing the exact wire shape — not just its type.

---

## 5. UI Layer Engineering Rules

To ensure local testability while maintaining cross-platform consistency and synchronization safety, the user interface is organized into three distinct layers:

### Layer 1: Dialog Orchestration Framework (`*Dialog.html`)
* **Responsibility**: Defines the desktop dialog structure and lifecycle entry point. It initializes desktop-specific configuration, provides the dialog shell when required, and loads the corresponding view. When the UI is shared with the mobile application, this file becomes a thin desktop wrapper around the shared `*View.html`, retaining only desktop-specific initialization and configuration. It may provide the outer container when the desktop dialog requires one, but it should not contain feature-specific UI logic.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

#### Layer 1.1: Shared View (`*View.html`)
* **Responsibility**: Contains the shared feature implementation when the same UI is used by desktop and mobile applications. Common markup and controller logic are moved from `*Dialog.html` into this layer. The View owns the feature lifecycle, user interactions, UI state coordination, and asynchronous backend calls through `google.script.run`.  
  A View must not assume that its host provides a layout container. If the host already provides the required container, the View reuses it. Otherwise, the View is responsible for providing its own container.
* **Implementation Rules**:
    * ✔ View controllers must be encapsulated to avoid leaking internal variables and functions into the global browser scope.
    * ✔ View-specific DOM references should remain local to the view controller.
    * ✔ Shared view functions exposed globally should only be those required by the host container or HTML event handlers.
    * ❌ A View should not contain duplicated platform-specific implementations when the behavior can be controlled through configuration or wrapper initialization.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

>[!IMPORTANT]
> The Import service is the only exception. `ImportView.html` is not shared with the mobile application because the mobile import workflow is intentionally simplified and optimized for smaller screens.

#### Layer 1.2: Mobile Home (`MobileHome.html`)
* **Responsibility**: Entry point for the mobile web application. It provides the application shell, navigation drawer, manages view switching, and loads feature views using HTML includes.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

#### Layer 1.3: Mobile-Specific View (`Mobile*View.html`)
* **Responsibility**: Provides the mobile wrapper around shared `*View.html` files, adding mobile-specific initialization, configuration, or layout adjustments when required. If a mobile feature requires a different interface from the desktop version, this layer contains the dedicated mobile implementation. This is the case for `MobileImportView.html`, which provides a simplified import interface optimized for mobile devices.
* **Implementation Rules**:
    * ✔ Owns mobile navigation sections, visibility management, and feature initialization when required.
    * ✔ May configure shared views through parameters or exposed initialization functions.
    * ❌ Must not duplicate shared feature logic unnecessarily.
    * ❌ Must not create additional page containers when the host already provides the required container.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

### Layer 2: Functional Logic Helpers (`*Helpers.html`)
* **Responsibility**: Contains reusable functional logic consumed by the view layer, including state calculations, data transformation, filtering, pending update calculations, and summary calculations.
* **Constraints**:
    * ✔ Must remain pure and deterministic; should not depend on DOM APIs or browser runtime state.
    * ❌ Must not reference browser objects such as `document`, `window`, or UI elements.
    * ❌ Must not execute `google.script.run` calls.
    * ❌ Must not directly update the user interface.
* **Test Status**: Extensively tested locally with Jest using extracted artifacts from the `build/` directory for functions marked with the `@export` tag.

### Layer 3: Visual Render Factories (`*Render.html`)
* **Responsibility**: Handles DOM construction, visual component creation, and layout assembly (e.g., `buildCountrySection`, `buildStickerCard`). Render files are consumed by the view layer.
* **Constraints**:
    * ✔ Responsible for generating UI components and performing DOM updates.
    * ❌ Must not contain business logic, calculations, state management, or backend service definitions.
    * ❌ Must not depend on feature lifecycle orchestration.
* **Test Status**: Partially tested locally using mocked DOM environments for functions marked with the `@export` tag.

>[!IMPORTANT]
> Functions defined in `*Helpers.html` and `*Render.html` files are encapsulated in namespaces to avoid polluting the browser's global scope. View controllers use local closures (IIFE pattern) to keep DOM references, state, and internal functions isolated while exposing only the required public interface.

---

## 6. System Architecture

### Overview

The Google Apps Script spreadsheet application provides two user interfaces:
- Desktop UI through Google Sheets dialogs.
- Mobile UI through a Web app (`doGet()`).

The mobile implementation is built on top of the same backend services used by the desktop application. Both platforms share the same business logic and repository layer while providing platform-specific views and styling where necessary.

### Backend
- `Code.gs`
- `Commons.gs`
- `ImportService.gs`
- `ExportService.gs`
- `QuickEntryService.gs`
- `TradeService.gs`

Responsibilities:
- Read and update spreadsheet data.
- Generate import and export payloads.
- Process sticker count updates.
- Enabling trading process between collectors.
- Expose desktop dialog and mobile Web app entry points.
- Serve shared HTML templates.
- Provide a common backend for both desktop and mobile UIs.

#### Shared repository layer

`Commons.gs` contains the shared spreadsheet repository layer (reading and writing from/to Google Spreadsheet). The `StickerSheetRepository` constructor accepts an optional spreadsheet instance. Desktop services use the active spreadsheet by default, while mobile services explicitly pass the target spreadsheet.

This constructor parameter is a key part of the mobile architecture because:
- Desktop dialogs continue using `SpreadsheetApp.getActiveSpreadsheet()`.
- The mobile Web app cannot rely on `getActiveSpreadsheet()`.
- Mobile wrapper functions in `Code.gs` resolve the spreadsheet from the request and pass it to the constructors of `ImportService`, `ExportService`, and `QuickEntryService`.

This design allows the same repository implementation to operate correctly in both execution environments without duplicating business logic.

##### `StickerSheetRepository` responsibilities
- Locate named ranges.
- Validate the spreadsheet structure.
- Read country and sticker data.
- Update sticker counts in batches considering different modes.
- Provide reusable lookup helpers for the Import, Export, and Quick Entry services.
- Lazily initialize internal attributes through getters to reduce execution time.

### UI

The application provides two user interfaces:
- Desktop UI
- Mobile UI

### Desktop UI

- `ImportDialog.html`: Desktop host page for the Import service.
  - Loads `CommonStyles.html` and `ImportExportStyles.html`.
  - Injects desktop configuration values (`defaultMode`).
  - Loads `ImportView.html`.

- `ImportView.html`: Owns the complete desktop user interface for the Import service.
  - File upload.
  - Manual text input.
  - Import mode selection.
  - Validation and preview.
  - Warning rendering.
  - Import actions.
  - Format guide.
  - Help dialog (`ImportHelp.html`).
  - Loads `ImportHelpers.html`.

- `ExportDialog.html`: Desktop dialog used by both export services.
  - Loads `CommonStyles.html` and `ImportExportStyles.html`.
  - Provides the desktop dialog shell.
  - Injects `dialogMode`.
  - Loads `ExportView.html` (which loads `ExportHelpers.html`).
  - Initializes the shared view.
  - Supports both `export_all` and `export_shared` modes.

- `QuickEntryDialog.html`: Desktop dialog for Quick Entry.
  - Loads `CommonStyles.html` and `QuickEntryStyles.html`.
  - Provides the desktop dialog shell.
  - Loads `QuickEntryView.html` (which loads `QuickEntryHelpers.html` and `QuickEntryRender.html`).
  - Initializes the shared Quick Entry view.

- `TradeDialog.html`: Desktop dialog for Trade service.
  - Loading shared styles: `CommonStyles.html`, `ImportExportStyles.html`.
  - Loading Trade-specific style: `TradeStyles.html`.
  - Providing desktop configuration `platform`.
  - Initializing the shared Trade view.

Whenever the desktop and mobile implementations share the same UI, the common markup and controller logic are extracted into a `*View.html` file. The desktop dialog and the mobile wrapper become thin containers responsible only for platform-specific initialization.

Shared view controllers use an IIFE-based structure to isolate internal state, DOM references, and implementation details. Only functions required by the host container or HTML event bindings are exposed through the global scope.

Examples:

- `ExportView.html`: Shared export implementation used by `ExportDialog.html` and `MobileExportView.html`.
  - Owns:
    - Export toolbar.
    - Export text area.
    - Refresh, copy, and download actions.
    - Export hints and warnings.
    - Mode-driven export routing.
  - The active export mode is supplied by the parent wrapper instead of relying on duplicated global state.
  - Loads `ExportHelpers.html`.

- `QuickEntryView.html`: Shared Quick Entry implementation used by `QuickEntryDialog.html` and `MobileQuickEntryView.html`.
  - Owns:
    - The toolbar, filters, legend, message area, and country list.
    - Shared helpers and rendering modules.
    - View state and user interactions.
    - Calls to the appropriate backend methods depending on whether it is running inside the desktop dialog or the mobile Web app.
    - Loads `QuickEntryHelpers.html` and `QuickEntryRender.html`.

>[!IMPORTANT]
> `ImportDialog.html` is the only desktop dialog that does not share its view with the mobile application. The mobile import workflow is intentionally simplified to better fit smaller screens.

### Mobile UI

- `MobileHome.html`: Mobile application shell.
  - Provides the application header.
  - Implements the navigation drawer.
  - Handles view switching.
  - Clears messages when navigating between services.
  - Loads `MobileStyles.html`, `MobileImportStyles.html`, `MobileExportStyles.html`, `MobileQuickEntryStyles.html`, and `MobileTradeStyles.html`.
  - Loads `MobileImportView.html`, `MobileExportView.html`, and `MobileQuickEntryView.html`.

- Mobile views:
  - `MobileImportView.html`:
    - Simplified mobile implementation of the Import service.
    - Loads `ImportHelpers.html` and reuses selected utility functions.
    - Does not use `ImportView.html`.
  - `MobileExportView.html`: Mobile wrapper around `ExportView.html`.
    - Provides the mobile layout.
    - Sets the page title and export hint.
    - Loads the shared export view.
    - Initializes the selected export mode.
  - `MobileQuickEntryView.html`: Mobile wrapper around `QuickEntryView.html`.
    - Configures the mobile layout.
    - Sets the number of stickers displayed per row.
    - Reuses the shared Quick Entry implementation.
  - `MobileTradeView.html`: Mobile wrapper around `TradeView.html`.
    - Render the mobile trade container.
    - Initialize the shared Trade view.
    - Own any mobile-specific Trade behavior.

### Mobile import flow

1. The user opens the navigation drawer.
2. Selects **Import**.
3. `MobileHome.html` switches to the import view.
4. `MobileImportView.html` collects the import payload.
5. Wrapper functions in `Code.gs` invoke `ImportService.gs`.
6. Results are rendered in the mobile view.

### Mobile export flow

1. The user opens the navigation drawer.
2. Selects **Export All** or **Export Shared**.
3. `MobileHome.html` calls `showExportView(mode)`.
4. `MobileExportView.html` configures the page title and export hint.
5. `ExportView.html` initializes the shared export interface.
6. Export data is generated using the selected mode.

### Mobile Quick Entry flow

1. The user opens the navigation drawer.
2. Selects **Quick Entry**.
3. `MobileHome.html` calls `showQuickEntryView()`.
4. `MobileQuickEntryView.html` configures the mobile layout (five stickers per row).
5. `QuickEntryView.html` loads the shared interface and initializes the data.
6. Backend wrapper functions invoke the mobile Quick Entry service to retrieve and update sticker data.

### Mobile Trade stickers flow

1. The user opens the navigation drawer.
2. Selects **Trade**.
3. `MobileHome.html` calls `showTradeView()` which sets `platform` to `mobile`.
4. `MobileTradeView.html`: renders mobile trade container and load and initialize Trade view.
5. Wrapper functions in `Code.gs` invoke `TradeService.gs`
6. Results are rendered in the mobile view.

### Styles

- `CommonStyles.html`: Common styles shared by all desktop dialogs.
  - Theme variables.
  - Typography.
  - Layout primitives.
  - Buttons.
  - Status messages.
  - Form controls.
  - Utility classes.

- `ImportExportStyles.html`: Desktop styles shared by the Import and Export dialogs.
  - Theme variables
  - Typography
  - Layout primitives
  - Forms control
  - Buttons
  - Messages

- `QuickEntryStyles.html`: Desktop-specific styles for the Quick Entry dialog.
  - Theme colors
  - Typography
  - Layouts
  - Filters
  - Buttons
  - Messages
  - Form controls
  - Sections and containers
  - Sticker grid and cards

- `MobileStyles.html`: Common styles shared by all mobile services.
  - Theme variables.
  - Typography.
  - Layout primitives.
  - Buttons.
  - Messages.
  - Form controls.

- `MobileImportStyles.html`: Mobile-specific styles for the Import service.
  - Import view container adjustments
  - Import-specific fields
  - Import format hint
  - Import action button layout
  - Import preview/warnings customization

- `MobileExportStyles.html`: Mobile-specific styles for the Export service.
  - Export section format.
  - Toolbar alignment.
  - hint customization

- `MobileQuickEntryStyles.html`: Mobile-specific styles for the Quick Entry service.
  - Responsive five-column sticker grid.
  - Mobile-optimized sticker cards.
  - Country summary layout.
  - Mobile typography.
  - Larger touch targets.
  - Responsive handling of incomplete sticker rows.
  - Pending-change indicators.

- `MobileTradeStyles.html`: Mobile-specific styles for the Trade service.
   - Trade toolbar and import hint
   - Trade text areas
   - Trade QR display
   - Trade proposal layout and controls

---

## 7. Automated Lifecycles & Developer Workflow Pipeline

The shell script located at `scripts/clasp.zsh` controls all remote synchronizations. It handles configuration states transactionally to protect workspaces from configuration drift.

### Local Quality-Gate Verification Suite
Before promoting code changes to GitHub or the Google Apps Script staging/production instance, developers should execute the unified local validation script pipeline:
```bash
npm run deploy:test
```

This single gatekeeper script sequentially commands the local workspace to:
1. Run ESLint structural syntax checks (`npm run lint`). In case of errors you can run `npm run lint:fix` to fix minor errors.
2. Recompile testing artifacts (`build/`) and verify feature compliance across all test suites via Jest (`npm run test`).
3. Execute `clasp.zsh push --env TEST` to deploy code to your configured sandbox environment if all checks pass. `--env TEST` is the default when no extra args are given - it requires the local config file `scripts/TEST_clasp.cfg.zsh` defined with appropriate content, see section above: **Local Clasp Configuration**.

If you want to provide a different config profile, pass your own `--env`/`--file` after `--` (this overrides the `--env TEST` default entirely, rather than adding to it):
```bash
npm run deploy:test -- --env OTHER
npm run deploy:test -- --file /path/to/your_clasp.cfg.zsh
```

If you want also to deploy the Web app for testing mobile services, you can use instead:

```bash
npm run deploy:all
```
It runs the same steps as in `deploy:test` plus Web app deploy (`clasp.zsh deploy`) to generate a new deployment version, keeping the same description. Also defaults to `--env TEST`, and accepts the same `--env`/`--file` override:
```bash
npm run deploy:all -- --env OTHER
```

>[!IMPORTANT]
> Keep in mind that Google Apps Script has a limit of 200 versions and in some Apps Script versions it doesn't offer a bulk process to delete old versions. That is why we have this separated script task, so the user just deploy the Web app when it is really needed.


---

## 8. Continuous Integration (CI) Deployment Blueprint

The Continuous Integration (CI) architecture leverages GitHub Actions to enforce automated quality gates before publishing validated artifacts to the production Google Apps Script environment.

### Secure Credentials Management

Production credentials are securely decoupled from the Git history by using repository-level **GitHub Actions Secrets**. The following secrets must be configured under **Settings → Secrets and variables → Actions** in your GitHub repository:

1. `CLASPRC_JSON_SECRET`: The complete contents of your local Google Apps Script authentication file (`~/.clasprc.json`).
2. `PRODUCTION_SCRIPT_ID`: The Script ID of the production Google Apps Script project.
3. `PRODUCTION_DEPLOYMENT_ID`: The Deployment ID of the production Web App. This deployment corresponds to the URL used by end users to access the services exposed through the **Manage Panini** custom menu from a mobile device.

### 🔁 Standard Production Deployment Workflow (GitHub CI via `main` Branch)

This is the **required** workflow for every production change.

#### 1. Start from the latest `main`

```bash
git checkout main       # Switches your working directory to the "main" branch
git pull origin main    # Downloads and merges the latest changes from the remote "main" branch
```

#### 2. Create a feature branch

```bash
git checkout -b <branchName>
```
>[!TIP]
> A common practice is to use a structured naming convention such as `feature/<branchName>`, although this is not enforced by the CI pipeline.

Example:

```bash
git checkout -b feature/add-country-filter      # or
git checkout -b add-country-filter              # short branch name
```

#### 3. Make changes locally

Implement the required changes in the project. 

> Do frequent commits to remote repository to the new created branch, to backup the current changes.

#### 4. Run local validation

```bash
npm run deploy:test
```

This command performs the following actions:

- Runs ESLint.
- Executes the test suite.
- Pushes the project to the staging Google Apps Script project (`clasp:push`).

If you also want to deploy the staging Web App, run instead:

```bash
npm run deploy:all
```

#### 5. Commit the changes

```bash
git add .                                        # Stage all modified, added, and deleted files
git commit -m "<summary of changes>"             # Commit the staged changes
```

#### 6. Push the feature branch

```bash
git push origin <branchName>                     # Push the local branch to GitHub
```

#### 7. Create a Pull Request

From the GitHub web interface:

- Open the repository.
- Click **Compare & pull request**.
- Set:
  - **Base branch:** `main`
  - **Compare branch:** `<branchName>`

#### 8. Wait for the GitHub Actions workflow

Once the Pull Request is created (or updated), GitHub Actions automatically executes the appropriate workflow.

Two independent workflows are defined:

##### Validation Workflow

###### Workflow file

```text
.github/workflows/validate.yml
```

This workflow is executed for:

- Every push to the `main` branch.
- Every Pull Request targeting the `main` branch.

Its purpose is to validate the project without performing any deployment.

The workflow performs the following actions:

1. Checkout the repository
2. Execute the shared setup action (`.github/actions/setup-project/action.yml`):
   - Setup the Node.js environment.
   - Install project dependencies (`npm ci`).
3. Setup python and Execute panini roster file validation
   ```bash
   python data/clean_roster.py
   ```
4. Run ESLint.
   ```bash
   npm run lint
   ```
5. Execute the test suite.
   ```bash
   npm test
   ```

##### Production Deployment Workflow

###### Workflow file

```text
.github/workflows/deploy.yml
```

This workflow is executed only after a push to the `main` branch **and** only when one or more of the following paths are modified:

- `src/**`
- `.github/workflows/deploy.yml`
- `.github/actions/setup-project/**`

The workflow performs the following actions:

1. Checkout the repository
2. Execute the shared setup action (`.github/actions/setup-project/action.yml`):
   - Setup the Node.js environment.
   - Install project dependencies (`npm ci`).
2. Install `zsh` (required to execute the `clasp.zsh` helper script).
3. Install the Google Apps Script CLI.

   ```bash
   npm install -g @google/clasp
   ```

4. Inject the Google Apps Script authentication credentials by creating the runtime file `~/.clasprc.json` from the `CLASPRC_JSON_SECRET` repository secret.
5. Write a temporary clasp config file to `$RUNNER_TEMP` from the `PRODUCTION_SCRIPT_ID`/`PRODUCTION_DEPLOYMENT_ID` secrets - `clasp.zsh` always requires `--env`/`--file`, and production credentials can never live in a tracked `scripts/*_clasp.cfg.zsh` file under any name, so this mirrors the `~/.clasprc.json` step above (write the secret to a file just before use).

   ```bash
   echo "SCRIPT_ID=\"$SCRIPT_ID\"" > "$RUNNER_TEMP/prod_clasp.cfg.zsh"
   echo "DEPLOYMENT_ID=\"$DEPLOYMENT_ID\"" >> "$RUNNER_TEMP/prod_clasp.cfg.zsh"
   echo 'DEPLOYMENT_NAME="template panini_FWC 2026"' >> "$RUNNER_TEMP/prod_clasp.cfg.zsh"
   ```

6. Push the project source to the production Google Apps Script project.

   ```bash
   zsh scripts/clasp.zsh push --file "$RUNNER_TEMP/prod_clasp.cfg.zsh"
   ```

7. Create a new version of the production Web App while preserving the existing deployment description.

   ```bash
   zsh scripts/clasp.zsh deploy --file "$RUNNER_TEMP/prod_clasp.cfg.zsh"
   ```

##### Shared Composite Action

Both workflows reuse a common Composite Action located at:

```text
.github/actions/setup-project/action.yml
```

This action centralizes the common CI setup steps:

1. Setup the `Node.js` environment.
2. Install project dependencies (`npm ci`).

Using a Composite Action eliminates duplicated workflow steps and ensures both workflows execute in a consistent environment.

#### 9. Merge the Pull Request

Once all required GitHub Actions checks complete successfully:

- Click **Merge pull request**.
- Confirm the merge into `main`.

The production deployment workflow will automatically execute after the merge if the merged changes satisfy its configured path filters.

#### 10. Synchronize the local repository

```bash
git checkout main
git pull origin main
```

#### 11. Delete the remote feature branch

The merged branch can be deleted from the GitHub web interface or from the command line:

```bash
git push origin --delete <branchName>
```

#### 12. Delete the local feature branch

```bash
git branch -d <branchName>
```

Multiple merged branches can be deleted simultaneously:

```bash
git branch -d <branchName1> <branchName2> <branchName3>
```

To list all branches that have already been merged into `main`:

```bash
git branch --merged main
```

These branches are candidates for deletion.

---

## FAQ

### I am getting the following error: `Invalid response body while trying to fetch https://oauth2.googleapis.com/token: Premature close` how to fix it?
If you try to run `npx clasp login`, any `clasp` command, or the script `clasp.zsh` and you get an error like this:

```text
Invalid response body while trying to fetch https://oauth2.googleapis.com/token: Premature close
```
It is usually related to:
- Node 20+ / 22+ TLS and networking behavior changes.
- instability in OAuth token exchange in clasp CLI (v3.x).
- environment differences between local shell and CI runtime.

The stable solution in this project is to use Node version 18 for local clasp authentication flows, while CI can safely run Node 22 for linting and tests.

To install node version 18 do the following:

```bash
nvm install 18.20.8
nvm use 18.20.8
node -v             # to verify
```
after installation `node -v` should show `18.20.8`. 

If another node version is currently active, then:

```bash
nvm use 18.20.8
node -v           # and verify, expected output: 18.20.8
```

If you don't have Node Version Manager (NVM) you can install it as follows for macOS/Linux install:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
then restart the terminal:
```bash
source ~/.zshrc   # if using zsh or adjust it to the shell of your preference
```
---
