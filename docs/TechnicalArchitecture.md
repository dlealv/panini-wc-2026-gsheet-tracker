# 📘 Technical Documentation: Panini WC 2026 GSheet Tracker

This document provides a comprehensive technical overview of the system architecture, file structures, development lifecycle pipelines, and core engineering design constraints governing the Panini WC 2026 GSheet Tracker project.

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
   ├── *.gs (Code.gs, Commons.gs, *.Service.gs)
   └── html/ (*Dialog.html, *DialogHelpers.html, *DialogRender.html, *Styles.html, Mobile*.html)
   │
   ├── [ npm run build ] ──>  Triggers 'node scripts/build.js' bridge:
   │                          - Translates '.gs' files to Jest-safe JS
   │                          - Extracts script tags out of HTML layouts from *DialogHelpers.html and *DialogRender.html
   │                          - Appends CommonJS-compatible exports via @export annotations (used for Jest execution layer)
   ▼
 build/ (AUTO-GENERATED TESTING WORKSPACE — DO NOT EDIT MANUALLY)
   ├── (Code.js, Commons.js, *Service.js, *DialogHelpers.html.js, *DialogRender.js)
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
   │── [ npm run clasp:deploy ] ──> Deploy a new version of the Web App via 'scripts/clasp.zsh deploy':
   │                              1. Creates a new version of the Web App deployment, keeping the same URL links
   │                              2. Preserves the description of the deploy (deployment name)
   |                              Note: It assumes a deployment already exists and the deployment id is known.
   |
   ▼
 Google Web App deployment updated (new version of the mobile application deployed)  

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
    2. Extracts encapsulated browser script blocks (`*Dialog[Helpers|Render].html`) out of specialized template views in `src/html/`. Converts `.html` → `html.js`
    3. Appends explicit modular common JS exports via dynamic `@export` code flags.
    4. Preserves source traceability via `SOURCE` header of the files in `build/` folder. 
*   **Staging Output (`build/`)**: Caches the transformed scripts (e.g., `build/*.gs`, `build/*Dialog[Helpers|Render].html`) as ready test elements. It is an optimized practice to execute this compilation step *only* when the underlying `src/` sources change.

### 🧪 The Isolated Unit Testing Suite (Build Cache $\rightarrow$ Test Execution)
*   **Trigger**: Executed locally via `npm run test`.
*   **Isolated Kernel Evaluation**: Jest processes your test suites (`test/*.unit.test.js`) against the pre-compiled staging assets inside `build/`. It uses an environment simulator (`test/utils/testKernel.js`) that completely stubs global cloud targets (`SpreadsheetApp`, `HtmlService`, `Logger`) and initializes your `global.state = {}` array data.
>To ensure the tests always execute against the latest version of the `src/` folder, the `test` script first runs the `build` script. It is defined as `"test": "npm run build && jest"` in `package.json`. It is defined as follows: `"test": "npm run build && jest"` in `package.json` file.

### 📤 The Push Deployment Pipeline (Local Repository $\rightarrow$ Remote Cloud)
*   **Trigger**: Executed locally via `npm run clasp:push`.
*   **Pre-Push Remote Snapshot**: Runs an isolated remote fetch into a temporary `gas_download/` path and creates a rollback ZIP (`[TIMESTAMP]_gas.zip` in `backup` folder) to protect live code.
*   **Flattening Compilation (`scripts/clasp.zsh`)**: Drops code files from `src/` root and flattens templates out of `src/html/` directly into a temporary flat staging directory (`tmp_clasp/`).
*   **Token Optimization**: Rewrites `.clasp.json` to point to the staging build folder, injects target script credentials if an optional argument is present, uploads the flat assets cleanly to the cloud via `clasp push`, and triggers a native terminal trap to safely restore original tracking records.

### 📲 The Web app deployment (Remote Cloud $\rightarrow$ Web app deployment)
* **Trigger**: Executed locally via `npm run clasp:deploy`.
* **Pre-deploy**: Prepares workspace environment generating a clasp configuration file in working environment.
* **Deploy**: Generate a new version from an existing deployment keeping the same description taking as source files the content in GAS remote repository, i.e. it assumes `clasp push` was executed before.


### `clasp.zsh`

The script `clasp.zsh` accepts three input arguments: 
1. The action (`pull`, `push`, `deploy`)
2. The `scriptId` (optional). By default, the clasp configuration template file (`.clasp.json.template`) points to the staging file. During the synchronization process between GAS and a local repository or vice versa, you can use the second input argument to specify the `scriptId` of the production Google Sheet file.
3. `deploymentId` (optional) only used in `deploy` action. If not provided, it uses the deployment id of the staging file, defined as a parameter of the script.

