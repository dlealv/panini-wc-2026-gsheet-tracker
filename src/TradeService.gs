/** @OnlyCurrentDoc */
//src/TradeService.gs

/**
 * Classes and methods for managing sticker trades in the Panini tracker.
 *
 * This file includes:
 *  - TradeService, the GAS-facing application service responsible for
 *    trade workflow orchestration, export/import coordination, user confirmation,
 *    and spreadsheet updates.
 *  - TradeCalculation, a pure business-logic class responsible for
 *    comparing sticker collections and finding compatible trade matches.
 * Shared trade information structure used by trade workflow methods.
 * @typedef {{missing:Object<string,number[]>, repeats:Object<string,number[]>}} TradeInfo
 * NOTE: the export tag in comments indicates classes or methods that are intended
 * to be testable and exposed for external use, so they should not be removed or
 * altered without consideration of their role in the overall application architecture.
 */

//#region TradeService

/**
 * Handles trade workflow operations for the Panini tracker.
 * This class is the GAS-facing application service responsible for:
 *  - receiving trade requests from the client layer.
 *  - preparing sticker data required for trade calculations.
 *  - coordinating ExportService and ExportStickers functionality.
 *  - coordinating ImportStickers and LineNormalize when raw sticker input is provided.
 *  - invoking TradeCalculation for business decisions.
 *  - applying confirmed spreadsheet updates through StickerSheetRepository.
 * Spreadsheet access and persistence logic should remain in this class.
 * Trade calculation logic should be delegated to TradeCalculation.
 *
 * @export
 */
class TradeService {
  /**
   * Creates a TradeService instance.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   */
  constructor(ss, deps = {}) {
    this.ss = ss || null

    this.repo = null
    this.tradeInfo = null
    this.otherTradeInfo = null
    this.tradeProposal = null
    this.exportService = null
    this.tradeCalculation = null
    this.tradeQrHelper = null

    // injectable classes
    this.ExportService = deps.ExportService || ExportService
    this.ExportStickers = deps.ExportStickers || ExportStickers
    this.ImportStickers = deps.ImportStickers || ImportStickers
    this.TradeCalculation = deps.TradeCalculation || TradeCalculation
    this.TradeQrHelper = deps.TradeQrHelper || TradeQrHelper

  }

  // static GAS entry points

  /**
   * GAS entry point for validating external collector sticker information.
   * Parses Missing and Repeats independently and returns normalized trade data.
   * @param {{missingText:string,repeatsText:string}} payload Raw trade input.
   * Example:
   * {
   *   missingText:"MEX,1,5\nFWC,10",
   *   repeatsText:"MEX,7(2)\nBRA,15"
   * }
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   * @returns {{success:boolean,warnings:{missing:string[],repeats:string[]},tradeInfo:TradeInfo}}
   */
  static previewOtherStickerTradeInfo(payload, ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    return service.previewOtherTradeInfo(payload)
  }

  /**
   * GAS entry point for generating the current collector's sticker trade QR data.
   * Generates compact QR payload data and serialized trade information
   * for sharing with another collector.
   * This method only prepares trade information.
   * It does not calculate matches or modify spreadsheet data.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   * @returns {{success:boolean,qrData:string,tradeInfo:string}}
   */
  static generateStickerTradeInfoQr(ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    return service.generateTradeInfoQr()
  }

  /**
   * GAS entry point for validating external collector sticker information
   * from an uploaded QR image.
   * Decodes the QR image into trade payload data, converts the payload into
   * normalized trade information, and returns the same response structure used
   * by previewOtherStickerTradeInfo().
   * This method only prepares external collector trade information.
   * It does not calculate matches or modify spreadsheet data.
   * @param {{imageData:string}} payload Uploaded QR image data.
   * Example: {imageData:"data:image/png;base64,iVBORw0..."}
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   * @returns {{success:boolean,warnings:{missing:string[],repeats:string[]},tradeInfo:string}}
   */
  static previewOtherStickerTradeInfoFromQr(payload, ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    return service.previewOtherTradeInfoFromQr(payload)
  }

