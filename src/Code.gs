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
 * Returns a preview of import data without writing to the sheet. Resolves the spreadsheet via _getSpreadsheet() 
 * so this entry point works from both the desktop dialog and the mobile web app.
 * @see ImportService#preview for the payload/return shape and examples.
 */
function previewStickerData(payload) {
  const ss = _getSpreadsheet()
  const app = new ImportService(ss)
  return app.preview(payload && payload.text ? payload.text : '')
}

/**
 * Imports sticker data into the sheet using the selected mode. Resolves the spreadsheet via _getSpreadsheet() 
 * so this entry point works from both the desktop dialog and the mobile web app.
 * @see ImportService#import for the payload/return shape and examples.
 */
function importStickerData(payload) {
  const ss = _getSpreadsheet()
  const app = new ImportService(ss)
  return _withWriteLock(() => app.import(payload && payload.text ? payload.text
    : '', payload && payload.mode ? payload.mode : 'update'))
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
 * Exports all sticker data from the sheet. Resolves the spreadsheet via _getSpreadsheet() so this entry point
 * works from both the desktop dialog and the mobile web app.
 * @see ExportService#exportAllStickerData for the payload/return shape and examples.
 */
function exportAllStickerData(payload) {
  const ss = _getSpreadsheet()
  const service = new ExportService(ss)
  return service.exportAllStickerData(payload)
}

/**
 * Exports shared sticker data from the sheet. Resolves the spreadsheet via _getSpreadsheet() so this entry point
 * works from both the desktop dialog and the mobile web app.
 * @see ExportService#exportSharedStickerData for the payload/return shape and examples.
 */
function exportSharedStickerData(payload) {
  const ss = _getSpreadsheet()
  const service = new ExportService(ss)
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
  const html = HtmlService.createTemplateFromFile('QuickEntryDialog').evaluate().setWidth(900).setHeight(760)
  SpreadsheetApp.getUi().showModalDialog(html, 'Quick Sticker Entry')
}

/**
 * Returns the initial Quick Sticker Entry payload. Resolves the spreadsheet via _getSpreadsheet() so this entry point
 * works from both the desktop dialog and the mobile web app.
 * @see QuickEntryService#getInitialData for the return shape and examples.
 */
function getQuickEntryInitialData() {
  const ss = _getSpreadsheet()
  const service = new QuickEntryService(ss)
  return service.getInitialData()
}

/**
 * Applies Quick Entry changes to the Stickers sheet. Resolves the spreadsheet via _getSpreadsheet() so this entry point
 * works from both the desktop dialog and the mobile web app.
 * @see QuickEntryService#applyPendingUpdates for the payload/return shape and examples.
 */
function applyQuickEntryUpdates(payload) {
  const ss = _getSpreadsheet()
  const service = new QuickEntryService(ss)
  const pendingUpdates = payload && payload.pendingUpdates ? payload.pendingUpdates : []
  return _withWriteLock(() => service.applyPendingUpdates(pendingUpdates))
}

// #endregion QuickEntry

// #region Trade

// TRADE SERVICE ENTRY POINTS

/**
 * NOTE: tradeInfo/receive/send below are JSON.stringify'd before returning, and the client JSON.parses them
 * back. Plain-object key order is not guaranteed to survive the automatic google.script.run marshalling between
 * the server and the sandboxed client iframe - confirmed by direct testing (removing the stringify/parse round
 * trip scrambled country key order even though country codes are ordinary string keys, not the well-known
 * numeric-string-key reordering case). tradeInfo/receive/send are all objects keyed by country code whose key
 * order is read directly by the UI (Object.keys() drives display order in TradeHelpers.html's _formatMatches(),
 * and the default 'album' sort mode trusts the incoming key order as-is), so losing it would scramble countries
 * into a meaningless order. Kept here at the wire boundary (Code.gs) rather than in TradeService.gs's instance
 * methods, so the tested business logic layer stays free of transport concerns.
 *
 * doneMap and tradePreferences are deliberately NOT stringified, for two different reasons:
 *  - doneMap is a plain object too (keyed by country code), but the client only ever reads it via
 *    doneMap[countryCode] lookups (TradeHelpers.html's _sortMatchesByCompletion()) - it never iterates doneMap's
 *    own key order - so the ordering risk above doesn't matter for it.
 *  - tradePreferences is a genuine Array, not a keyed object. Array order is positional, not key-based, so it
 *    isn't exposed to the object-key-ordering risk above and crosses the google.script.run boundary intact either
 *    way (also confirmed by direct testing). It IS read in order downstream (TradeHelpers.html's
 *    _buildPreferenceRules() uses the array index) - it just doesn't need stringify to get there safely.
 */

/** Opens the Trade dialog. */
function showTradeDialog() {
  _showTradeDialog('desktop')
}

/**
 * Returns a preview of another collector's trade information. Resolves the spreadsheet via _getSpreadsheet() 
 * so this entry point works from both the desktop dialog and the mobile web app.
 * @see TradeService#previewOtherTradeInfo for the payload shape and examples.
 */
function previewOtherTradeInfo(payload) {
  const ss = _getSpreadsheet()
  const service = new TradeService(ss)
  const result = service.previewOtherTradeInfo(payload || {})
  result.tradeInfo = JSON.stringify(result.tradeInfo)
  return result
}

/**
 * Returns a preview of another collector's trade information from QR image data. Resolves the spreadsheet via 
 * _getSpreadsheet() so this entry point works from both the desktop dialog and the mobile web app.
 * @see TradeService#previewOtherTradeInfoFromQr for the payload shape and examples.
 */
function previewOtherTradeInfoFromQr(payload) {
  const ss = _getSpreadsheet()
  const service = new TradeService(ss)
  const result = service.previewOtherTradeInfoFromQr(payload || {})
  result.tradeInfo = JSON.stringify(result.tradeInfo)
  return result
}

/**
 * Generates the current collector QR payload. Resolves the spreadsheet via _getSpreadsheet() so this entry point
 * works from both the desktop dialog and the mobile web app.
 * @see TradeService#generateTradeInfoQr for the return shape and examples.
 */
function generateTradeInfoQr() {
  const ss = _getSpreadsheet()
  const service = new TradeService(ss)
  const result = service.generateTradeInfoQr()
  result.tradeInfo = JSON.stringify(result.tradeInfo)
  return result
}

/**
 * Finds all possible trade matches with another collector. Resolves the spreadsheet via _getSpreadsheet() 
 * so this entry pointworks from both the desktop dialog and the mobile web app.
 * Validates and stores the external collector's trade information before delegating the calculation to 
 * TradeService#findTradeMatches, which keeps a no-arg signature since it operates on state set 
 * via setOtherTradeInfo().
 * @see TradeService#findTradeMatches for the return shape and examples.
 */
function findTradeMatches(payload) {
  const ss = _getSpreadsheet()
  const service = new TradeService(ss)
  if (!payload || !payload.otherTradeInfo) {
    throw new Error('External collector information is required.')
  }
  service.setOtherTradeInfo(payload.otherTradeInfo)
  const matches = service.findTradeMatches()
  return {
    // receive/send are keyed by country code and their key order drives the UI's display/album-sort order -
    // see the NOTE above the Trade entry points.
    receive: JSON.stringify(matches.receive),
    send: JSON.stringify(matches.send),
    // doneMap is only ever read by key (doneMap[countryCode]) on the client - its own key order is never used,
    // so it's returned as-is rather than JSON.stringify'd. See the NOTE above the Trade entry points.
    doneMap: matches.doneMap,
    // tradePreferences is an Array - order is positional, not key-based, so it survives the google.script.run
    // boundary intact without stringify. See the NOTE above the Trade entry points.
    tradePreferences: matches.tradePreferences
  }
}

/**
 * Applies the confirmed trade. Resolves the spreadsheet via _getSpreadsheet() so this entry point
 * works from both the desktop dialog and the mobile web app.
 * @see TradeService#executeTrade for the payload shape and examples.
 */
function executeTrade(payload) {
  const ss = _getSpreadsheet()
  const service = new TradeService(ss)
  return _withWriteLock(() => service.executeTrade(payload))
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
 * GAS web app entry point — serves the mobile import page in a browser. When the script properties have not 
 * been seeded yet (i.e. the user has never opened the spreadsheet and triggered onOpen), a self-contained 
 * error page is returned with instructions for the user.
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

/** Opens a dialog showing the mobile web app URL so the user can copy and bookmark it. */
function showWebAppLink() {
  const webAppUrl = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL') || ''
  const template = HtmlService.createTemplateFromFile('WebAppLinkDialog')
  template.webAppUrl = webAppUrl
  template.isDeployed = Boolean(webAppUrl)
  //template.isDeployed = false // 🔥 TEMP: force false to test the "not deployed" message
  const height = template.isDeployed ? 200 : 280
  SpreadsheetApp.getUi().showModalDialog(template.evaluate().setWidth(500).setHeight(height), 'Mobile Web App Link')
}

/** Persists the active spreadsheet ID in script properties for use by the web app. */
function _saveMobileConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (ss) {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId())
  }
}

