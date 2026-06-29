# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and this project uses simple release-based entries focused on user-visible features, 
project structure, and documentation.

---

## [1.07] 2026-XX-XX

### Overview
Implemented a mobile services, including all services the desktop version provides: import/export and quick entry.

### Added
- Under the `src/html` folder:
  - `MobileHome.html`: Mobile entry point which includes navigation drawer, view switching system, injected view via include.
  - `MobileImportView.html`: Simplified view for mobile import service.
  - `MobileStyles.html`: Mobile CCS specific styles.
  - `MobileExportView.html`: View for both export services.
  - `ExportView.html`: View for export services (both desktop and mobile).


### Changes

- Under the `src` folder:
  - `appsscript.json` removed the authorization scope: `"https://www.googleapis.com/auth/spreadsheets.currentonly"` since `doGet` service used for mobile solution, can't work with `currentonly` scope. Instead using `"https://www.googleapis.com/auth/spreadsheets"`.
  - `Code.gs`: Added mobile specific entry point and services related to mobile service.
  - `Commons.gs`: 
    - Added an optional input parameter to `StickerSheetRepository` constructor so it can be used for mobile services with
  the input argument.
    - Adjusted the method `_updateCountryCounts` to properly update zero count as empty cell in the cases it applies and zero value for edge cases (non-valid stickers) when the count is zero.

- Under the `src/html` folder:
  - `ExportDialog`: Moved the view portion of the file to `ExportView.html` (shared with mobile and desktop).
  - `QuickEntryDialog.html`: Modified the method `applyChanges` to correctly applies apply pending changes to the UI view, no need to reload the data again, just to change the status of the pending stickers and update the count.
  - `QuickEntryHelpers.html`: Added the method `commitPendingUpdates` in charge of updating the pending changes in the UI view.