  /**
   * Generates possible trade matches using the current collector and external collector data.
   * Uses tradeInfo and otherTradeInfo as the source data and delegates the
   * matching logic to TradeCalculation.
   * This method only calculates possible exchanges and does not modify
   * spreadsheet data.
   * @param {{otherTradeInfo:TradeInfo}} payload External collector trade information.
   * External collector trade information.
   * Example:
   * {
   *   otherTradeInfo:{
   *     missing:{
   *       MEX:[1,5]
   *     },
   *     repeats:{
   *       BRA:[8,10]
   *     }
   *   }
   * }
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   * @returns {{receive:Object<string,number[]>,send:Object<string,number[]>}}
   */
  static findStickerTradeMatches(payload, ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    service.setOtherTradeInfo(payload.otherTradeInfo)
    return service.findTradeMatches()
  }

  /**
   * Generates possible trade matches using QR encoded external collector data.
   *
   * Decodes QR trade information into the internal trade model and delegates the
   * matching logic to TradeCalculation.
   *
   * This method only calculates possible exchanges and does not modify
   * spreadsheet data.
   *
   * @param {{qrData:string}} payload QR encoded external collector trade information.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   * @returns {{receive:Object<string,number[]>, send:Object<string,number[]>}}
   */
  static findStickerTradeMatchesFromQr(payload, ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    service.setOtherTradeInfoFromQr(payload.qrData)
    return service.findTradeMatches()
  }

  /**
   * GAS entry point for executing a confirmed trade.
   * Validates the confirmation and applies spreadsheet updates.
   * @param {{receive:Object<string,number[]>, send:Object<string,number[]>}} payload Confirmed trade information.
   * @returns {boolean|Object} Result returned by StickerSheetRepository.updateStickerCounts().
   */
  static executeStickerTrades(payload, ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    return service.executeTrade(payload)
  }

  /**
   * GAS entry point for refreshing the trade proposal.
   * Recalculates the possible trade matches and applies the user-selected
   * options before returning the updated proposal.
   * @param {{otherTradeInfo:TradeInfo,sortMissing:boolean,
   * maxStickerReceive:number,maxStickerSend:number}} payload 
   * Trade proposal options and external collector information.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] Optional spreadsheet instance.
   * @param {Object} [deps] Optional dependency injection for testing.
   * @returns {{receive:Object<string,number[]>, send:Object<string,number[]>}}
   */
  static refreshStickerTradeProposal(payload, ss = null, deps = {}) {
    const service = new TradeService(ss, deps)
    service.setOtherTradeInfo(payload.otherTradeInfo)

    return service.refreshTradeProposal({
      sortMissing: payload.sortMissing,
      maxStickerReceive: payload.maxStickerReceive,
      maxStickerSend: payload.maxStickerSend
    })
  }

  // Getters and setters

  /**
   * Returns the ExportService instance.
   * Lazy initializes it on first access.
   * @return {ExportService}
   */
  getExportService() {
    if (!this.exportService) {
      this.exportService = new this.ExportService(this.ss)
    }
    return this.exportService
  }

  /**
   * Returns the current collector trade information.
   * Lazy initializes the trade data on first access.
   * The arrays preserve sticker order because the UI/helper layer uses
   * this order when applying trade quantity selections.
   * @returns {TradeInfo}
   */
  getTradeInfo() {
    if (!this.tradeInfo) {
      this.tradeInfo = this._buildTradeInfo()
    }
    return this.tradeInfo
  }

  /**
   * Returns the StickerSheetRepository instance.
   * Lazy initializes the repository on first access.
   * @returns {StickerSheetRepository}
   */
  getRepo() {
    if (!this.repo) {
      this.repo = new StickerSheetRepository()
    }
    return this.repo
  }

  /** Returns the external collector trade information. */
  getOtherTradeInfo() {
    return this.otherTradeInfo
  }

  /**
 * Stores validated external collector trade information.
 * Input is already normalized TradeInfo.
 * @param {{missing:Object<string,number[]>,repeats:Object<string,number[]>}} tradeInfo
 * @returns {void}
 */
  setOtherTradeInfo(tradeInfo) {
    this.otherTradeInfo = tradeInfo
  }

  /**
   * Loads external trade information from QR payload data.
   * The decoded QR data is converted into the TradeInfo model.
   * @param {string} qrData QR encoded trade information.
   * @returns {void}
   */
  setOtherTradeInfoFromQr(qrData) {
    const tradeInfo = this.getTradeQrHelper().decode(qrData)
    this.otherTradeInfo = tradeInfo
  }

  /**
   * Returns the TradeCalculation instance.
   * Lazy initializes it on first access.
   * @returns {TradeCalculation}
   */
  getTradeCalculation() {
    if (!this.tradeCalculation) {
      this.tradeCalculation = new this.TradeCalculation()
    }
    return this.tradeCalculation
  }