/**
 * Resolves the spreadsheet to operate on for entry points shared between the desktop dialog and the mobile web app.
 * Not platform-specific itself: it tries the active-spreadsheet path first, which works from a dialog, menu,
 * sidebar, or trigger context, and only defers to the mobile-specific lookup below when that path isn't available.
 * Tested directly rather than through a public entry point - see the note on _withWriteLock() below, which
 * applies here too: none of this file's entry points are themselves exported/tested, so there is no tested
 * public caller to route through.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
 * @export
 */
function _getSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet()
    if (active) { return active }
  } catch (e) {
    // getActiveSpreadsheet() is documented as unavailable when a bound script
    // runs as a web app - fall through to the mobile-specific lookup below.
  }
  return _getMobileSpreadsheet()
}

/**
 * Returns the spreadsheet bound to this script by reading its ID from script properties (seeded by
 * _saveMobileConfig during onOpen). This is the mobile web app path: used as the fallback
 * when getActiveSpreadsheet() isn't available, i.e. we're running under the web app rather than a dialog.
 * Tested directly - see the note on _withWriteLock() below; the re-throw here (rather than swallowing the
 * error) is deliberate and is exactly the kind of behavior a test protects against an accidental future
 * "simplification."
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
 * @export
 */
function _getMobileSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) { return null }
  try {
    return SpreadsheetApp.openById(id)
  } catch (e) {
    Logger.log("OPEN by ID FAILED: " + e.message)
    throw e  // 🔥 IMPORTANT: do NOT hide it
  }
}

