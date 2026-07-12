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

### `clasp.zsh`

The `clasp.zsh` script automates the synchronization and deployment workflow. It accepts the following arguments:

1. **Action** (`pull`, `push`, or `deploy`) *(required)*.
2. **`scriptId`** *(optional)*. By default, the generated `.clasp.json` file references the staging Apps Script project defined in `.clasp.json.template`. When synchronizing with another project (for example, the production Google Sheet), you can provide its `scriptId` as the second argument.
3. **`deploymentId`** *(optional, `deploy` only)*. If omitted, the script uses the staging deployment ID configured within the script.
4. It accepts also as input argument `-h|--help|-help|help` to print out in the terminal the script usage. In such case no other action is carried except to print the help of the script.

#### Dry-run Mode

The script supports a dry-run mode that simulates the entire workflow without executing any `clasp pull`, `clasp push`, or `clasp deploy` commands and without modifying local or remote files.

```bash
DRY_RUN=true npm run clasp:push
```

#### Verbose Logging

To enable verbose logging during execution:

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

At startup, the script prints the active configuration, for example:

```bash
[BOOT] CONFIGURATION: LOG_LEVEL=0 DRY_RUN=false CMD=deploy
```

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
|       |── *View.html           # View services used by *Dialog.html and Mobile*.html services.
│       ├── *Helpers.html        # Extracted browser-independent pure processing logic.
│       └── *Render.html         # Dedicated UI factory components building visual DOM structures.
│       └── MobileHome.html      # Mobile entry point (navigation drawer, view switching system, injected view via include).
│       └── Mobile*View.html     # Wrapper views for mobile services or simplified implementation of the service.
│       └── *Styles.html         # Styles files, i.e. CSS configuration.
├── build/                       # AUTOMATED TARGET CACHE (BLOCK MANUAL MUTATIONS).
│   ├── *.js                     # Code blocks compiled into common JS specifications.
│   └── *.html.js                # Extracted helpers and render algorithms wrapped for mock evaluation.
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

To ensure local testability while maintaining cross-platform consistency and synchronization safety, the user interface is organized into three distinct layers:

### Layer 1: Dialog Orchestration Framework (`*Dialog.html`)
* **Responsibility**: Defines the desktop dialog structure, initializes the UI lifecycle, connects view events, and executes asynchronous backend calls via `google.script.run`. When the UI is shared with the mobile application, this file becomes a thin desktop wrapper around the shared `*View.html`, retaining only desktop-specific initialization and services.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

#### Layer 1.1: Shared View (`*View.html`)
* **Responsibility**: When the UI is shared between the desktop and mobile applications, the common implementation is moved from `*Dialog.html` into `*View.html`. This layer defines the shared UI structure, initializes the UI lifecycle, connects view events, and executes asynchronous backend calls via `google.script.run`.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

#### Layer 1.2: Mobile Home (`MobileHome.html`)
* **Responsibility**: Entry point for the mobile web application. It provides the navigation drawer, view switching mechanism, and loads feature views using HTML includes.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

#### Layer 1.3: Mobile-Specific View (`Mobile*View.html`)
* **Responsibility**: Provides the mobile wrapper around shared `*View.html` files, adding mobile-specific initialization or configuration when required. If a mobile feature requires a different interface from the desktop version, this layer contains the dedicated implementation. For example, `MobileImportView.html` provides a simplified import interface optimized for mobile devices.
* **Test Status**: Not tested locally; should remain lightweight to minimize execution risks.

### Layer 2: Functional Logic Helpers (`*Helpers.html`)
* **Responsibility**: Manages data filtering, pending update calculations, state management, summary calculations, and data transformation logic.
* **Constraints**:
    * ✔ Must remain pure and deterministic; should not depend on DOM APIs or browser runtime state.
    * ❌ Must not reference browser objects such as `document`, `window`, or UI elements.
    * ❌ Must not execute `google.script.run` calls.
* **Test Status**: Extensively tested locally with Jest using extracted artifacts from the `build/` directory for functions marked with the `@export` tag.

### Layer 3: Visual Render Factories (`*Render.html`)
* **Responsibility**: Handles DOM construction, visual component creation, and layout assembly (e.g., `buildCountrySection`, `buildStickerCard`).
* **Constraints**:
    * ✔ Responsible for generating UI components and performing DOM updates.
    * ❌ Must not contain business logic, calculations, or backend service definitions.
* **Test Status**: Partially tested locally using mocked DOM environments for functions marked with the `@export` tag.

> Functions defined `*[Helpers|Render].html` files are encapsulated in namespaces to avoid browser's global scope pollution.

---

## 5. System Architecture

### Overview

The Google Apps Script spreadsheet application provides two user interfaces:
- Desktop UI through Google Sheets dialogs.
- Mobile UI through a Web app (`doGet()`).