  /** Returns the current trade proposal. */
  getTradeProposal() {
    return this.tradeProposal
  }

  /**
   * Stores the current trade proposal.
   * @param {Object} tradeProposal Trade proposal.
   */
  setTradeProposal(tradeProposal) {
    this.tradeProposal = tradeProposal
  }

  /** Returns the QR helper instance. */
  getTradeQrHelper() {
    if (!this.tradeQrHelper) {
      this.tradeQrHelper = new this.TradeQrHelper()
    }
    return this.tradeQrHelper
  }

  // Application use cases

  /**
   * Previews external collector input before using it in trade calculations.
   * Missing and Repeats are parsed independently so warnings can be reported
   * for each section separately.
   * @param {{missingText:string,repeatsText:string}} payload Raw collector input.
   * @returns {{success:boolean,warnings:Object<string,string[]>,tradeInfo:TradeInfo}}
   */
  previewOtherTradeInfo(payload) {
    const missingParsed = payload.missingText
      ? this._parseStickerInput(payload.missingText)
      : { countries: [], warnings: [] }
    const repeatsParsed = payload.repeatsText
      ? this._parseStickerInput(payload.repeatsText)
      : { countries: [], warnings: [] }
    this.otherTradeInfo = this._buildOtherTradeInfo(
      missingParsed,
      repeatsParsed
    )
    return {
      success: true,
      warnings: {
        missing: missingParsed.warnings || [],
        repeats: repeatsParsed.warnings || []
      },
      tradeInfo: this.otherTradeInfo
    }
  }

  /**
   * Generates QR encoded trade information for the current collector.
   * Retrieves the current collector trade information and delegates encoding
   * to TradeQrHelper.
   * This method only generates QR data and does not modify spreadsheet data.
   * @returns {{success:boolean,qrData:string,tradeInfo:string}} tradeInfo is serialized as JSON 
   *  to preserve sticker order of the album.
   * Note:
   * Unlike previewOtherTradeInfo(), this method returns tradeInfo serialized
   * as JSON because the QR workflow transfers data through the client layer,
   * where object property ordering must be preserved.
   */
  generateTradeInfoQr() {
    const tradeInfo = this.getTradeInfo()
    const qrData = this.getTradeQrHelper().encode(tradeInfo)

    return {
      success: true,
      qrData: qrData,
      tradeInfo: JSON.stringify(tradeInfo)
    }
  }

  /**
   * Previews external collector trade information from QR payload data.
   * Decodes QR payload data into TradeInfo, stores the external collector
   * information, and returns the trade information serialized as JSON (required to keep album order).
   * @param {{qrData:string}} payload Decoded QR payload data.
   * @returns {{success:boolean,warnings:{missing:string[],repeats:string[]},tradeInfo:string}}
   * Note:
   * Unlike previewOtherTradeInfo(), this method returns tradeInfo serialized
   * as JSON because the QR workflow transfers data through the client layer,
   * where object property ordering must be preserved.
   */
  previewOtherTradeInfoFromQr(payload) {
    const tradeInfo = this.getTradeQrHelper().decode(payload.qrData)
    this.otherTradeInfo = tradeInfo
    return {
      success: true,
      warnings: { missing: [], repeats: [] },
      tradeInfo: JSON.stringify(this.otherTradeInfo)
    }
  }


  /**
   * Calculates all possible trade matches between two collectors.
   * Uses tradeInfo and otherTradeInfo as the source data and delegates the
   * matching logic to TradeCalculation.
   * This method only calculates possible exchanges and does not modify
   * spreadsheet data.
   * @returns {{receive:Object<string,number[]>,send:Object<string,number[]>}}
   */
  findTradeMatches() {
    if (!this.getOtherTradeInfo()) {
      throw new Error('External collector information is required before calculating trades.')
    }
    return this.getTradeCalculation().calculate(
      this.getTradeInfo(),
      this.getOtherTradeInfo()
    )
  }

  /**
   * Builds the current trade proposal.
   * Recalculates possible trade matches and applies user-selected options.
   * @param {Object} options Trade selection options.
   * @returns {Object} Trade proposal.
   */
  refreshTradeProposal(options) {
    const matches = this.findTradeMatches()
    this.setTradeProposal(
      this._buildTradeProposal(matches, options)
    )
    return this.getTradeProposal()
  }

