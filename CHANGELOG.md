# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and this project uses simple release-based entries focused on user-visible features, 
project structure, and documentation.

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

## Fixed
- Fixed export behavior so only valid sticker positions are exported for each country code