The mobile implementation is built on top of the same backend services used by the desktop application. Both platforms share the same business logic and repository layer, while providing platform-specific views and styling where necessary.

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
- Expose desktop dialog and mobile Web app entry points.
- Serve shared HTML templates.
- Provide a common backend for both desktop and mobile UIs.

#### Shared repository layer

`Commons.gs` contains the shared spreadsheet repository layer. The `StickerSheetRepository` constructor accepts an optional spreadsheet instance. Desktop services use the active spreadsheet by default, while mobile services explicitly pass the target spreadsheet.

This constructor parameter is a key part of the mobile architecture because:
- Desktop dialogs continue using `SpreadsheetApp.getActiveSpreadsheet()`.
- Mobile Web app cannot rely on `getActiveSpreadsheet()`.
- Mobile wrapper functions in `Code.gs` resolve the spreadsheet from the request and pass it to the repository.

This design allows the same repository implementation to operate correctly in both execution environments without duplicating business logic.

##### `StickerSheetRepository` responsibilities
- Locate named ranges.
- Validate the spreadsheet structure.
- Read country and sticker data.
- Update sticker counts in batches.
- Provide reusable lookup helpers for the import, export, and Quick Entry services.
- Lazily initialize internal attributes through getters to reduce execution time.

### UI

The application provides two user interfaces:
- Desktop UI
- Mobile UI

### Desktop UI

- `ImportDialog.html`: Desktop dialog for importing sticker data into Google Sheets.
  - Load styles: `CommonStyles.html` and `ImportExportStyles.html`.
  - Load `ImportHelper.html`.
  - Load data from text or CSV files.
  - Paste sticker data manually.
  - Validate and preview imported data.
  - Import sticker counts into the spreadsheet.

- `ExportDialog.html`: Desktop dialog used by both export services.
  - Load styles: `CommonStyles.html` and `ImportExportStyles.html`.
  - Provides the desktop dialog shell.
  - Injects `dialogMode`.
  - Loads `ExportView.html` (the view file loads the `ExportHelpers.html`)
  - Initializes the shared view.
  - Supports both `export_all` and `export_shared` modes.

- `QuickEntryDialog.html`: Desktop dialog for Quick Entry.
  - Load styles: `CommonStyles.html` and `QuickEntryStyles.html`.
  - Provides the desktop dialog shell.
  - Includes desktop styles.
  - Loads `QuickEntryView.html` (The view file, loads the `QuickEntryHelpers.html` and `QuickEntryRender.html`)
  - Initializes the shared Quick Entry view.

Whenever the desktop and mobile implementations share the same UI, the common markup and controller logic are extracted into a `*View.html` file. The desktop dialog and the mobile wrapper then become thin containers responsible only for platform-specific initialization.

Examples:

- `ExportView.html`
  - Single export implementation shared by `ExportDialog.html` and `MobileExportView.html`.
  - Owns:
    - Export toolbar.
    - Export text area.
    - Refresh, copy, and download actions.
    - Export hints and warnings.
    - Mode-driven export routing.
  - The active export mode is supplied by the parent wrapper instead of relying on duplicated global state.
  - Loads `ExportViewHelpers.html`

- `QuickEntryView.html`
  - Displays the toolbar, filters, legend, message area, and country list.
  - Includes the shared helpers and rendering modules.
  - Manages view state and user interactions.
  - Calls the appropriate backend methods depending on whether it is running inside the desktop dialog or the mobile Web app.
  - Loads `QuickEntryHelpers.html` and `QuickEntryViewRender.html` files.

> `ImportDialog.html` is the only desktop dialog that does not share its view with the mobile application. The mobile import workflow is intentionally simplified to better fit smaller screens.

### Mobile UI

- `MobileHome.html`: Mobile application shell.
  - Provides the application header.
  - Implements the navigation drawer.
  - Handles view switching.
  - Clears messages when navigating between services.
  - Loads the mobile styles: `MobileStyles.html`, `MobileImportStyles.html`, `MobileExportStyles.html` and `MobileQuickEntryStyles.html`.
  - Loads the views: `MobileImportView.html`, `MobileExportView.html`, and `MobileQuickEntry.html`.

- Mobile views:
  - `MobileImportView.html`: Simplified mobile implementation of the import service.
  - `MobileExportView.html`: Mobile wrapper around `ExportView.html`.
    - Provides the mobile layout.
    - Sets the page title and export hint.
    - Loads the shared export view.
    - Initializes the selected export mode.
  - `MobileQuickEntryView.html`: Mobile wrapper around `QuickEntryView.html`.
    - Configures the mobile layout.
    - Sets the number of stickers displayed per row.
    - Reuses the shared Quick Entry implementation.

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

### Mobile quick entry flow

