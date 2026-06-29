/** @OnlyCurrentDoc */

//src/Code.gs

/**
 * Entry points for spreadsheet menus, dialogs, and Apps Script
 * callbacks used by the Import, Export, and Quick Entry services.
 */

/** Builds the custom spreadsheet menu. */
function onOpen() {
  _saveMobileConfig()
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
    .addSeparator()
    .addItem('Mobile web app link', 'showMobileLink')
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


// #region Mobile
//==============================================================================
// Mobile Web App
//==============================================================================

/**
 * GAS web app entry point — serves the mobile import page in a browser.
 *
 * Spike 1 verification: the page displays the spreadsheet title, confirming that
 * the web app context can resolve the bound spreadsheet via script properties.
 *
 * When the script properties have not been seeded yet (i.e. the user has never
 * opened the spreadsheet and triggered onOpen), a self-contained error page is
 * returned with instructions for the user.
 */
function doGet() {
  const ss = _getMobileSpreadsheet()
  if (!ss) {
    return HtmlService
      .createHtmlOutput(
        '<html><body style="font-family:Arial,sans-serif;padding:20px;">' +
        '<p style="color:#c5221f;">Mobile web app is not configured yet. ' +
        'Open your spreadsheet first — the Manage Panini menu will set it up automatically.' +
        '</p></body></html>'
      )
      .setTitle('Panini Tracker — Setup Required')
  }
  const template = HtmlService.createTemplateFromFile('MobileWebApp')
  template.spreadsheetTitle = ss.getName()
  return template.evaluate().setTitle('Panini Tracker — Mobile Import')
}

/**
 * Mobile-context wrapper for import preview.
 * Resolves the bound spreadsheet via script properties instead of
 * getActiveSpreadsheet(), which returns null in web app call context.
 * @param {Object} payload - Import payload with text and optional mode fields.
 * @returns {{ success: boolean, warnings: string[], countries: Object[] }}
 */
function previewStickerDataMobile(payload) {
  const ss = _getMobileSpreadsheet()
  const app = new ImportService(ss)
  return app.preview(payload && payload.text ? payload.text : '')
}

/**
 * Mobile-context wrapper for import execution.
 * Resolves the bound spreadsheet via script properties instead of
 * getActiveSpreadsheet(), which returns null in web app call context.
 * @param {Object} payload - Import payload with text and mode fields.
 * @returns {{ success: boolean, warnings: string[], message: string }}
 */
function importStickerDataMobile(payload) {
  const ss = _getMobileSpreadsheet()
  const app = new ImportService(ss)
  return app.import(
    payload && payload.text ? payload.text : '',
    payload && payload.mode ? payload.mode : 'update'
  )
}

/** Opens a dialog showing the mobile web app URL so the user can copy and bookmark it. */
function showMobileLink() {
  let webAppUrl = ''
  try {
    const scriptService = ScriptApp.getService()
    webAppUrl = scriptService ? scriptService.getUrl() : ''
  } catch (e) {
    webAppUrl = ''
  }
  const template = HtmlService.createTemplateFromFile('MobileLinkDialog')
  template.webAppUrl = webAppUrl
  template.isDeployed = Boolean(webAppUrl)
  const html = template.evaluate().setWidth(500).setHeight(240)
  SpreadsheetApp.getUi().showModalDialog(html, 'Mobile Web App Link')
}

/** Persists the active spreadsheet ID in script properties for use by the web app. */
function _saveMobileConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (ss) {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId())
  }
}

/**
 * Returns the spreadsheet bound to this script by reading its ID from script
 * properties (seeded by _saveMobileConfig during onOpen).
 * Using openById instead of getActiveSpreadsheet is required in web app context.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
 */
function _getMobileSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) { return null }
  try {
    return SpreadsheetApp.openById(id)
  } catch (e) {
    return null
  }
}

// #endregion Mobile


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