- Under the `unit/test folder:
  - `Commons.unit.test.js`: 
    - Added a test for constructor using the input argument.
    - Added the tests to verify the issue that in quick sticker entry after pushing Update button, the changes where not reflected in the UI. The corresponding test added failed, then fixed the issue and after that the tests didn't fail. Adding also additional edge test cases for `updateStickerCounts` method, that is in charge of this update.
  - `ExportService.unit.test.js`: Fix lint error related to `'space-before-function-paren'` rule.
  - `QuickEntryDialogHelper.unit.test.js`: Fix lint error related to `'space-before-function-paren'` rule.
  - `QuickEntryDialogRender.unit.test.js`: 
    - Fix lint error related to `'space-before-function-paren'` rule.
    - Added the tests for the method `commitPendingUpdates` in charge of updating the pending changes in the UI view.
  - `QuickEntryService.unit.test.js`: added tests for `applyChanges` unit tests, trying to identify the issue that after click on Update button the view doesn't keep the changes.

- Under the `test/utils` folder:
  - `testKernel.js`: 
    - In `initializeSpreadsheetAppMock` function the mock `spreadsheetMock` is not recreated on every test, instead it use the same instance.
    - Updated the mock for `updateStickerCounts` in `MockStickerSheetRepository` constructor with a more complex behavior.

- Under the `scripts` folder:
  - `build.js`: Adjusted some functions definition to fix the lint errors after changing lint configuration.
  - `fix-jsdoc.js`: Adjusted some functions definition to fix the lint errors after changing lint configuration.

- Under the `root` folder:
  - `eslintrc.js`: Configured the rule: `'space-before-function-paren'`.

### Fix
- Under Quick sticker entry When sticker count is positive and then reduce the count to zero and update, then sticker is updated to zero value, instead it should be updated to empty cell value. After update in Quick Entry the sticker card shows the original value before update, instead is should show zero count.
- Under Quick sticker entry the when changing the sticker count the change propagated to the `Stickers` tab, but after click on Update button, the sticker count restored the previous value.


## [1.0.6] 2026-06-21

### Overview
Minor corrections in the documentation (documents and source code). Added CI github integration. Updated the documentation of `TechnicalArchitecture.md` to include CI github integration.

### Added
- `.github` folder used to store workflow and deployment process
- `.github/workflows` where to store the `*.yml` files.
- `.github/workflows/deploy.yml`: CI deployment file using Github secrets.

### Changes
- Google sheet tracker:
  - `Reports` tab: 
    - Reported repeated stickers and unique repeated stickers in the same cell. Unique in parenthesis.
    - Now stickers bought the number of stickers and cost are reported in a single cell to make space for other variables.
    - Adjusted conditional formatting for repeated stickers, to check for repeated stickers greater than zero (red) and equal to zero (green).
    - Reordered the columns of the pivot table to mach the same order as in `Stickers` tab.

- Under the `src` folder:
  - `ImportService.gs`: Removed unnecessary attributes, added `getRepo()` to lazy initialize `this.repo`. Removed `_getCountryMap()` the same can be achieved with `this.getRepo().getCountryMap()`.
  - `ExportService.gs`: Removed unnecessary attributes, added `getRepo()` to lazy initialize `this.repo`.

- Under the `test` folder:
  - `ImportService.unit.test.js`: Added suit tests for `getRepo`.
  - `ExportService.unit.test.js`: Added suit tests for `getRepo` and `getRows()`.

- under the `doc` folder:
  - `FAQ.md`: minor corrections in I’m currently using an old version of the tracker. How can I upgrade to the new one? question.
  - `ImportServiceRequirements`: Added the `.md` extension.
  - `TechnicalArchitecture.md`: 
    - Provided detail steps for Continuous Integration (CI) Deployment Blueprint.
    - Added a FAQ section.

- under root:
  - `.gitignore`: removed `package-lock.json`, since it is needed for CI github integration.
  - `package.json`: 
    - Adjusted the script task `deploy:prod` and renamed as `deploy:test`, since production deploy will be done via Github CI.
    - Added engine setting to specify node version `18.x`.
    - Added clasp push/pull dry-run option and adjusted the existing ones to include `DRY_RUN=false`.
  - `README.md`: 
    - Added **Named functions** section. Minor corrections in **Named ranges** section.
    - Moved the note about country code from the top to section **Track your collection**.
    - Minor corrections in Import/Export services and in **Input format** section.
  - `CHANGELOG.md`: Added the changes for version `1.0.6`.

  ### Fixed
- No fixes addressed.

---

## [1.0.5] 2026-06-16

### Overview
No new functionality was added. Optimized the backend code. Split responsibilities across source files in both the front-end and back-end. Refactored the `StickerSheetRepository` class to implement lazy initialization through getters. The Import service now supports colon (`:`) and whitespace as a delimiter and converts them to a comma (`,`) delimiter as part of the pre-normalization process.

### Added

- Google sheet tracker: 
  - Added sort criteria in `Swap Compact View` tab for needed stickers in a similar way the `Trade` tab has.
  - Added the Team Completed information to the `Reports` tab.

- Under the `src` folder:
  - `ImportService.gs`: Backend of the Import service as part of `ImportExportService.gs` split.
  - `ExportService.gs`: Backend of the Export service as part of `ImportExportService.gs` split.  
 
- Under the `src/html` folder:
  - `ImportDialog.html`: Dialog for import services as part of `ImportExportDialog.html` split.
  - `ExportDialog.html`: Dialog for export services as part of `ImportExportDialog.html` split.
  - `ImportDialogHelpers.html`: Pure functions (testable) related to import dialog logic as part of `ImportExportDialogHelpers.html` split.
  - `ExportDialogHelpers.html`: Pure functions (testable) related to export dialog logic as part of `ImportExportDialogHelpers.html` split.  

- Under the `test` folder:
  - `ImportDialogHelpers.unit.test.js`: test file for `ImportDialogHelpers.gs` as part of `ImportExportDialogHelpers.unit.test.js` split.
  - `ExportDialogHelpers.unit.test.js`: test file for `ExportDialogHelpers.gs` as part of `ImportExportDialogHelpers.unit.test.js` split.

### Changed

- Under the `src` folder:
  - `ImportExportService.gs`: 
    - Removed the file and split the service into `ImportService.gs` and `ExportService.gs`. 
    - `ImportExportService` class renamed as `ImportService` and `ExportService` for each service.
    - `ExportService` class was renamed as `ExportStickers` to be consistent with `ImportService/ImportStickers` classes.
    - Renamed `exportStickerData` to `exportAllStickerData` in `ExportService` class.
    - Renamed `InputLineNormalize` class to `LineNormalize` since all the classes in this file are related to Import service.
    - In `LineNormalize` class, adjusted the method: `_normalizeDelimiters`, and `_stripNonAsciiAndUpperCase` to allow white and colon (`:`) as delimiters. All of them converted to comma (`,`) delimiters.
  - `Code.gs`: 
    - Refactored to separate the Import and Export dialogs and updated menu calls to use dedicated functions for each dialog.
  - `QuickEntryService.gs`: Updated to use the getters defined in `StickerSheetRepository`.

- Under the `src/html` folder:
  - `ImportExportDialog.html`: Removed and split the logic into `ImportDialog.html` and `ExportDialog.html`, providing dedicated dialogs for each function. Export file prefixes are now specific to each export type.
  - `ImportExportDialogHelpers.html`: Removed and split the logic into `ImportDialogHelpers.html` and `ExportDialogHelpers.html`, providing dedicated helpers for each dialog. Each helper file now handles a specific `payload` for its corresponding dialog. Updated the `buildExportFileName` method to generate export file prefixes specific to each export type.
  - `ImportExportDialogStyles.html`: Updated the header comment.
  - `QuickEntryDialogRender.html`: Added @export tag to include additional functions to be tested.
  - `QuickEntryDialogHelpers.html`: Added @export tag to include additional functions to be tested. In `applyPendingStickerUpdate`, `getVisibleCountries` made the functions defensive against `null/undefined` value.

- Under the `test` folder:
  - `ImportExportService.unit.test.js`: Removed and split by back-end test service: `ImportService.unit.test.js` and `ExportService.unit.test.js`. Added specific tests for white space and colon (`:`) delimiters for `LineNormalize` class test cases.
  - `ImportExportDialogHelpers.unit.test.js`: Removed the file and split the tests into `ImportDialogHelpers.unit.test.js` and `ExportDialogHelpers.unit.test.js`. Adjusted tests to consider specific payload for each service.
  - `Commons.unit.test`: Redesigned the testing strategy to focus only on public methods and removed tests related to private methods. Added coverage for all public methods, including getters.
  - `QuickEntryDialogRender.unit.test.js`: Added additional tests to increase coverage.
  - `QuickEntryDialogHelpers.unit.test.js`: Added a mock DOM to increase coverage by adding tests for DOM specific functions. Removed the dependency with `utils/testKernel.js`, since it is not required.
  - `utils/testKernel.gs`: Minor adjustments to mock data to accommodate the new tests.
  - `fixtures` folder removed (including its contents), as it was no longer in use. All required mocks are now created in `utils/testKernel.js`.

- Under the `doc` folder:
  - `FAQ.md`: Questions added:
    - Why use this tracker instead of an app on the market?
    - I’m currently using an old version of the tracker. How can I upgrade to the new one?
  - `ImportExportServiceRequirements.md`: Removed and split the requirements by service: `ImportServiceRequirements.md` and `ExportServiceRequirements.md`. Included colon (`:`) as a supported delimiter in the pre-normalization process as part of Import Service requirements.

- Under the root folder:
  - `package.json`: Added a new script, `test:file`, to simplify running a single test file. Usage: `npm run test:file -- Commons.unit.test.js`.
  - `README.md`: 
    - Updated the image of `Swap Compact View` to include sorting criteria for needed stickers.
    - Updated **Common rules** section to include colon (`:`) as delimiter as part of pre-normalization process.
    - Adjusted the list of files in **Files** section.
  - `TODO.md`: Remove the item related to include Google form, since after analysis it is not possible due to the way the Gsheet tracker is distributed.

### Fixed
- No fixes addressed.

---

## [1.0.4] 2026-06-11

### Overview
Added a new export service, `Export shared stickers`, inside **Panini Manage**. Renamed the previous service, `Export Stickers`, to `Export all stickers`. The new service facilitates sticker swapping among collectors by generating a list of repeated stickers and missing (needed) stickers. `ImportExportService` now uses `StickerSheetRepository`, removing duplicated functionality.

### Added

- `src/html/ImportExportDialogStyles.html`: Extracted from `src/html/ImportExportDialog.html` the `<style>` block into a dedicated file. Centralizes dialog-specific styling and improves maintainability.

- `src/html/QuickEntryDialogStyles.html`: Extracted from `src/html/QuickEntryDialog.html` the `<style>` block into a dedicated file. Keeps sticker grid, card, and dialog-specific styles isolated from markup.

- `src/html/CommonDialogStyles.html`: Extracted shared styles used across dialogs into a single file. Centralized theme variables, form controls, messages, and button styling. Standardized use of `.btn` across dialogs.

### Changes
- Google sheet tracker:
  - Improved `CLEAN_STICKER_LINE` named function to expand numeric ranges (e.g. `1-3 → 1,2,3`, `1-3-5 → 1,2,3,4,5`) for better trade input handling.
  - Added conditional formatting to highlight invalid or ranged input in the `Trades` tab.
  - Added named range `FLAGS` to point to country flag in the `Conf` tab. Updated the formula to populate country flag in `Stickers` tab to use the new named range defined.

- `src` folder:
  - `ImportExportService.gs`:
    - Renamed export service to `exportAll` to support multiple export modes.
    - Added shared sticker export service (`export_shared` mode).
    - Introduced `ExportService` class to consolidate export logic.
    - Moved export logic from `ImportExport` class into `ExportService`.
    - Renamed `ImportStickerParser` → `ImportService` for consistency.
    - Added support for new checkbox-based export options.
    - Simplified the class and constructor by introducing `this.repo` (`StickerSheetRepository`). Removed duplicated attributes and `_buildCountryMap`, since country lookup logic is now delegated to the repository.

  - `Code.gs`:
    - Updated `onOpen` menu structure for new export services.
    - Updated dialog title handling in `showImportExportDialog_`.
    - Renamed `exportStickerData` → `exportAllStickerData`.
    - Added new entry point `exportSharedStickerData`.
    - Standardized export modes: `export_all`, `export_shared`.

  - `Commons.gs`:
    - Simplified the logic because the `FLAGS_URL` named range already contains the URL. Simplified `_buildCountryRecord`, updated `getCountries`, and removed `_extractFlagValue`, `_isUrl`, and `getFormulas`.
    - Added getter methods used by `ImportExportService`.
  
- `src/html` folder:
  - `ImportExportDialog.html`:
    - Moved inline styles to `ImportExportDialogStyles.html`.
    - Added Export shared stickers UI.
    - Improved export-all layout (checkbox ordering, flag naming, output sizing, reduced duplication).

  - `QuickEntryDialog.html`:
    - Moved styles to `QuickEntryDialogStyles.html`.
    - Moved shared styles to `CommonDialogStyles.html`.

  - `QuickEntryDialogRender.html`:
    - Updated increment/decrement buttons to use shared `.btn` + `.btn-sticker` styling for consistency.

- `test` folder:
  - `ImportExportService.unit.test.js`: 
    - Removed dependencies on mock objects from class-level tests. Mocks are now only used when testing `ImportExportService`.
    - Simplified testing of `exportAllData` by introducing the helper function `parseExportAllData`, which converts output into a structured format for easier assertions. Now the suite includes all possible combinations of the configuration options in `exportAllData`.
    - Added helper functions to simplify the testing process `buildCounts` (generate the counts), `computeDone` (calculate dynamically the completion for a given country). Used in testing both export services.
    - Moved shared input data into `beforeAll` for both `exportAllData` and `exportSharedData` suites, resulting in more maintainable and concise tests.
    - Added `parseExportSharedData` to convert `exportSharedData` output into a structured format for easier testing.
    - Added a suite of tests to cover `exportSharedData` service.
    - Improved the `writes correct sticker matrix to sheet` test to verify that sticker values are written to the correct country and positions.
  - `Commons.unit.test.js`: Simplified section comments, removed obsolete tests after the `_buildCountryRecord` refactor, updated tests for the new method signature, and added coverage for additional public and private methods.
  - `ImportExportDialogHelpers.unit.test.js`: Updated tests for the new Export shared stickers service and added coverage for the new checkbox-based user inputs.
  - `QuickEntryService.unit.test.js`: Moved `initTestKernel` initialization into `beforeAll`.
  - `utils/testKernel.js` 
    - Removed unused globals from the test environment and removed `TEST_DATA` from `module.exports`.
    - Converted helper functions used only locally into internal functions.
    - Enhanced `MockStickerSheetRepository` to support the new getters used by `ImportExportService` and `StickerSheetRepository`.

- `doc` Folder:
  - `ImportExportServiceRequirements.md`: Added Export shared stickers service requirements. Standardized menu names, removed ambiguities, provided new definitions, such as sticker definition based on the sticker positions. Removed repeated sections, move all dialog requirements to User Interface requirements section. Standardize headers to group the information within the same top header section.
  - `FAQ.md`: Added a new question about exclusion operator.

- `package.json`: Moved the logic from `test:all` into `test`, ensuring the `build` task is always executed before running tests. Removed the `test:all` script.
- `eslintrc.js`: Override the rule `the-step-down-rule/the-step-down-rule` to turn it off for testing files.
- `.gitignore`: Added `.vscode/`
- `CHANGELOG.md`: Corrected the release date from previous release `1.0.3` from `2027-06-01` to `2026-05-29`. Included the Added section to release `1.0.2` with the new files added related to the testing process.

### Fixed

- `QuickEntryDialogRender.html`: Restored rendering of special sticker labels (`CREST` for sticker 1 and `TEAM` for sticker 13). Backend already provided `iconLabel`, but UI no longer rendered it due to missing badge injection in `buildStickerCard`.

- `CommonDialogStyles.html`: Updated `--border` color to `#c6cacc` to improve contrast and maintain visual consistency across sticker backgrounds.