  /**
   * Executes a confirmed trade proposal.
   *
   * Applies the calculated sticker changes through the repository layer.
   * @param {{receive:Object<string,number[]>, send:Object<string,number[]>}} tradeConfirmation 
   *  Confirmed trade information.
   */
  executeTrade(tradeConfirmation) {
    const updates = this._buildTradeUpdates(tradeConfirmation)
    return this.getRepo().updateStickerCounts(updates)
  }

  // Export/import preparation

  /**
   * Builds the current user's trade information.
   * Reuses ExportService row generation and ExportStickers filtering rules
   * to obtain the current user's missing and repeated stickers.
   * The export layer provides the canonical sticker availability data, while
   * this method adapts it into the trade domain structure:
   *  - missing stickers are stored as unavailable sticker entries.
   *  - repeated stickers are converted into tradable sticker entries, where each
   *    sticker represents one available trade unit.
   * The returned structure intentionally uses arrays instead of objects.
   * This preserves the original album order provided by ExportService.getRows().
   * Using objects keyed by country code can lose the expected display order when
   * the data is later serialized or iterated.
   * The returned structure is consumed by trade calculation logic and does not
   * contain export formatting such as text tokens, flags, or repeat notation.
   *
   * @returns {{missing:Object<string,number[]>, repeats:Object<string,number[]>}}
   * Example:
   * {
   *   missing:{MEX:[2,5]},
   *   repeats:{ARG:[7,8]}
   * }
   */
  _buildTradeInfo() {
    const exportService = this.getExportService()
    const rows = exportService.getRows()
    const exporter = new this.ExportStickers(rows)

    const buildStickerData = (type) => {
      const data = {}
      // rows comes from ExportService in album order.
      // Assigning properties in this iteration order preserves the album order
      // when the trade information is later serialized.
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const items = exporter.filterStickerNumbersBy(row, type)
        if (!items.length) { continue }
        data[row.code] = items
          .map(item => Number(item.sticker))
          .filter(Number.isFinite)
      }
      return data
    }
    const result = {
      repeats: buildStickerData('repeats'),
      missing: buildStickerData('missing')
    }
    return result
  }

  /**
   * Parses raw sticker input when trade data is provided as text.
   * Uses ImportStickers and LineNormalize to convert raw user input
   * into canonical sticker data.
   * The parser is configured to preserve the original sticker order
   * because trade input order is meaningful for preview operations.
   * Warning consolidation behavior is inherited from ImportStickers.
   * @param {string} text Raw sticker input.
   * @returns {{sortStickers:boolean,countries:Array<{code:string, counts:Object<number,number>, stickerOrder?:number[]}>,warnings:string[]}}
   */
  _parseStickerInput(text) {
    const importStickers = new this.ImportStickers(
      this.getRepo().getCountryMap(),
      { sortStickers: false }
    )
    return importStickers.parse(text)
  }

    /**
     * Builds the external collector trade information.
     * Converts parsed sticker input from the Trade view into the internal trade information structure.
     * Missing and Repeats are parsed separately because they have different meanings:
     *  - missing input represents stickers the external collector needs.
     *  - repeats input represents stickers the external collector can trade.
     * When sortStickers is disabled, ImportStickers provides stickerOrder with the original normalized input order.
     * @param {{sortStickers:boolean,countries:Array<{code:string,counts:Object<string,number>,
     *  stickerOrder?:number[]}>}} missingParsed
     *  Parsed canonical import structure for missing stickers.
     * @param {{sortStickers:boolean,countries:Array<{code:string,counts:Object<string,number>,
     *  stickerOrder?:number[]}>}} repeatsParsed
     *  Parsed canonical import structure for repeated stickers.
     * @returns {{missing:Object<string,number[]>,repeats:Object<string,number[]>}}
     */
  _buildOtherTradeInfo(missingParsed = {}, repeatsParsed = {}) {
    const missing = {}
    const repeats = {}
    const getStickerOrder = (parsed, country) => {
      return parsed.sortStickers === false
        ? country.stickerOrder
        : Object.keys(country.counts).map(Number)
    }
    const missingCountries = missingParsed.countries || []
    missingCountries.forEach(country => {
      const stickers = getStickerOrder(missingParsed, country)
      if (stickers.length) {
        missing[country.code] = stickers
      }
    })
    const repeatCountries = repeatsParsed.countries || []
    repeatCountries.forEach(country => {
      const stickers = getStickerOrder(repeatsParsed, country)
        .filter(sticker => Number(country.counts[sticker]) > 0)
      if (stickers.length) {
        repeats[country.code] = stickers
      }
    })
    return { missing, repeats }
  }

  /**
   * Builds spreadsheet updates from a confirmed trade.
   * Converts trade calculation data into StickerSheetRepository update format.
   * Received stickers increase the current count by one, while sent stickers
   * decrease the current count by one.
   * @param {{receive:Object<string,number[]>, send:Object<string,number[]>}} tradeConfirmation 
   *  Confirmed trade information.
   * @returns {Array<{countryCode:string, stickerNumber:number, count:number}>}
   */
  _buildTradeUpdates(tradeConfirmation) {
    const updates = []
    const applyUpdates = (tradeInfo, increase) => {
      Object.keys(tradeInfo || {}).forEach(countryCode => {
        tradeInfo[countryCode].forEach(stickerNumber => {
          const currentCount = this.getRepo()
            .getStickerCount(countryCode, stickerNumber)
          updates.push({ countryCode, stickerNumber, count: currentCount + increase })
        })
      })
    }
    applyUpdates(tradeConfirmation.receive, 1)
    applyUpdates(tradeConfirmation.send, -1)

    return updates
  }

  /**
   * Builds the confirmed trade proposal from calculated matches and user options.
   * Applies missing sticker sorting based on DONE completion and limits the number
   * of stickers included in the final proposal.
   * @param {{receive:Object<string,number[]>,send:Object<string,number[]>}} matches Calculated trade matches.
   * @param {{sortMissing:boolean,maxStickerReceive:number,maxStickerSend:number}} options User trade selection options.
   * @returns {{receive:Object<string,number[]>,send:Object<string,number[]>}}
   */
  _buildTradeProposal(matches, options) {
    const receive = options.sortMissing
      ? this._sortMissing(matches.receive)
      : matches.receive

    return {
      receive: this._limitTradeStickers(receive, options.maxStickerReceive),
      send: this._limitTradeStickers(matches.send, options.maxStickerSend)
    }
  }

  /**
   * Limits the number of stickers included per country while preserving order.
   * @param {Object<string,number[]>} stickers Stickers grouped by country.
   * @param {number} limit Maximum stickers allowed per country.
   * @returns {Object<string,number[]>}
   */
  _limitTradeStickers(stickers, limit) {
    const result = {}
    const entries = Object.entries(stickers || {})

    for (let i = 0; i < entries.length; i++) {
      const countryCode = entries[i][0]
      const stickerNumbers = entries[i][1].slice(0, limit)
      if (stickerNumbers.length) {
        result[countryCode] = stickerNumbers
      }
    }

    return result
  }


  /**
   * Sorts missing stickers by country album completion.
   * Uses DONE values from StickerSheetRepository only for the provided countries.
   * Higher completion percentages are prioritized first.
   * @param {Object<string,number[]>} stickers Missing stickers grouped by country.
   * @returns {Object<string,number[]>}
   */
  _sortMissing(stickers) {
    const doneMap = this._getCountryDoneMap(Object.keys(stickers))
    const entries = Object.entries(stickers)
    entries.sort((a, b) => {
      return (doneMap[b[0]] || 0) - (doneMap[a[0]] || 0)
    })

    return Object.fromEntries(entries)
  }

  /**
   * Builds a country DONE lookup for the provided countries.
   * @param {string[]} countryCodes Country codes to retrieve DONE values for.
   * @returns {Object<string,number>}
   */
  _getCountryDoneMap(countryCodes) {
    const countries = this.getRepo().getCountries()
    const doneMap = {}

    for (let i = 0; i < countries.length; i++) {
      const country = countries[i]
      if (countryCodes.includes(country.code)) {
        doneMap[country.code] = country.done
      }
    }

    return doneMap
  }

}