The script also allows to run in dry-run mode, it simulates the entire process without doing a real `clasp` `pull/push/deploy` action or modifying any source/destination file. In order to run with dry-run try:
```bash
DRY_RUN=true npm run clasp:push
```

The script also allows to run in verbose mode:
```bash
LOG_LEVEL=1 npm run clasp:push
```

or with both options:
```bash
LOG_LEVEL=1 DRY_RUN=true npm run clasp:push
```

If not provided, the `LOG_LEVEL=0` and `DRY_RUN=false`. At the beginning of the batch execution it shows the values used during the execution:
```bash
[BOOT] CONFIGURATION: LOG_LEVEL=0 DRY_RUN=false CMD=deploy
```

---

## 3. Directory Layout Specification

```text
panini-wc-2026-gsheet-tracker/
├── .clasp.json.template         # Template clasp configuration file, used in 'clasp.zsh'.
|── .claspignore                 # Indicates folders/files to ignore by clasp.
|── .eslintignore                # Indicates folders/files to ignore by eslint (code analysis).
|── .eslintrc.js                 # Eslint configuration file with customized rules.
|── .gitignore                   # Folders/files to ignore by git (repository).
├── package.json                 # Node project descriptors, dependencies, and pipeline bindings.
├── package-lock.json            # Generated, lock to exact version. Required for CI.
├── jsconfig.json                # VS Code config file to specify JavaScript project's configuration.
├── .github/                     # GitHub-specific configurations, automation workflows, and community health files.
│   └── workflows/               # Dedicated directory used exclusively to store GitHub Actions workflow files
│       └── deploy.yml.          # specific automation script used to set up Continuous Deployment (CD) for your project
├── scripts/
│   ├── build.js                 # JavaScript bridge extracting HTML blocks for local unit tests.
│   ├── clasp.zsh                # Unified, transactional shell sync-and-backup engine (local GAS ↔ repository).
|   ├── fix-jsdoc.js             # Fit short JSDOC comments into a single line.
├── src/                         # MUTABLE LOCAL SOURCE OF TRUTH.
│   ├── appscript.json           # Project manifest. Central configuration file for a Google Apps Script project.
│   ├── Code.gs                  # Structural GAS cloud UI generation menu bindings.
│   ├── Commons.gs               # General runtime utilities and global system declarations.
│   ├── *Service.gs              # Modular system business data service providers.
│   └── html/                    # User Interface markup layouts and layer scripts.
│       ├── *Dialog.html         # Desktop dialog containers handling events and cloud calls.
|       |── *View.html           # View services used by *Dialog.html or Mobile*.html services.
│       ├── *DialogHelpers.html  # Extracted browser-independent pure processing logic.
│       └── *DialogRender.html   # Dedicated UI factory components building visual DOM structures.
│       └── MobileHome.html      # Mobile entry point (navigation drawer, view switching system, injected view via include).
│       └── Mobile*View.html     # Wrapper views for mobile services or simplified implementation of the service.
│       └── *Styles.html         # Styles files, i.e. CSS configuration.
├── build/                       # AUTOMATED TARGET CACHE (BLOCK MANUAL MUTATIONS).
│   ├── *.js                     # Code blocks compiled into common JS specifications.
│   └── *.html.js                # Extracted helper end render algorithms wrapped for mock evaluation.
├── test/                        # ISOLATED JEST UNIT TESTING GRID.
│   ├── *.unit.test.js           # Target test cases checking functional service compliance.
│   ├── jest.config.js           # Jest configuration file.
│   ├── utils/
│       └── testKernel.js        # Main environment emulation stubbing global Google objects.
└── backup/                      # LOCAL ZIP HISTORY STORAGE (AUTO-GENERATED).
    ├── [TIMESTAMP]_src.zip      # Rollback snapshots of local 'src' right before a pull merge.
    └── [TIMESTAMP]_gas.zip      # Rollback snapshots of cloud remote code right before a push deploy.
```

---

## 4. UI Layer Engineering Rules

To ensure local testability while maintaining cross-platform synchronization safety, user interface layouts are split into three strict layers:

### Layer 1: Dialog Orchestration Framework (`*Dialog.html`)
* **Responsibility**: Defines structural layout markup frameworks, initializes global visual lifecycles, connects view events, and executes asynchronous cloud transactions via `google.script.run` for the desktop version. When the UI is shared with the mobile application, this file becomes a thin desktop wrapper around the shared `*View.html`, keeping only desktop-specific initialization and services.
* **Test Status**: Untested locally; must be kept lightweight to minimize execution risks.

