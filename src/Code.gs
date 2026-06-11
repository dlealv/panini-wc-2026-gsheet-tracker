/** @OnlyCurrentDoc */

//src/Code.gs (pull final test)

/**
 * Provides shared spreadsheet access, named range validation, and common lookup utilities.
 * This file centralizes reusable data access for import/export and Quick Entry flows.
 */

/** Builds the custom spreadsheet menu. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Manage Panini')
    .addItem('Open import dialog', 'showImportExportDialog')
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

/** Opens the export-all dialog. */
function showExportAllDialog() {
  showImportExportDialog_('export_all', 'update')
}

/** Opens the export-shared dialog. */
function showExportSharedDialog() {
  showImportExportDialog_('export_shared', 'update')
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

  const titles = {
    import: 'Import sticker counts',
    export_all: 'Export all stickers',
    export_shared: 'Export shared stickers'
  }

  SpreadsheetApp.getUi().showModalDialog(
    html,
    titles[dialogMode] || 'Manage Panini'
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

/** Exports all sticker data from the sheet. */
function exportAllStickerData(payload) {
  return ImportExportService.exportStickerData(payload)
}

/** Exports shared sticker data from the sheet. */
function exportSharedStickerData(payload) {
  return ImportExportService.exportSharedStickerData(payload)
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

/**
 * Includes HTML partials inside templates.
 * Used by: <?!= include('FileName') ?>
 */
function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}