## [1.0.3] 2026-06-02

### Overview
This release refactors and rebrand the `ImportExportService` to introduce a more flexible and resilient input parsing pipeline. The system now supports multiple input formats, exclusion operators (to handle missing stickers), improved repeat representations, and structured warnings to inform users about the interpretation and transformation of inputs. Additionally, a new named function `CLEAN_STICKER_LINE` in Google Sheet tracker has been added to support the `GET_TRADES` named function, which extracts the list of stickers from the `INPUT` section in the `Trade` tab. 


### Added
- No new files were introduced in this release.
- Existing modules were enhanced with improved parsing, normalization, and expanded test coverage.


### Changes

- Google Sheet tracker: added a named function `CLEAN_STICKER_LINE` to simplify the process of cleaning the sticker line. This function is used in the named function `GET_TRADES` within the `Trade` tab. Previously, the cleanup process was minimal. Now, instead of just cleaning, the function extracts unique stickers delimited by commas or semi-colons from a raw string input data that contains commas, semi-colons, spaces, repeats notations (`N(X)`, `NxX`, `N(xX)`), and additional noise. This allows users to paste a more flexible input data in the `Stickers` column in the `INPUT` section from the `Trade` tab and still receive the correct list of stickers to be used in the `OUTPUT` section.

- `build/build.js`:
  Refactored build logic to remove hardcoded file and class mappings. Export handling is now driven by `@export` annotations at the class level. This change applies to `*.gs` files. `*.html` export behavior remains unchanged, still relying on explicit function extraction. Reorganized to comply with the `the-step-down-rule` ESLint rule.