### Layer 1.1: View (`*View.html`)
* **Responsibility**: When the UI can be shared between the desktop and mobile versions, the common portion is moved from `*Dialog.html` to `*View.html` file. Defines structural layout markup frameworks, initializes global visual lifecycles, connects view events, and executes asynchronous cloud transactions via `google.script.run`.
* **Test Status**: Untested locally; must be kept lightweight to minimize execution risks.

### Layer 1.2: Home mobile(`MobileHome.html`)
* **Responsibility**: Mobile entry point which includes navigation drawer, view switching system, injected view via include.
* **Test Status**: Untested locally; must be kept lightweight to minimize execution risks.

### Layer 2: Functional Logic Helpers (`*DialogHelpers.html`)
*   **Responsibility**: Manages data-filtering mechanics, pending structural calculations, update state array logic, summary calculations, and data translation transformations.
*   **Constraints**:
    *   ✔ Must remain pure and deterministic; must not depend on DOM APIs or browser runtime state.  
    *   ❌ Strictly prohibited from referencing browser objects like `document`, `window`, or UI elements.
    *   ❌ Strictly prohibited from executing `google.script.run` parameters.
*   **Test Status**: Heavily tested locally through Jest using extracted artifacts inside `build/` for functions with `@export` tag.

### Layer 3: Visual Render Factories (`*DialogRender.html`)
*   **Responsibility**: Directs explicit DOM document object element assembly, handles visual component layout assignments, and manages layout construction mechanics (e.g., `buildCountrySection`, `buildStickerCard`).
*   **Constraints**:
    *   ✔ Handles all native UI component generation and DOM mutations.
    *   ❌ Strictly prohibited from containing underlying core business calculations or service definitions.
*   **Test Status**: Partially tested or mocked DOM locally for functions with `@export` tag.

---

## 5. System Architecture

### Overview

The Google Apps Script spreadsheet application includes:
- Desktop UI via Spreadsheet dialogs
- Mobile Web App via `doGet()`

The mobile architecture is built around a shared backend repository layer and a set of mobile-specific views that reuse the same core business logic as the desktop UI.

### Backend
- `Code.gs`
- `Commons.gs`
- `ImportService.gs`
- `ExportService.gs`
- `QuickEntryService.gs`

Responsibilities:
- Read and update spreadsheet data.
- Generate import and export payloads.
- Process sticker count updates.
- Expose desktop dialog and mobile Web App entry points.
- Serve shared HTML templates.
- Provide a common backend for both desktop and mobile UIs.

#### Shared repository layer
`Commons.gs` contains the shared spreadsheet access layer. The constructor of `StickerSheetRepository` accepts an optional spreadsheet instance parameter. This parameter is required by the mobile services. Desktop services continue using the default active spreadsheet.

This constructor input argument is key part of the mobile implementation because:
- Desktop dialogs can continue using `SpreadsheetApp.getActiveSpreadsheet()`
- Mobile web app calls cannot rely on `getActiveSpreadsheet()`
- Mobile wrappers in `Code.gs` now pass the resolved spreadsheet explicitly

This makes the repository usable in both desktop and mobile execution contexts.

##### StickerSheetRepository class responsibilities
- Locate named ranges
- Validate sheet layout
- Read country and sticker data
- Update sticker counts in batch
- Provide reusable lookup helpers for import/export services and mobile quick entry
- Initialize attributes via getters lazy initialization to optimize the execution.

### UI
The application has two user interfaces (UI):
- Desktop
- Mobile UI

### Desktop UI
- `ImportDialog.html`: HTML user interface for the import dialog shown inside Google Sheets.
  - Load data from a text/CSV file
  - Paste sticker data manually
  - Validate and preview the import
  - Import sticker counts into the spreadsheet
- `ExportDialog.html`: HTML user interface for the export dialog shown inside Google Sheets.
  - Provides the desktop export dialog shell
  - Injects `dialogMode`
  - Loads `ExportView.html`
  - Initializes the shared view on page load
  - It is a common dialog for both export services: `export_all` and `export_shared` controlled via `dialogMode`.
- `QuickEntryDialog.html`: HTML user interface for the quick sticker entry shown inside Google Sheets
  - Provide desktop dialog structure
  - Include common dialog styles
  - Include shared quick entry view
  - Initialize the view when dialog opens

When view for desktop and mobile service is very similar, the view portion and the logic (functions) from `*Dialog.html` is moved to `*View.html` file. That is the case of:

