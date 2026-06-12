# 📘 Technical Documentation: Panini WC 2026 GSheet Tracker

This document provides a comprehensive technical overview of the system architecture, file structures, development lifecycle pipelines, and core engineering design constraints governing the Panini WC 2026 GSheet Tracker project.

---

## 1. System Purpose & Scope

The application is built on a hybrid architecture combining a production **Google Apps Script (GAS) runtime** with a local **Node.js development and testing pipeline**. The system architecture achieves three core goals:
*   Allows application execution natively inside Google Sheets utilizing specialized GAS services.
*   Enables strict, isolated local unit testing using Jest via a deterministic, mocked GAS runtime kernel.
*   Maintains a clean separation between raw business data logic, user interface layouts, and the multi-stage deployment build steps.

---

## 2. System Architecture & Component Communication Flow

The application isolates execution states between the cloud-based Google Sheets environment, local source code editing layouts, and the automated local verification build caches.

### 📥 Data Sync Pipeline Architecture

```text
 Google Sheets (GAS Cloud Runtime)
   │
   ├── [ npm run clasp:pull ] ──> 1. Downloads flat assets into 'tmp/tmp_clasp'
   │                              2. Reorganizes flat code into 'src/' folder structure
   │                              3. Converts file extensions (.js -> .gs)
   │                              4. Creates timestamped in backup archive 'backup/YYYYMMDDhhmmss_src.zip'
   |                              5. Move downloaded and transformed files from `tmp/tmp_clasp` into `src/`
   │                              5. Deletes 'tmp_clasp' folder when empty
   ▼
 src/ (MUTABLE LOCAL SOURCE OF TRUTH)
   ├── *.gs (Code.gs, Commons.gs, Service scripts)
   └── html/ (*Dialog.html, *Helpers.html, *Render.html)
   │
   ├── [ npm run build ] ───> Triggers 'node scripts/build.js' bridge:
   │                          - Translates '.gs' files to Jest-safe JS
   │                          - Extracts script tags out of HTML layouts
   │                          - Appends 'module.exports' via @export tags
   ▼
 build/ (AUTO-GENERATED TESTING WORKSPACE — DO NOT EDIT MANUALLY)
   ├── Code.js, Commons.js, ImportExportService.gs, ImportExportDialogHelpers.html.js
   |── QuickEntryService.js, QuickEntryDialogHelpers.html.js, QuickEntryDialogRender.js
   │
   ├── [ npm run test ] ───> Triggers 'jest' runner engine:
   │                         - Loads 'test/utils/testKernel.js' mocks
   │                         - Evaluates target test suites (*.unit.test.js)
   │                         - Note: Preventively test task previously executed build.
   ▼
 Isolated Test Environment Compliance Checks
   │
   ├── [ npm run clasp:push ] ──> 1. Fetches current server code to 'gas_download'
   │                              2. Creates timestamped in backup archive 'backup/YYYYMMDDhhmmss_gas.zip'
   │                              3. Flattens 'src/' and 'src/html/' into 'tmp_clasp'
   │                              4. Swaps out active scriptId tokens if passed
   │                              5. Executes 'clasp push' from built flat folder
   ▼
 Google Apps Script Production Instance
```

### 📥 The Pull Sync Sequence (Remote Cloud ──> Local Repository)
*   **Trigger**: Executed locally via `npm run clasp:pull`.
*   **Backup Action**: Automatically bundles your current local `src/` directory into a timestamped recovery archive within the `backup/` folder (`[TIMESTAMP]_src.zip`).
*   **Asset Ingestion**: Downloads the production flat file namespace from the remote Google Apps Script repository directly into a temporary `tmp_clasp/` folder.
*   **Code Restructuring**: Restructures the flat file collection into modular project folders. This converts `.js` scripts back into local `.gs` modules, drops HTML files cleanly into `src/html/`, and runs empty folder checks before deleting the temporary staging workspace.

### 🔨 The Test Compilation Bridge (Source ──> Build Cache)
*   **Trigger**: Executed locally via `npm run build`.
*   **Compilation Bridge (`scripts/build.js`)**: Prepares the `buld` folder content into testable scripts.
    1. Translates cloud `.gs` backend files into standard Node-compatible JS modules. Converts `.gs` → `.js`
    2. Extracts encapsulated browser script blocks (`*Dialog[Helpers|Render].html`) out of specialized template views in `src/html/`. Converts `.html` → `html.js`
    3. Appends explicit modular common JS exports via dynamic `@export` code flags.
    4. Preserves source traceability via `SOURCE` header of the files in `build` folder. 
*   **Staging Output (`build/`)**: Caches the transformed scripts (e.g., `build/*gs`, `build/*Dialog[Helpers|Render].html`) as ready test elements. It is an optimized practice to execute this compilation step *only* when the underling `src/` environment shifts. 

