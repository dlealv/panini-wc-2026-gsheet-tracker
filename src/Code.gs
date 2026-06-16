/** @OnlyCurrentDoc */

//src/Code.gs

/**
 * Entry points for spreadsheet menus, dialogs, and Apps Script
 * callbacks used by the Import, Export, and Quick Entry services.
 */

/** Builds the custom spreadsheet menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Manage Panini')
    .addItem('Open import dialog', 'showImportDialog')
    .addItem('Import data', 'showImportDialogCleanAll')
    .addItem('Update counts clearing country counts', 'showImportDialogReplaceCountries')
    .addItem('Update counts', 'showImportDialogUpdate')
    .addSeparator()
    .addItem('Export all stickers', 'showExportAllDialog')
    .addItem('Export shared stickers', 'showExportSharedDialog')
    .addSeparator()
    .addItem('Quick sticker entry', 'showQuickStickerEntryDialog')
    .addToUi()
}

// #region Import
//==============================================================================
// Import Dialog
//==============================================================================


/** Opens the import dialog. */
function showImportDialog() {
  _showImportDialog('update')
}

/** Opens the import dialog in clean-all mode. */
function showImportDialogCleanAll() {
  _showImportDialog('clean_all')
}

/** Opens the import dialog in replace-countries mode. */
function showImportDialogReplaceCountries() {
  _showImportDialog('replace_countries')
}

/** Opens the import dialog in update mode. */
function showImportDialogUpdate() {
  _showImportDialog('update')
}

/** Returns a preview of import data without writing to the sheet. */
function previewStickerData(payload) {
  const app = new ImportService()
  return app.preview(payload && payload.text ? payload.text : '')
}

/** Imports sticker data into the sheet using the selected mode. */
function importStickerData(payload) {
  const app = new ImportService()
  return app.import(payload && payload.text ? payload.text
    : '', payload && payload.mode ? payload.mode : 'update')
}

/** Opens the import dialog with the provided mode configuration. */
function _showImportDialog(defaultMode) {
  const template = HtmlService.createTemplateFromFile('ImportDialog')
  template.defaultMode = defaultMode || 'update'
  const html = template.evaluate().setWidth(760).setHeight(760)
  SpreadsheetApp.getUi().showModalDialog(html, 'Import sticker counts')
}


// #endregion Import

// #region Export
//==============================================================================
// Export Dialog
//==============================================================================

/** Opens the export-all dialog. */
function showExportAllDialog() {
  _showExportDialog('export_all')
}

/** Opens the export-shared dialog. */
function showExportSharedDialog() {
  _showExportDialog('export_shared')
}

/** Exports all sticker data from the sheet. */
function exportAllStickerData(payload) {
  const service = new ExportService()
  return service.exportAllStickerData(payload)
}

/** Exports shared sticker data from the sheet. */
function exportSharedStickerData(payload) {
  const service = new ExportService()
  return service.exportSharedStickerData(payload)
}

/** Opens the export dialog with the provided mode configuration. */
function _showExportDialog(dialogMode) {
  const template = HtmlService.createTemplateFromFile('ExportDialog')
  template.dialogMode = dialogMode
  const html = template.evaluate().setWidth(760).setHeight(760)

  SpreadsheetApp.getUi().showModalDialog(html, dialogMode === 'export_shared'
    ? 'Export shared stickers' : 'Export all stickers')
}

// #endregion Export

// #region QuickEntry
//==============================================================================
// Quick Entry Dialog
//==============================================================================


/** Opens the Quick Sticker Entry dialog. */
function showQuickStickerEntryDialog() {
  const html = HtmlService.createTemplateFromFile('QuickEntryDialog')
    .evaluate()
    .setWidth(900)
    .setHeight(760)

  SpreadsheetApp.getUi().showModalDialog(html, 'Quick Sticker Entry')
}

/** Returns the initial Quick Sticker Entry payload. */
function getQuickEntryInitialData() {
  const service = new QuickEntryService()
  return service.getInitialData()
}

/** Applies Quick Entry changes to the Stickers sheet. */
function applyQuickEntryUpdates(payload) {
  const service = new QuickEntryService()
  const pendingUpdates = payload && payload.pendingUpdates ? payload.pendingUpdates : []
  return service.applyPendingUpdates(pendingUpdates)
}

// #endregion QuickEntry


//==============================================================================
// Helper
//==============================================================================

/**
 * Includes HTML partials inside templates.
 * Used by: <?!= include('FileName') ?>
 */
function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}