//#endregion

//#region TradeCalculation

/**
 * Performs trade calculations without GAS or spreadsheet dependencies.
 *
 * Finds compatible sticker exchanges between two collectors.
 * Quantity selection, sorting, and proposal presentation are handled
 * by the UI helper layer.
 * @export
 */
class TradeCalculation {

  /**
   * Calculates all possible trade matches between two collectors.
   *
   * The calculation layer only determines compatible exchanges.
   * Quantity selection, sorting, and proposal presentation are handled
   * by the UI/helper layer.
   *
   * @param {{
   *   missing:Object<string,number[]>,
   *   repeats:Object<string,number[]>
   * }} tradeInfo Current collector trade information.
   *
   * @param {{
   *   missing:Object<string,number[]>,
   *   repeats:Object<string,number[]>
   * }} otherTradeInfo External collector trade information.
   *
   * @returns {{
   *   receive:Object<string,number[]>,
   *   send:Object<string,number[]>
   * }}
   */
  calculate(tradeInfo, otherTradeInfo) {
    return this._findMatches(tradeInfo, otherTradeInfo)
  }

  /**
   * Finds all possible exchanges between both collectors.
   *
   * Receive matches happen when:
   * - current collector is missing a sticker.
   * - other collector has that sticker as a repeat.
   *
   * Send matches happen when:
   * - current collector has a repeat sticker.
   * - other collector is missing that sticker.
   *
   * The returned arrays preserve the original sticker order so the
   * UI/helper layer can apply quantity selection by taking items from
   * the beginning of each list.
   *
   * @param {{
   *   missing:Object<string,number[]>,
   *   repeats:Object<string,number[]>
   * }} tradeInfo Current collector trade information.
   *
   * @param {{
   *   missing:Object<string,number[]>,
   *   repeats:Object<string,number[]>
   * }} otherTradeInfo External collector trade information.
   *
   * @returns {{
   *   receive:Object<string,number[]>,
   *   send:Object<string,number[]>
   * }}
   */
  _findMatches(tradeInfo, otherTradeInfo) {
    const receive = {}
    const send = {}

    // Find receive matches:
    // current collector is missing stickers and the other collector repeats them.
    const missingCountries = Object.keys(tradeInfo.missing || {})
    for (let i = 0; i < missingCountries.length; i++) {
      const country = missingCountries[i]
      const matches = this._findCountryMatches(
        tradeInfo.missing[country],
        otherTradeInfo.repeats[country] || []
      )
      if (matches.length) {
        receive[country] = matches
      }
    }

    // Find send matches:
    // current collector repeats stickers and the other collector is missing them.
    const repeatCountries = Object.keys(tradeInfo.repeats || {})
    for (let i = 0; i < repeatCountries.length; i++) {
      const country = repeatCountries[i]
      const matches = this._findCountryMatches(
        tradeInfo.repeats[country],
        otherTradeInfo.missing[country] || []
      )
      if (matches.length) {
        send[country] = matches
      }
    }

    return { receive, send }
  }