// #endregion Mobile

// #region Concurrency

/**
 * Runs fn() while holding the script-wide lock, so two overlapping writes to COUNTS - e.g. the desktop dialog
 * and the mobile web app open at the same time, or the same spreadsheet open in two browser tabs - can't race
 * and silently drop one side's update. Used by every entry point that ends up calling
 * StickerSheetRepository#updateStickerCounts (importStickerData, applyQuickEntryUpdates, executeTrade).
 * Read-only entry points (previews, exports) don't call this, since they don't write to COUNTS.
 * Tested directly rather than through a public entry point: this file's actual entry points
 * (importStickerData, applyQuickEntryUpdates, executeTrade, etc.) are thin wrappers with no exported/tested
 * contract of their own, so there is no tested public caller to route a test through. _getSpreadsheet() and
 * _getMobileSpreadsheet() below are direct-tested for the same reason.
 * @param {function(): *} fn - The write operation to run under the lock.
 * @returns {*} Whatever fn() returns.
 * @export
 */
function _withWriteLock(fn) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) {
    throw new Error('Another update is in progress on this spreadsheet. Please try again in a moment.')
  }
  try {
    return fn()
  } finally {
    lock.releaseLock()
  }
}

// #endregion Concurrency

// #region About

// ABOUT SERVICE ENTRY POINTS

/** Opens the About dialog. */
function showAboutDialog() {
  const html = HtmlService.createTemplateFromFile('AboutDialog').evaluate().setWidth(465).setHeight(200)
  SpreadsheetApp.getUi().showModalDialog(html, 'About')
}

// #endregion About


// Helpers

/** Includes an HTML partial and evaluates any template code it contains. */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}
