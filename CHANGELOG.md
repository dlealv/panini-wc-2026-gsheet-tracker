# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and this project uses simple release-based entries focused on user-visible features, 
project structure, and documentation.

## [1.0.3] 2026-06-02

### Overview
This release refactors and rebrands the `ImportExportService` to introduce a more flexible and resilient input parsing pipeline. The system now supports multiple input formats, exclusion operators (to enter missing stickers instead), improved repeat representations, and structured warnings to inform users about how inputs were interpreted and transformed.

---

### Added
- No new files were introduced in this release.
- Existing modules were enhanced with improved parsing, normalization, and expanded test coverage.

---

### Changes

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

- `.eslintrc.js`: Added  `sort-class-members`, `the-step-down-rule` pugins and the corresponding rules.
- `package.json`: Added convinient task: `lint:file` to run eslint on a specific file.
- `README.md`: Updated with the changes incorporated in this release.
-  Rest of the source files in `src/`, `test/`, `scripts/` updated comments or format, not structural changes. After changes ensured all 189 tests passed.

---

### Fixed
- Fixed incorrect handling of out-of-album stickers (`FWC-20`, non-`FWC-0`) across all import modes.
  Previously, such stickers were not populated as `0` values after import operations.
  The updated implementation ensures:
  - Valid stickers retain their parsed values.
  - Out-of-album stickers are consistently stored as `0`.
  - This process is silent and does not require user input.
  - Spreadsheet formulas remain consistent and unaffected when non-valid values are normalized to zero.

---

## [1.0.2] - 2026-06-01

### Overview
Refactored and extended the `ImportExportService` with a more flexible and resilient input parsing pipeline.
The system now supports multiple input formats and provides structured warnings to inform users about how inputs
were interpreted and transformed.

### Changes
- `build/build.js`: Removed hardcoded file and class mappings. Export handling is now driven by `@export`
  annotations at the class level. This change applies to `*.gs` files; `*.html` export behaviour remains
  unchanged, still relying on explicit function extraction.
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
- `test/ImportExportService.unit.test.js`: Restructured and significantly expanded unit test coverage:
  - Dedicated test sections for `InputLineNormalize`, `StickerInputParser`, and `ImportExportService`.
  - Transitioned from monolithic service-only testing to granular unit testing.
  - Added mocked Google Sheets environment for realistic execution scenarios.
  - Improved coverage of import modes, export behaviour, sheet interaction contracts, and warning aggregation.
- `test/utils/testKernel.js`: Simplified test infrastructure; removed redundant mock definitions; introduced
  more focused and realistic mocks for Google Sheets interactions.
- `docs/ImportExportServiceRequirements.md`: Expanded specification — additional input formats, clarified
  warning semantics and parser behaviour, improved error handling definitions and service contracts.

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
