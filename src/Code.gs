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
    .addItem('Update counts', 'showImportDialogUpdate')
    .addItem('Update counts clearing country counts', 'showImportDialogReplaceCountries')
    .addItem('Import data', 'showImportDialogCleanAll')
    .addSeparator()
    .addItem('Export all stickers', 'showExportAllDialog')
    .addItem('Export shared stickers', 'showExportSharedDialog')
    .addSeparator()
    .addItem('Quick sticker entry', 'showQuickStickerEntryDialog')
    .addSeparator()
    .addItem('Trade stickers', 'showTradeDialog')
    .addSeparator()
    .addItem('Mobile Web app link', 'showWebAppLink')
    .addSeparator()
    .addItem('About', 'showAboutDialog')
    .addToUi()
}

/** Builds JSON text response for scanner integration. */
function createJsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

// #region Import

// IMPORT SERVICE ENTRY POINTS

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

/**
 * Returns a preview of import data without writing to the sheet.
 * @see ImportService#preview for the payload/return shape and examples.
 */
function previewStickerData(payload) {
  const app = new ImportService()
  return app.preview(payload && payload.text ? payload.text : '')
}

/**
 * Imports sticker data into the sheet using the selected mode.
 * @see ImportService#import for the payload/return shape and examples.
 */
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

// EXPORT SERVICE ENTRY POINTS

/** Opens the export-all dialog. */
function showExportAllDialog() {
  _showExportDialog('export_all')
}

/** Opens the export-shared dialog. */
function showExportSharedDialog() {
  _showExportDialog('export_shared')
}

/**
 * Exports all sticker data from the sheet.
 * @see ExportService#exportAllStickerData for the payload/return shape and examples.
 */
function exportAllStickerData(payload) {
  const service = new ExportService()
  return service.exportAllStickerData(payload)
}

/**
 * Exports shared sticker data from the sheet.
 * @see ExportService#exportSharedStickerData for the payload/return shape and examples.
 */
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

// QUICK ENTRY SERVICE ENTRY POINTS

/** Opens the Quick Sticker Entry dialog. */
function showQuickStickerEntryDialog() {
  const html = HtmlService.createTemplateFromFile('QuickEntryDialog')
    .evaluate()
    .setWidth(900)
    .setHeight(760)

  SpreadsheetApp.getUi().showModalDialog(html, 'Quick Sticker Entry')
}

/**
 * Returns the initial Quick Sticker Entry payload.
 * @see QuickEntryService#getInitialData for the return shape and examples.
 */
function getQuickEntryInitialData() {
  const service = new QuickEntryService()
  return service.getInitialData()
}

/**
 * Applies Quick Entry changes to the Stickers sheet.
 * @see QuickEntryService#applyPendingUpdates for the payload/return shape and examples.
 */
function applyQuickEntryUpdates(payload) {
  const service = new QuickEntryService()
  const pendingUpdates = payload && payload.pendingUpdates ? payload.pendingUpdates : []
  return service.applyPendingUpdates(pendingUpdates)
}

// #endregion QuickEntry

// #region Trade

// TRADE SERVICE ENTRY POINTS

/** Opens the Trade dialog. */
function showTradeDialog() {
  _showTradeDialog('desktop')
}

/**
 * Returns a preview of another collector's trade information.
 * @see TradeService.previewOtherStickerTradeInfo for the payload/return shape and examples.
 */
function previewOtherTradeInfo(payload) {
  return TradeService.previewOtherStickerTradeInfo(payload || {})
}

/**
 * Returns a preview of another collector's trade information from QR image data.
 * @see TradeService.previewOtherStickerTradeInfoFromQr for the payload/return shape and examples.
 */
function previewOtherTradeInfoFromQr(payload) {
  return TradeService.previewOtherStickerTradeInfoFromQr(payload || {})
}

/**
 * Generates the current collector QR payload.
 * @see TradeService.generateStickerTradeInfoQr for the return shape and examples.
 */
function generateTradeInfoQr() {
  return TradeService.generateStickerTradeInfoQr()
}

/**
 * Finds all possible trade matches with another collector.
 * @see TradeService.findStickerTradeMatches for the payload/return shape and examples.
 */
function findTradeMatches(payload) {
  return TradeService.findStickerTradeMatches(payload)
}

/**
 * Applies the confirmed trade.
 * @see TradeService.executeStickerTrades for the payload shape and examples.
 */
function executeTrade(payload) {
  return TradeService.executeStickerTrades(payload)
}