1. The user opens the navigation drawer.
2. Selects **Quick Entry**.
3. `MobileHome.html` calls `showQuickEntryView()`.
4. `MobileQuickEntryView.html` configures the mobile layout (five stickers per row).
5. `QuickEntryView.html` loads the shared interface and initializes the data.
6. Backend wrapper functions invoke the mobile Quick Entry service to retrieve and update sticker data.

### Styles

- `CommonStyles.html`: Common styles shared by all desktop dialogs.
  - Theme variables.
  - Typography.
  - Layout primitives.
  - Buttons.
  - Messages.
  - Form controls.

- `ImportExportDialogStyles.html`: Desktop styles shared by the Import and Export dialogs.
  - Shared layouts.
  - Forms.
  - Buttons.
  - Message components.

- `QuickEntryDialogStyles.html`: Desktop-specific styles for the Quick Entry dialog.
  - Sticker grid layout.
  - Country sections.
  - Sticker cards.
  - Filters.
  - Desktop dialog layout.

- `MobileStyles.html`: Common styles shared by all mobile services.
  - Theme variables.
  - Typography.
  - Layout primitives.
  - Buttons.
  - Messages.
  - Form controls.

- `MobileImportStyles.html`: Mobile-specific styles for the import service.
  - Import card layout.
  - Buttons.
  - Preview panel.
  - Warning panel.
  - Format hints.

- `MobileExportStyles.html`: Mobile-specific styles for the export service.
  - Export card layout.
  - Toolbar alignment.
  - Button sizing.
  - Text area sizing.
  - Warning and message styling.

- `MobileQuickEntryStyles.html`: Mobile-specific styles for the Quick Entry service.
  - Responsive five-column sticker grid.
  - Mobile-optimized sticker cards.
  - Country summary layout.
  - Mobile typography.
  - Larger touch targets.
  - Responsive handling of incomplete sticker rows.
  - Pending-change indicators.

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

If you want also to deploy the Web app for testing mobile services, you can use instead:

```bash
npm run deploy:all
```
It runs the same steps as in `deploy:test` plus Web app deploy to generate a new deployment version, keeping the same description, i.e. `clasp.zsh deploy`.

> Keep in mind that Google Apps Script has a limit of 200 versions and in some Apps Script versions it doesn't offer a bulk process to delete old versions. That is why we have this separated script task, so the user just deploy the Web app when it is really needed.

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

> A common practice is to use a structured naming convention such as `feature/<branchName>`, although this is not enforced by the CI pipeline.

Example:

```bash
git checkout -b feature/add-country-filter      # or
git checkout -b add-country-filter              # short branch name
```

#### 3. Make changes locally

Implement the required changes in the project.

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

**Workflow file**

```text
.github/workflows/validate.yml
```

This workflow is executed for:

- Every push to the `main` branch.
- Every Pull Request targeting the `main` branch.

Its purpose is to validate the project without performing any deployment.

The workflow performs the following actions:

1. Execute the shared setup action (`.github/actions/setup-project/action.yml`):
   - Checkout the repository.
   - Setup the Node.js environment.
   - Install project dependencies (`npm ci`).
2. Run ESLint.

   ```bash
   npm run lint
   ```

3. Execute the test suite.

   ```bash
   npm test
   ```

##### Production Deployment Workflow

**Workflow file**

```text
.github/workflows/deploy.yml
```

This workflow is executed only after a push to the `main` branch **and** only when one or more of the following paths are modified:

- `src/**`
- `.github/workflows/deploy.yml`
- `.github/actions/setup-project/**`

The workflow performs the following actions:

1. Execute the shared setup action (`.github/actions/setup-project/action.yml`):
   - Checkout the repository.
   - Setup the Node.js environment.
   - Install project dependencies (`npm ci`).
2. Install `zsh` (required to execute the `clasp.zsh` helper script).
3. Install the Google Apps Script CLI.

   ```bash
   npm install -g @google/clasp
   ```

4. Inject the Google Apps Script authentication credentials by creating the runtime file `~/.clasprc.json` from the `CLASPRC_JSON_SECRET` repository secret.
5. Push the project source to the production Google Apps Script project.

   ```bash
   zsh scripts/clasp.zsh push ${{ secrets.PRODUCTION_SCRIPT_ID }}
   ```

6. Create a new version of the production Web App while preserving the existing deployment description.

   ```bash
   zsh scripts/clasp.zsh deploy \
     ${{ secrets.PRODUCTION_SCRIPT_ID }} \
     ${{ secrets.PRODUCTION_DEPLOYMENT_ID }}
   ```

##### Shared Composite Action

Both workflows reuse a common Composite Action located at:

```text
.github/actions/setup-project/action.yml
```

This action centralizes the common CI setup steps:

1. Checkout the repository.
2. Setup the `Node.js` environment.
3. Install project dependencies (`npm ci`).

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