### 🧪 The Isolated Unit Testing Suite (Build Cache ──> Test Execution)
*   **Trigger**: Executed locally via `npm run test`.
*   **Isolated Kernel Evaluation**: Jest processes your test suites (`test/*.unit.test.js`) against the pre-compiled staging assets inside `build/`. It uses an environment simulator (`test/utils/testKernel.js`) that completely stubs global cloud targets (`SpreadsheetApp`, `HtmlService`, `Logger`) and initializes your `global.state = {}` array data.

### 📤 The Push Deployment Pipeline (Local Repository ──> Remote Cloud)
*   **Trigger**: Executed locally via `npm run clasp:push` (or systematically passed dynamic overrides using `npm run deploy:prod`).
*   **Pre-Push Remote Snapshot**: Runs an isolated remote fetch into a temporary `gas_download/` path and creates a rollback ZIP (`[TIMESTAMP]_gas.zip`) to protect live code.
*   **Flattening Compilation (`scripts/clasp.zsh`)**: Drops code files from `src/` root and flattens templates out of `src/html/` directly into a temporary flat staging directory (`tmp_clasp/`).
*   **Token Optimization**: Rewrites `.clasp.json` to point to the staging build folder, injects target script credentials if an optional argument is present, uploads the flat assets cleanly to the cloud via `clasp push`, and triggers a native terminal trap to safely restore original tracking records.

> The script `clasp.zsh` accepts two input arguments: the first one is the action (`pull` or `push`), and the second (optional) is `scriptId`. By default, the configuration file `clasp.json.template` points to the testing file. During the synchronization process between GAS and a local repository or vice versa, you can use the second input argument to specify the `scriptId` of the production Google Sheet file. 

---

## 3. Directory Layout Specification

```text
panini-wc-2026-gsheet-tracker/
├── .clasp.json.template      # Template clasp configuration file, used in 'npm run clasp'.
|── .claspignore              # Indicates folders/files to ignore by clasp.
|── .eslintignore             # Indicates folders/files to ignore by eslint (code analysis).
|── .eslintirc.js             # Eslint configuration file with customized rules.
|── .gitignore                # Folders/files to ignore by git (repository).
├── package.json              # Node project descriptors, dependencies, and pipeline bindings.
├── jsconfig.json             # VS Code config file to specify JavaScript project's configuration.
├── .gitignore                # Strict patterns blocking transient workspace and cache leaks.
├── scripts/
│   ├── build.js              # JavaScript bridge extracting HTML blocks for local unit tests.
│   ├── clasp.zsh             # Unified, transactional shell sync-and-backup engine (local GAS ↔ repository).
|   ├── fix-jsdoc.js          # Fit short JSDOC comments into a single line.
├── src/                      # MUTABLE LOCAL SOURCE OF TRUTH.
│   ├── appscript.json        # Project manifest. Central configuration file for a Google Apps Script project.
│   ├── Code.gs               # Structural GAS cloud UI generation menu bindings.
│   ├── Commons.gs            # General runtime utilities and global system declarations.
│   ├── *Service.gs           # Modular system business data service providers.
│   └── html/                 # User Interface markup layouts and layer scripts.
│       ├── *Dialog.html      # Main view frameworks handling events and cloud calls.
│       ├── *Helpers.html     # Extracted browser-independent pure processing logic.
│       └── *Render.html      # Dedicated UI factory components building visual DOM structures.
│       └── *Styles.html      # Styles files, i.e. CSS configuration.
├── build/                    # AUTOMATED TARGET CACHE (BLOCK MANUAL MUTATIONS).
│   ├── *.js                  # Code blocks compiled into common JS specifications.
│   └── *.html.js             # Extracted helper end render algorithms wrapped for mock evaluation.
├── test/                     # ISOLATED JEST UNIT TESTING GRID.
│   ├── *.unit.test.js        # Target test cases checking functional service compliance.
│   ├── jest.config.js        # Jest configuration file.
│   ├── utils/
│   │   └── testKernel.js     # Main environment emulation stubbing global Google objects.
│   └── fixtures/             # Valid default named ranges.
│   └────createValidRanges.js # Deterministic test variables and mock range parameters.
└── backup/                   # LOCAL ZIP HISTORY STORAGE (AUTO-GENERATED).
    ├── [TIMESTAMP]_src.zip   # Rollback snapshots of local 'src' right before a pull merge.
    └── [TIMESTAMP]_gas.zip   # Rollback snapshots of cloud remote code right before a push deploy.
```

---

## 4. UI Layer Engineering Rules

To ensure local testability while maintaining cross-platform synchronization safety, user interface layouts are split into three strict layers:

### Layer 1: Dialog Orchestration Framework (`*.html`)
*   **Responsibility**: Defines structural layout markup frameworks, initializes global visual lifecycles, connects view events, and executes asynchronous cloud transactions via `google.script.run`.
*   **Test Status**: Untested locally; must be kept lightweight to minimize execution risks.