/** Opens the Trade dialog with the provided platform configuration. */
function _showTradeDialog(platform) {
  const template = HtmlService.createTemplateFromFile('TradeDialog')
  template.platform = platform || 'desktop'
  const html = template.evaluate().setWidth(760).setHeight(760)

  SpreadsheetApp.getUi().showModalDialog(html, 'Trade stickers')
}

// #endregion Trade

// #region Mobile

// MOBILE SERVICE ENTRY POINTS

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
function doGet(e) {
  const ss = _getMobileSpreadsheet()
  const deploymentUrl = ScriptApp.getService().getUrl()
  if (deploymentUrl && deploymentUrl.includes('/exec')) {
    PropertiesService.getScriptProperties().setProperty('WEB_APP_URL', deploymentUrl)
  }
  if (!ss) {
    return HtmlService.createHtmlOutput(
      '<html><body style="font-family:Arial,sans-serif;padding:20px;">' +
      '<p style="color:#c5221f;">Mobile web app is not configured yet. Open spreadsheet first.</p>' +
      '</body></html>'
    )
  }
  const template = HtmlService.createTemplateFromFile('MobileHome')
  template.spreadsheetTitle = ss.getName()
  return template.evaluate()
}

/**
 * Mobile-context wrapper for import preview.
 * Resolves the bound spreadsheet via script properties instead of
 * getActiveSpreadsheet(), which returns null in web app call context.
 * @see ImportService#preview for the payload/return shape and examples.
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
 * @see ImportService#import for the payload/return shape and examples.
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
function showWebAppLink() {
  const webAppUrl = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL') || ''
  const template = HtmlService.createTemplateFromFile('WebAppLinkDialog')
  template.webAppUrl = webAppUrl
  template.isDeployed = Boolean(webAppUrl)
  //template.isDeployed = false // 🔥 TEMP: force false to test the "not deployed" message
  const height = template.isDeployed ? 200 : 280
  SpreadsheetApp.getUi().showModalDialog(
    template.evaluate().
      setWidth(500)
      .setHeight(height),
    'Mobile Web App Link'
  )
}

/**
 * Mobile-context wrapper for exporting all stickers.
 * Uses spreadsheet resolved from script properties for web app context safety.
 * @see ExportService#exportAllStickerData for the payload/return shape and examples.
 */
function exportAllStickerDataMobile(payload) {
  const ss = _getMobileSpreadsheet()
  const service = new ExportService(ss)
  return service.exportAllStickerData(payload)
}

/**
 * Mobile-context wrapper for exporting shared stickers.
 * Uses spreadsheet resolved from script properties for web app context safety.
 * @see ExportService#exportSharedStickerData for the payload/return shape and examples.
 */
function exportSharedStickerDataMobile(payload) {
  const ss = _getMobileSpreadsheet()
  const service = new ExportService(ss)
  return service.exportSharedStickerData(payload)
}

/**
 * Mobile-context wrapper for Quick Entry initial data.
 * Uses spreadsheet resolved from script properties for web app context safety.
 * @see QuickEntryService#getInitialData for the return shape and examples.
 */
function getQuickEntryInitialDataMobile() {
  const ss = _getMobileSpreadsheet()
  const service = new QuickEntryService(ss)
  return service.getInitialData()
}

/**
 * Mobile-context wrapper for Quick Entry updates.
 * Uses spreadsheet resolved from script properties for web app context safety.
 * @see QuickEntryService#applyPendingUpdates for the payload/return shape and examples.
 */
function applyQuickEntryUpdatesMobile(payload) {
  const ss = _getMobileSpreadsheet()
  const service = new QuickEntryService(ss)
  const pendingUpdates = payload && payload.pendingUpdates ? payload.pendingUpdates : []
  return service.applyPendingUpdates(pendingUpdates)
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
    //return null
    Logger.log("OPEN by ID FAILED: " + e.message)
    throw e  // 🔥 IMPORTANT: do NOT hide it
  }
}

// #endregion Mobile


// #region About

// ABOUT SERVICE ENTRY POINTS

/** Opens the About dialog. */
function showAboutDialog() {
  const html = HtmlService
    .createTemplateFromFile('AboutDialog')
    .evaluate()
    .setWidth(465)
    .setHeight(200)

  SpreadsheetApp.getUi().showModalDialog(html, 'About')
}

// #endregion About


// Helpers

/** Includes an HTML partial and evaluates any template code it contains. */
function include(filename) {
  return HtmlService
    .createTemplateFromFile(filename)
    .evaluate()
    .getContent();
}