- `src/ImportExportService.gs`:
  Major refactor and rebranding of the service architecture:
  - Introduced `InputLineNormalize`, responsible for transforming raw user input into a canonical format.
  - Expanded normalization capabilities:
    - Range expansion (e.g. `A-B`, `A-B(N)`).
    - Removal of consecutive delimiters.
    - Support for semicolon (`;`) separated inputs.
    - Introduction of exclusion operators (`^`, `<>`, `!=`) to represent missing stickers explicitly.
    - Introduction of additional repeat formats such as `NxX`, `N(xX)`, `A-BxX`, `A-B(xX)`.
  - Simplified `StickerInputParser`, delegating most normalization responsibilities to `InputLineNormalize`.
  - Adjusted the service contract in `ImportExportService` to expose parsing warnings to the frontend, enabling user-facing feedback on input transformations.

- `src/html/ImportExportDialog.html`:
  - Import service:
    - Simplified import screen. Format details are now provided via a help icon modal, which opens a lightweight dialog containing the full format reference.
    - Includes all formats and exclusion operator documentation.
    - Includes documentation of the flexible parsing process.
    - Reports warnings to the user.
    - Out-of-range stickers, duplicates, and invalid entries are now reported as warnings and skipped.
    - Duplicate country lines (i.e. multiple lines for the same country) are now reported as warnings and the duplicate line is skipped.
  - Export service:
    - When no data is available to export, the placeholder message indicating an ongoing export process is no longer shown.