- `ExportView.html`: is the single export UI implementation used by: `ExportDialog.html` for desktop and `MobileExportView.html` for mobile. This shared component owns:
  - The export toolbar
  - The export text area
  - Refresh, copy, and download actions
  - Mode-driven export routing
  - Export hint and warning rendering
  - The active export mode is handled inside `ExportView.html` and passed by the parent container.  
This avoids relying on competing state variables across multiple layers.

- `QuickEntryView.html`
  - Display top bar with Update button, filters, and legend
  - Display message area and country list
  - Include shared helpers and render logic
  - Manage state and user interactions
  - Call appropriate backend methods based on execution context

> The only service doesn't reuse the view for mobile service is `ImportDialog.html`. The reason, for mobile version import service has been simplified.

### Mobile UI
- `MobileHome.html`: shell for mobile services, provides:
  - application header
  - drawer navigation
  - view switching
  - message clearing across views

- Views:
  - `MobileImportView.html`: Simplified version of `ImportDialog.html` for mobile devices. It doesn't include the detail help information section.
  - `MobileExportView.html`: Wrapper for `ExportView.html` for mobile equivalent service.
    - Provides the mobile export section wrapper
    - Sets the mobile title and top hint
    - Loads `ExportView.html`
    - Initializes the shared view with the selected mode
  - `MobileQuickEntryView.html`: Wrapper for `QuickEntryView.html` which provides the mobile quick entry service.

### Mobile import flow
1. User opens the hamburger menu
2. Selects Import
3. `MobileHome.html` routes to the import view
4. `MobileImportView.html` collects the payload
5. Backend wrappers in `Code.gs` call `ImportService`
6. Results are rendered in the mobile view

### Mobile export flow
1. User opens the hamburger menu
2. Selects Export all or Export shared
3. `MobileHome.html` routes to `showExportView(mode)`
4. `MobileExportView.html` sets the export title and hint
5. `ExportView.html` initializes the shared export UI
6. `ExportView.html` loads data using the selected mode

### Quick entry flow
1. User opens the hamburger menu
2. Selects Quick Entry
3. `MobileHome.html` routes to `showQuickEntryView()`
4. `MobileQuickEntryView.html` loads `QuickEntryView.html` and initialize the data load.


### Styles
- `CommonStyles.html`: Common styles to both desktop and mobile applications. It includes:
  - Theme variables
  - Typography
  - Layout primitives
  - Buttons
  - Messages
  - Form controls
  - Utility classes

- `ImportExportDialogStyles.html`: Common styles for import/export service for desktop. It contains:
  - Theme variables
  - Typography
  - Layout primitives
  - Buttons
  - Messages
  - Form controls

- `QuickEntryDialogStyles.html`: Styles for Quick sticker entry service for desktop. It contains:
  - Theme variables
  - Typography
  - Layout primitives
  - Buttons
  - Messages
  - Form controls
- `MobileStyles.html`: Common styles to all mobile services. It contains:
  - Theme variables
  - Typography
  - Layout primitives
  - Buttons
  - Messages
   - Form controls

- `MobileImportStyles.html`: Styles used for mobile import service. It owns:
  - The mobile import card layout
  - Buttons
  - Preview panel
  - Warnings panel
  - Format hint styling
  
- `MobileExportStyles.html`: Styles used for mobile export service.
  - The mobile export card layout
  - Toolbar alignment
  - Button sizing
  - Text area sizing
  - Warning and message styling
- `MobileQuickEntryStyles.html`: Styles used for mobile quick sticker entry service. 

---

## 6. Automated Lifecycles & Developer Workflow Pipeline

The shell script located at `scripts/clasp.zsh` controls all remote synchronizations. It handles configuration states transactionally to protect workspaces from configuration drift.

### Local Quality-Gate Verification Suite
Before promoting code changes to GitHub or the Google Apps Script staging/production instance, developers should execute the unified local validation script pipeline:
```bash
npm run deploy:test
```
This single gatekeeper script sequentially commands the local workspace to:
1. Run ESLint structural syntax checks and minor corrections (`npm run lint:fix`).
2. Recompile testing artifacts (`build/`) and verify feature compliance across all test suites via Jest (`npm run test`).
3. Execute `clasp.zsh push` to deploy code to your configured sandbox environment if all checks pass.
4. Execute `clasp.zsh deploy` to deploy a new version of the Web app.

### Transactional Configuration Swaps & Safety Cleanups
Because Google's `clasp` utility does not accept directory path parameters via command-line arguments, the script uses the localized configuration file (`.clasp.json.template`) dynamically at runtime. 

To safeguard the repository tracking environment from structural configuration corruption if a network error occurs or a process is aborted (`Ctrl+C`), the synchronization script implements localized `trap` handlers inside its operational execution blocks. 