  /**
   * Finds matching stickers for one country.
   *
   * Returns an empty array when no stickers from source are found
   * in the target list.
   *
   * @param {number[]} source Stickers from one collector.
   * @param {number[]} target Stickers from the other collector.
   *
   * @returns {number[]} Matching stickers preserving source order.
   */
  _findCountryMatches(source, target) {
    const matches = []
    for (let i = 0; i < source.length; i++) {
      const sticker = source[i]
      const found = target.includes(sticker)
      if (found) {
        matches.push(sticker)
      }
    }
    return matches
  }
}

//#endregion

/**
 * Provides QR payload encoding and decoding for trade information.
 * The QR payload is a compact representation of TradeInfo used to transfer
 * collector sticker data between users.
 * Payload format:
 * {
 *   "m": {"MEX": [1,5,15],"FWC": [2,8]},
 *   "r": {"BRA": [8,10],"ARG": [4,12]}
 * }
 * Where:
 * - m represents missing stickers.
 * - r represents repeated stickers.
 * The helper preserves sticker order and does not apply sorting or validation
 * related to trading rules. Those responsibilities belong to TradeService.
 * @export
 */
class TradeQrHelper {

  /**
   * Converts trade information into a compact QR payload string.
   * Empty missing or repeated collections are omitted from the payload.
   * @param {TradeInfo} tradeInfo Trade information to encode.
   * @returns {string} Compact JSON string ready to be stored in a QR code.
   */
  encode(tradeInfo) {
    const payload = {}

    if (tradeInfo.missing && Object.keys(tradeInfo.missing).length) {
      payload.m = tradeInfo.missing
    }
    if (tradeInfo.repeats && Object.keys(tradeInfo.repeats).length) {
      payload.r = tradeInfo.repeats
    }
    return JSON.stringify(payload)
  }

  /**
 * Decodes QR payload data into trade information.
 * @param {string} qrData QR encoded trade information.
 * @returns {Object} Trade information with missing and repeats stickers.
 */
  decode(qrData) {
    try {
      const payload = JSON.parse(qrData)
      return {
        missing: payload.m || {},
        repeats: payload.r || {}
      }
    } catch (error) {
      return {
        missing: {},
        repeats: {}
      }
    }
  }

}

//#region 