- `test/ImportExportService.unit.test.js`:
  Restructured and significantly expanded unit test coverage:
  - Introduced dedicated test sections for `InputLineNormalize` and `StickerInputParser`.
  - Transitioned from monolithic service-level testing to a more granular unit testing strategy.
  - Added a mocked Google Sheets environment to simulate realistic execution scenarios.
  - Improved coverage of import modes, export behavior, and sheet interaction contracts.

- `test/utils/testKernel.js`:
  Simplified and improved test infrastructure:
  - Removed redundant and overly complex mock definitions.
  - Introduced more focused and realistic mocks for Google Sheets interactions.
  - Improved determinism and isolation of test environments.
  - Reorganized to comply with the `the-step-down-rule` ESLint rule.

- `docs/ImportExportServiceRequirements.md`:
  Expanded specification documentation:
  - Added support for additional input formats.
  - Clarified warning semantics and parser behavior.
  - Improved error handling definitions and expected service contracts.
  - Standardized naming conventions and terminology.
  - Document fully aligned with the Import/Export service implementation.

- `.eslintrc.js`: Added  `sort-class-members`, `the-step-down-rule` plugins and the corresponding rules.
- `package.json`: Added convenient task: `lint:file` to run eslint on a specific file.
- `README.md`: Updated with the changes incorporated in this release.
-  Rest of the source files in `src/`, `test/`, `scripts/` updated comments or format, not structural changes. After changes ensured all 191 tests passed.
-  `CHANGELOG.md`: Corrected tne numbers of previous releases.