### Layer 2: Functional Logic Helpers (`*Helpers.html`)
*   **Responsibility**: Manages data-filtering mechanics, pending structural calculations, update state array logic, summary calculations, and data translation transformations.
*   **Constraints**:
    *   ✔ Must remain pure, deterministic, and entirely browser-independent.
    *   ❌ Strictly prohibited from referencing browser objects like `document`, `window`, or UI elements.
    *   ❌ Strictly prohibited from executing `google.script.run` parameters.
*   **Test Status**: Heavily tested locally through Jest using extracted artifacts inside `build/`.

### Layer 3: Visual Render Factories (`*Render.html`)
*   **Responsibility**: Directs explicit DOM document object element assembly, handles visual component layout assignments, and manages layout construction mechanics (e.g., `buildCountrySection`, `buildStickerCard`).
*   **Constraints**:
    *   ✔ Handles all native UI component generation and DOM mutations.
    *   ❌ Strictly prohibited from containing underlying core business calculations or service definitions.
*   **Test Status**: Partially tested or mocked locally through `jest-environment-jsdom`.

---

## 5. Automated Lifecycles & Developer Workflow Pipeline

The shell script located at `scripts/clasp.zsh` controls all remote synchronizations. It handles configuration states transactionally to protect workspaces from configuration drift.

### Local Quality-Gate Verification Suite
Before promoting code changes to GitHub or the Google Apps Script production instance, developers should execute the unified local validation script pipeline:
```bash
npm run deploy:prod
```
This single gatekeeper script sequentially commands the local workspace to:
1. Run ESLint structural syntax checks and minor corrections (`npm run lint:fix`).
2. Recompile testing artifacts (`npm run build`).
3. Verify feature compliance across all test suites via Jest (`npm run test`).
4. Execute `clasp.zsh push` to deploy code to your configured sandbox environment if all checks pass.

### Transactional Configuration Swaps & Safety Cleanups
Because Google's `clasp` utility does not accept directory path parameters via command-line arguments, the script uses the localized configuration file (`.clasp.json.template`) dynamically at runtime. 

To safeguard the repository tracking environment from structural configuration corruption if a network error occurs or a process is aborted (`Ctrl+C`), the synchronization script implements localized `trap` handlers inside its operational execution blocks. 

Whenever an active operation enters a task—such as modifying `rootDir` to a transient build directory or swapping out the active `scriptId` credential token—the system registers an emergency cleanup function. If the deployment succeeds cleanly or encounters a sudden crash, the system fires these safety hooks to automatically restore clasp configurations back to their safe, initial states:
*   `"rootDir"` is reset to its default token placeholder (`"__ROOT_DIR__"`).
*   `"scriptId"` is reset back to its original development/testing sandbox credentials.

### Multi-Platform Cross-Run Environment Policy
This synchronization tool framework is written in `zsh` and relies on the native standard `find` command. It executes natively out-of-the-box on macOS and Linux computers. 

For engineers collaborating on **Windows workstations**, development environments must be configured to run the script inside **Git Bash** or **WSL (Windows Subsystem for Linux)**. Running this script natively inside default Windows Command Prompt (`cmd.exe`) or PowerShell instances will fail.

---

## 6. Continuous Integration (CI) Deployment Blueprint

The continuous integration architecture leverages GitHub Actions to enforce automated testing quality-gates before promoting and publishing validated artifacts directly to the production Google App Script instance.

### Secure Credentials Management
Production environment variables are securely decoupled from the git history by using repository-level **GitHub Actions Secrets**. Two keys must be added inside your repository's **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions** dashboard:

1.  `PRODUCTION_SCRIPT_ID`: The unique target Google Apps Script production environment credential token.
2.  `CLASPRC_JSON_SECRET`: The entire content string copied out of your private global home computer authentication configuration file (`~/.clasprc.json`).

### Automated GitHub Actions Workflow Responsibilities
The automation pipeline runs inside a clean virtual Linux container whenever modifications are successfully pushed or merged into your repository's `main` branch. It handles deployment using the following structured automation steps:

1.  **Code Check out**: Downloads a fresh, isolated snapshot copy of your repository's active code branch.
2.  **Runtime Initialization**: Sets up the Node.js development runtime environment and caches your local module registries.
3.  **Clean Installation**: Installs a clean, locked set of your project's node modules and developer tools.
4.  **Static Code Analysis**: Runs ESLint quality checks to verify your JavaScript structure is free of syntax errors or bad documentation patterns.
5.  **Build Extraction**: Compiles code parameters and extracts pure functional blocks out of HTML template files into testing modules.
6.  **Jest Unit Testing**: Executes your comprehensive testing suites to ensure code behavior is completely operational and has not broken existing features.
7.  **Credentials Decryption**: Injects your secret Google login tokens from your secrets vault directly into the virtual environment's root system directory.
8.  **Target Token Promotion**: Executes the `clasp.zsh push` engine, passing your secret production credential argument to swap the `scriptId` on-the-fly and deploy your validated files directly to your live production Google instance.
