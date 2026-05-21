/** @OnlyCurrentDoc */

/**
 * Provides shared spreadsheet access, named range validation, and common lookup utilities.
 * This file centralizes reusable data access for import/export and Quick Entry flows.
 */

/** Builds the custom spreadsheet menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Manage Panini')
    .addItem('Open Import / Export Dialog', 'showImportExportDialog')
    .addSeparator()
    .addItem('Import data', 'showImportDialogCleanAll')
    .addItem('Update counts clearing country counts', 'showImportDialogReplaceCountries')
    .addItem('Update counts', 'showImportDialogUpdate')
    .addSeparator()
    .addItem('Export Stickers', 'showExportDialog')
    .addSeparator()
    .addItem('Quick Sticker Entry', 'showQuickStickerEntryDialog')
    .addToUi()
}

/** Opens the import/export dialog in import mode clearing all counts first. */
function showImportDialogCleanAll() {
  showImportExportDialog_('import', 'clean_all')
}

/** Opens the import/export dialog in import mode clearing imported countries first. */
function showImportDialogReplaceCountries() {
  showImportExportDialog_('import', 'replace_countries')
}

/** Opens the import/export dialog in import mode updating only provided stickers. */
function showImportDialogUpdate() {
  showImportExportDialog_('import', 'update')
}

/** Opens the import/export dialog in default import mode. */
function showImportExportDialog() {
  showImportExportDialog_('import', 'update')
}

/** Opens the import/export dialog in export mode. */
function showExportDialog() {
  showImportExportDialog_('export', 'update')
}

/** Opens the import/export dialog with the provided mode configuration. */
function showImportExportDialog_(dialogMode, defaultMode) {
  const template = HtmlService.createTemplateFromFile('ImportExportDialog')
  template.dialogMode = dialogMode || 'import'
  template.defaultMode = defaultMode || 'update'

  const html = template
    .evaluate()
    .setWidth(760)
    .setHeight(760)

  SpreadsheetApp.getUi().showModalDialog(
    html,
    dialogMode === 'export' ? 'Export Stickers' : 'Import sticker counts'
  )
}

/** Returns a preview of import data without writing to the sheet. */
function previewStickerData(payload) {
  const app = new ImportExportService()
  return app.preview(payload && payload.text ? payload.text : '')
}

/** Imports sticker data into the sheet using the selected mode. */
function importStickerData(payload) {
  const app = new ImportExportService()
  return app.import(
    payload && payload.text ? payload.text : '',
    payload && payload.mode ? payload.mode : 'update'
  )
}

/** Exports sticker data from the sheet. */
function exportStickerData(payload) {
  const app = new ImportExportService()
  return app.exportData(payload && payload.includeFlags)
}

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