### Fixed
- Fixed incorrect handling of out-of-album stickers (`FWC-20`, non-`FWC-0`) across all import modes.
  Previously, such stickers were not populated as `0` values after import operations.
  The updated implementation ensures:
  - Valid stickers retain their parsed values.
  - Out-of-album stickers are consistently stored as `0`.
  - This process is silent and does not require user input.
  - Spreadsheet formulas remain consistent and unaffected when non-valid values are normalized to zero.

---

## [1.0.2] - 2026-05-29

### Overview
Refactored and extended the `ImportExportService` with a more flexible and resilient input parsing pipeline.
The system now supports multiple input formats and provides structured warnings to inform users about how inputs
were interpreted and transformed. Added a testing framework of the Apps script source code.

### Added
- Created the `test` folder.
- Created the `test/fixtures` folder.
- Created the `test/utils` folder.
- Created the `scripts` folder.
- Created the `build` folder for testing purposes. It contains a transformed copy of the source code ready to run under the `Node.js` framework. This folder is generated automatically, used only during testing, and ignored by `git`.
- Under the `test` folder:
  - `Commons.unit.test.js`: Tests for `src/Commons.gs`.
  - `ImportExportDialogHelpers.unit.test.js`: Tests for `src/ImportExportDialogHelpers.html`.
  - `ImportExportService.unit.test.js`: Tests for `src/ImportExportService.gs`.
  - `QuickEntryDialogHelpers.unit.test.js`: Tests for `src/QuickEntryDialogHelpers.html`.
  - `QuickEntryService.unit.test.js`: Tests for `src/QuickEntryService.gs`.
  - `fixtures/createValidRanges.js`: Creates a valid default named-range configuration for repository tests.
  - `utils/testKernel.js`: Global test kernel for GAS unit tests. Creates the mock objects and environment required by the test suite.

- Under the `scripts` folder:
  - `build/build.js`: Creates a testable copy of the `src` folder for execution under Jest.
    - Prepares the `build` folder as the source of files executed by Jest.
    - Converts `*.gs` files into `.js` files in the `build` folder and appends module exports for the classes under test.
    - Converts `*[Helpers|Render].html` files into `html.js` files in the `build` folder and appends module exports for the functions under test.

 - `clasp.zsh`: Zsh script that facilitates synchronization between the `src` folder and the Google Apps Script repository. Provides a controlled pull/push workflow using clasp while preserving the modular local `src/` architecture.
 
  - `fix-jsdoc.js`: Script that consolidates JSDoc comments into a single line when the content fits on one line.

- Under the root folder:
  - `jsconfig.json`: JavaScript project configuration file.
  - `package.json`: Node.js project configuration file (dependencies, scripts, automation tasks, etc.).
  - `.claspignore`: Files and folders excluded from clasp operations.
  - `.eslintignore`: Files and folders excluded from ESLint analysis.
  - `.eslintrc.js`: ESLint configuration file containing project-specific rules.
  - `.gitignore`: Files and folders excluded from version control.

