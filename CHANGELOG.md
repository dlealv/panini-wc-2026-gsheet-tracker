# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and this project uses simple release-based entries focused on user-visible features, 
project structure, and documentation.

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