Whenever an active operation enters a task—such as modifying `rootDir` to a transient build directory or swapping out the active `scriptId` credential token—the system registers an emergency cleanup function. If the deployment succeeds cleanly or encounters a sudden crash, the system fires these safety hooks to automatically restore clasp configurations back to their safe, initial states:
*   `"rootDir"` is reset to its default token placeholder (`"__ROOT_DIR__"`).
*   `"scriptId"` is reset back to its original staging/development/testing sandbox credentials.

### Multi-Platform Cross-Run Environment Policy
This synchronization tool framework (`scripts/clasp.zsh`) is written in `zsh` and relies on the native standard `find` command. It executes natively out-of-the-box on macOS and Linux computers. For engineers collaborating on **Windows workstations**, development environments must be configured to run the script inside **Git Bash** or **WSL (Windows Subsystem for Linux)**. Running this script natively inside default Windows Command Prompt (`cmd.exe`) or PowerShell instances will fail.

The script defines `sed_safe` function to ensure `sed` command works for both macOS and Linux platform.

---

## 7. Continuous Integration (CI) Deployment Blueprint

The continuous integration architecture leverages GitHub Actions to enforce automated testing quality-gates before promoting and publishing validated artifacts directly to the staging/production Google Apps Script instance.

### Secure Credentials Management
Production environment variables are securely decoupled from the git history by using repository-level **GitHub Actions Secrets**. Two keys must be added inside your repository's **Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions** dashboard:

1.  `PRODUCTION_SCRIPT_ID`: The unique target Google Apps Script production environment credential token.
2.  `CLASPRC_JSON_SECRET`: The entire content string copied out of your private global home computer authentication configuration file (`~/.clasprc.json`).
3. `PRODUCTION_DEPLOYMENT_ID`: The unique target Web app deployment id for production Google sheet tracker. This id is the URL used by the user to get access to services defined in custom menu **Manage Panini** from a mobile device.

### 🔁 Standard Production Deployment Workflow (GitHub CI via `main` branch)

This is the **REQUIRED** workflow for any production change.

#### 1. Start from latest main
```bash
git checkout main       # switches your current working directory to the "main" branch
git pull origin main    # downloads the latest changes from the main branch of your remote repository
                        # and immediately merges them into your current local branch
```

#### 2. Create a new feature branch
```bash
git checkout -b <branchName>
```
> A common practice is to use a structured naming convention such as `feature/<branchName>`, although this is not enforced by CI.

Example:

```bash
git checkout -b feature/add-country-filter      # or
git checkout -b add-country-filter              # short branch name
```

#### 3. Make changes locally
Make changes in the project files.

#### 4. Run full local validation
```bash
npm run deploy:test
```

This ensures:
- lint passes.
- build succeeds.
- tests pass.
- GAS repository updated via `clasp:push` (staging environment, not production).

#### 5. Commit changes

```bash
git add .  # stages all new, modified, and deleted files in the current directory to prepare them for the next commit
git commit -m "<summary of changes>" # commits all staged files
```

#### 6. Push branch to GitHub

```bash
git push origin <branchName> # upload local code changes (commits) to a specific branch on your remote server
```

#### 7. Create Pull Request (GitHub UI)

- Open GitHub repository.
- Click "Compare & pull request" (a banner pops up on the main page).
- Target branch: `main`.
- Source branch: `<branchName>`.

Github will trigger a CI pipeline executing the workflow defined here: `.github/workflows/deploy.yml`.

#### 8. Wait for CI pipeline (GitHub Actions)

GitHub Actions will automatically run:

- `npm ci`.
- `npm run lint`.
- `npm test` (includes npm run build as prerequisite).
- Inject `CLASPRC_JSON_SECRET` into CI runtime as `~/.clasprc.json`.
- Execute deployment via `scripts/clasp.zsh push` (production scriptId injected via GitHub Secrets).

#### 9. If CI is green $\rightarrow$ merge PR

- Click "Merge pull request".
- Confirm merge into `main`.

#### 10. Restore local repository
```bash
git checkout main
git pull origin main
```

#### 11. Delete remote branch (GitHub UI or CLI)

You can delete the merged branch from Github website or just:

```bash
git push origin --delete <branchName>
```

#### 12. Delete local branch

```bash
git branch -d <branchName>
```
You can remove more than one branch adding branch name delimited by space:

```bash
git branch -d <branchName1> <branchName2> <branchName3> ...
```
You can identify all branches already merged to main (candidate for deletion) as follows:

```bash
git branch --merged main
```

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