### Changes
- `src/ImportExportService.gs`: Major refactor of the service architecture:
  - Introduced `InputLineNormalize`, responsible for transforming raw user input into canonical Format 1.
  - Expanded normalization capabilities: range expansion (`A-B`, `A-B(N)`), removal of consecutive delimiters,
    semicolon (`;`) support, and exclusion operators (`^`, `<>`, `!=`) to represent missing stickers.
  - Simplified `StickerInputParser`, delegating normalization to `InputLineNormalize`.
  - Updated service contract to expose parsing warnings to the front-end for user-facing feedback.
- `src/html/ImportExportDialog.html`:
  - Import: simplified the import screen; format details moved to a help icon modal (`ⓘ`) with the full
    format reference including all formats and the exclusion operator; warnings are now surfaced to the user;
    out-of-range stickers are reported as warnings and skipped instead of stopping the import.
  - Export: when there is no data to export the textarea placeholder is cleared so the empty state is
    unambiguous; the status message reports the line count.
- `docs/ImportExportServiceRequirements.md`: Expanded specification — additional input formats, clarified
  warning semantics and parser behavior, improved error handling definitions and service contracts.

### Fixed
- Incorrect handling of non-valid sticker positions (`FWC` sticker `20`, non-`FWC` sticker `0`) in all
  import modes (`Import data`, `Update counts`, `Update counts clearing country counts`). Non-valid positions
  are now always written as `0` when the row is touched. Valid stickers retain their parsed values, the
  operation is silent (no user action required), and spreadsheet formulas remain unaffected.
- Export Sticker service:
  - when users select to include icon flags (emojis) in the output a comma was added as a delimiter between the
flag icon and the country code. Fixed to match the specification: the delimiter is now a single space.
  - when user select to include icon flags in the output. When the output is a long line. For example, when the country code has many stickers and repeats, lines were not wrapped. Now fixed, long lines are wrapped.
- Import Service: parser failed to parse some scenarios with icon flag (emojis) as part of the syntax. Emojis are decorative elements not part of the data model in Apps Script, so they should be removed before parsing the country line. Now flag icon are excluding before any parsing process.
- Import Service: parser failed to parse some scenarios with icon flag (emojis) as part of the syntax. Emojis are decorative elements not part of the data model in Apps Script, so they should be removed before parsing the country line. Now flag icons are excluded before any parsing process.

---

## [1.0.1] - 2026-05-20

### Added
- `docs/FAQ.md` moved related questions to Google Access/Security for Apps Script
 
### Changes
- Modified Google Sheet tracker
  - `Conf` (hidden tab)
    - Removed the `TB_COUNTRY` table object because Apps Script doesn’t handle it properly. Instead, defined the columns that are referred to as named ranges.
    - Added flag icons, which are useful when sharing the information in text format. Associated a `FLAG_ICONS` named range.
  - `Stickers` tab now refers to the columns from the `Conf` tab.
  - `Report` tab added flag icons for each country.
  - `Compact Swap View` tab added flag icons for each country.
  - `Trade` tab
    - Added flag icons in the **INPUT** and **OUTPUT** sections.
    - The formulas used in the **OUTPUT** section clean the icons portions for the country before calculation.
    - Added a `Cnt` in the **OUTPUT** section for sending stickers, since it is required when there are more matches in the other direction.
    - The conditional formatting for the `Cnt` column now takes the minimum of both `TOTAL`.
    - Optionally allow the user to sort the output based on %-completion (prioritize complete teams first) or by Panini album order (easier to find the sticker).
    - Option to sort the output for Receive Stickers in the `OUTPUT` section.
  - The `GET_TRADE` named function doesn’t sort the input data anymore. Now, in the `Trade` tab, the user can sort the result. To find the match, there’s no need to sort the data; the sorting should come after the output.
- `Code.gs` The wrapper for calling import/export services now includes the information to enable or disable the display of flag icons in the export service.
- The `Commons.gs` module has removed the requirement that `COUNTRIES` and `COUNT` should be part of the same tab. 
- The `ImportExportService.gs` file now includes the logic for parsing sticker ranges, such as 1-4 and 1-(2). Additionally, it has been updated to optionally export flag icons and allow the import parser to skip flag icons.
- `ImportExportDialog.html` has been updated to include an icon flag. Added some specific examples, and updated the format specification and rules. For export services, a check box has been added to allow users to include flag icons before the country code in the output. Default flag icons are not exported.
- `QuickEntryDialog.html` now includes the front-end logic for the `Pending` filter.
- `docs/QuickEntryServiceRequirements.md` has been updated to include the requirement for the `Pending` filter.
- `docs/QuickEntryServiceMockDesign.md` has been updated to include the design of the `Pending` filter.
- `README.md` has been updated to document the input range in the import service and flag icons for input and export services, the Pending action in Quick Sticker Entry, and to move significant security/access information for Apps Script to the `FAQ.md` document.

### Fixed
- When an error is raised during the Import process, the program now provides the country code as a reference instead of a line number when the country code is valid. If the country code is invalid, the line number is referenced in the error message.
- The constraint that the `COUNTRIES` named range has to be defined in `Stickers` tab was removed because it was unnecessary.

---

## [1.0.0] - 2026-05-17

### Added
- Added the **Quick Sticker Entry** service with a visual dialog for updating sticker counts.
  - Added search by team code and country name in Quick Sticker Entry.
  - Added group filtering in Quick Sticker Entry.
  - Added sticker status filters in Quick Sticker Entry for `All`, `Missing`, and `Repeated`.
  - Added local pending-change tracking in Quick Sticker Entry before applying updates.
  - Added batch update behavior through the **Update** button in Quick Sticker Entry.
  - Added sticker-card indicators for pending changes in Quick Sticker Entry.
  - Added visual support for `CREST` and `TEAM` sticker labels in Quick Sticker Entry.
  - Added completion summary per team in Quick Sticker Entry.
- Added `docs/QuickEntryServiceRequirements.md`
- Added `docs/QuickEntryServiceMockDesign.md`
- Added `docs/GoogleAccessStepByStep.md` Steps to carry out to get a copy of the template and getting access to the services under Manage Panini menu
- Added the `appsscript.json` manifest file for the Apps Script project. It delimits the scope of Apps Script project associated with the template.
- Added `Commons.gs` common functionalities to be used by all services: Import, Export, Quick Entry.
- Added `ImportExportService.gs` specific functionalities related to Import/Export services.
- Added `QuickEntryService.gs` specific functionalities for Quick Sticker Entry service.
- Added `QuickEntryDialog.html` form for Quick Entry Service.
- Added `CHANGELOG.md`
- Added to the template file (Google Sheet)
  - Added `Conf` hidden tab to the template and moved the country code column from the `Stickers` tab to the `Conf` tab. The table `TB_COUNTRY` has country
    additional information required for the Apps Script project.
  - Added support for named ranges for the Quick Entry service:
  - `GROUPS`
  - `FLAGS_URL`
  - `COUNTRY_NAMES` 

### Changed
- Moved technical documentation and requirements documents into the `docs/` folder.
- Renamed and organized the import/export requirements documentation from the previous general requirements file into `docs/ImportExportServiceRequirements.md`.
- Updated `README.md` so the documentation goes by services and uses cases, before it was based on template tabs.
- Updated `README.md` to document the Quick Entry service.
- Updated `README.md` to document Apps Script authorization and the Google unverified app warning.
- Updated `README.md` to include references to official Google documentation.
- Updated `README.md` to clarify the hidden support column used by the Reports Pivot table.
- Updated `Requirements.md` renamed as: `doc/ImportExportServiceRequirements.md` and updated.
- Updated `Code.gs` to remove specific Import/Export functionalities and moved to `ImportExportService.gs` or to `Commons.gs`.
- Updated `ImportDialog.html` renamed as `ImportExportDialog.html` since it includes both services.
- Reorganized the files to separate responsibilities based on the service provided and to keep `Code.gs` for the menu options and wrappers.
- Changed in the template file (Google Sheet)
  - Now the `Conf` tab (`TB_COUNTRY`) is used to populate `Ctry`, `Flag`, and `Group` columns in `Stickers` tab.
  - Removed unnecessary hidden columns in `Stickers` tab: Country Code, kept only Group as hidden since it is required for the Pivot table in `Reports`.

### Existing in this release
- Stickers track
- Import and export service with preview support
- Trade comparison support
- Compact Swap view to facilitate sharing information with other collectors
- Reports and pivot-based progress summaries
- Compact swap view

### Fixed
- Fixed export behavior so only valid sticker positions are exported for each country code
