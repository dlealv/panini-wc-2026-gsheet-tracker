/** @OnlyCurrentDoc */
// src/QuickEntryService.gs

/**
 * Provides classes and methods related to the Quick Sticker Entry dialog, including data transformation,
 * view model construction, and sticker count updates.
 * This service acts as the core logic layer for the Quick Entry dialog, handling all interactions between
 * the shared sheet data and the UI payloads.
 * NOTE: the export tag in comments indicates methods that are intended to be testable and exposed for
 * external use, so they should not be removed or altered without consideration of their role in the overall
 * application architecture.
 */

/**
 * Builds Quick Sticker Entry view models and applies sticker count updates.
 * This service transforms shared sheet data into UI-ready payloads for the Quick Entry dialog.
 * export tag is used for testable classes/methods, don't remove them.
 * @export
 */
class QuickEntryService {
  /**
   * Creates a service for Quick Sticker Entry.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] - Optional spreadsheet instance.
   *   Defaults to SpreadsheetApp.getActiveSpreadsheet() for the normal spreadsheet dialog.
   *   Pass an explicit instance when running from the mobile web app, where
   *   getActiveSpreadsheet() may not be available.
   */
  constructor(ss) {
    this.repo = new StickerSheetRepository(ss)
    this.DEFAULT_STATUS_FILTER = 'all'
    this.DEFAULT_GROUP_FILTER = 'all'
  }

  /**
   * Returns the initial dialog payload for the Quick Entry view.
   * @returns {{countries:Array<Object>,groupCodes:string[],selectedStatusFilter:string,
   *  selectedGroupFilter:string}} Initial dialog payload. See _buildCountryViewModel() for the country shape.
   *  Example: { countries: [{ code:'MEX', name:'Mexico', group:'B', flag:'https://...', isCompleted:false,
   *  stickers:[{number:1,count:0}, {number:2,count:1}, ...], iconLabels:{1:'CREST',13:'TEAM'},
   *  summary:{owned:5,missing:15,repeated:2,total:20,completionPercent:25} }],
   *  groupCodes:['A','B','C'], selectedStatusFilter:'all', selectedGroupFilter:'all' }
  */
  getInitialData() {
    const countries = this.repo.getCountries()
    const groupCodes = this.repo.getGroupCodes()

    return {
      countries: this._buildCountryViewModels(countries),
      groupCodes,
      selectedStatusFilter: this.DEFAULT_STATUS_FILTER,
      selectedGroupFilter: this.DEFAULT_GROUP_FILTER
    }
  }

  /**
   * Applies UI pending sticker updates through the repository canonical update payload
   * and returns refreshed country view models.
   * The input is validated and normalized before being grouped by country code for a
   * single COUNTS range update operation.
   * @param {Array<{code:string,stickers:Array<{number:number,count:number}>}>} pendingUpdates - Pending sticker
   *  updates collected from the UI, grouped by country. Example: [{ code:'MEX', stickers:[{number:18,count:2}] }]
   * @returns {{success:boolean,message:string,countries:Array<Object>}} Result payload with refreshed country
   *  view models. Example: { success:true, message:message, countries:[...] }
   * @throws {Error} When pendingUpdates is empty or not an array (via _normalizePendingUpdates()).
  */
  applyPendingUpdates(pendingUpdates) {
    const normalizedUpdates = this._normalizePendingUpdates(pendingUpdates)

    this.repo.updateStickerCounts(normalizedUpdates)
    // Counts individual sticker updates actually applied, not country entries - pendingUpdates.length would
    // now undercount (one entry per country, not per sticker) since the wire input is grouped by country.
    const count = normalizedUpdates.countries.reduce((total, country) => total + country.counts.size, 0)
    return {
      success: true,
      message: `Updated ${count} sticker value(s).`,
      countries: this._buildCountryViewModels(this.repo.getCountries())
    }
  }

  /**
   * Builds country view models for the UI.
   * @param {Array<{code:string,name:string,group:string,flag:string,counts:Map<number,number>}>} countries -
   *  Country records as returned by StickerSheetRepository.getCountries().
   * @returns {Array<Object>} One view model per input country. See _buildCountryViewModel() for the shape.
  */
  _buildCountryViewModels(countries) {
    return countries.map(country => this._buildCountryViewModel(country))
  }

  /**
   * Builds one country section view model.
   * @param {{code:string,name:string,group:string,flag:string,counts:Map<number,number>}} country -
   *  Country record. Example: { code:'MEX', name:'Mexico', group:'B', flag:'https://...',
   *  counts:Map{0=>0,1=>1,2=>0,...,18=>2,20=>0} } // dense, one entry per sticker (0-20)
   * @returns {{code:string,name:string,group:string,flag:string,isCompleted:boolean,
   *  stickers:Array<{number:number,count:number}>,iconLabels:Object<number,string>,summary:Object}} Country view
   *  model. Example: { code:'MEX', name:'Mexico', group:'B', flag:'https://...', isCompleted:false,
   *  stickers:[{number:1,count:0}, {number:2,count:1}, ...], iconLabels:{1:'CREST',13:'TEAM'},
   *  summary:{owned:5,missing:15,repeated:2,total:20,completionPercent:25} }
  */
  _buildCountryViewModel(country) {
    const stickers = this._buildStickerViews(country.code, country.counts)
    const summary = this._buildSummary(stickers)
    const isCompleted = summary.missing === 0

    return {
      code: country.code,
      name: country.name,
      group: country.group,
      flag: country.flag,
      isCompleted,
      stickers,
      iconLabels: this._buildIconLabels(country.code),
      summary
    }
  }

  /**
   * Builds sticker cards for one country. Each card is the canonical {number,count} pair only - corner labels
   * live separately in _buildIconLabels(), since they only ever apply to 2 of the ~20 stickers per country.
   * @param {string} countryCode - Normalized country code. Example: 'MEX'
   * @param {Map<number,number>} counts - Sticker-number -> count map. Must be dense over the country's visible
   *  sticker range (an entry for every visible sticker number, including zero counts) - a sparse map would make
   *  .get() return undefined for a legitimately-absent sticker, silently producing an undefined count instead of 0.
   *  Example: Map{0=>0,1=>1,2=>0,...,18=>2,20=>0}
   * @returns {Array<{number:number,count:number}>} One entry per visible sticker number, ascending.
   *  Example: [{number:0,count:0}, {number:1,count:1}, ...]
  */
  _buildStickerViews(countryCode, counts) {
    return this._getVisibleStickerNumbers(countryCode).map(stickerNumber => ({
      number: stickerNumber,
      count: counts.get(stickerNumber)
    }))
  }

  /**
   * Builds the sparse corner-label lookup for one country's special stickers (team crest/captain).
   * @param {string} countryCode - Normalized country code. Example: 'MEX'
   * @returns {Object<number,string>} Sticker-number -> label, containing only the stickers that actually have a
   *  label ('CREST' for sticker 1, 'TEAM' for sticker 13, on team countries only). Empty for FWC/CC.
   *  Example: { 1:'CREST', 13:'TEAM' }
  */
  _buildIconLabels(countryCode) {
    const iconLabels = {}
    const crest = this._getStickerIconLabel(countryCode, 1)
    const team = this._getStickerIconLabel(countryCode, 13)

    if (crest) {
      iconLabels[1] = crest
    }
    if (team) {
      iconLabels[13] = team
    }
    return iconLabels
  }

  /**
   * Returns the sticker corner label for special sticker numbers (team crest/captain stickers).
   * @param {string} countryCode - Normalized country code. Example: 'MEX'
   * @param {number} stickerNumber - Sticker number. Example: 1
   * @returns {string} 'CREST' for sticker 1, 'TEAM' for sticker 13, on team countries; '' otherwise (including
   *  non-team countries such as FWC/CC). Example: 'CREST'
  */
  _getStickerIconLabel(countryCode, stickerNumber) {
    const isTeam = !StickerSheetRepository.getCountryBounds().has(countryCode)

    if (!isTeam) {
      return ''
    }
    if (stickerNumber === 1) {
      return 'CREST'
    }
    if (stickerNumber === 13) {
      return 'TEAM'
    }

    return ''
  }

  /**
   * Returns visible sticker numbers for one country.
   * @param {string} countryCode - Normalized country code. Example: 'FWC'
   * @returns {number[]} Inclusive range of valid sticker numbers for the country. Example: [0,1,...,19] for FWC
  */
  _getVisibleStickerNumbers(countryCode) {
    const bounds = StickerSheetRepository.getCountryBounds()
    const [start, end] = bounds.get(countryCode) || bounds.get('TEAM')

    return this._buildNumberRange(start, end)
  }

  /**
   * Builds an inclusive number range.
   * @param {number} start - Range start (inclusive). Example: 1
   * @param {number} end - Range end (inclusive). Example: 5
   * @returns {number[]} Example: [1, 2, 3, 4, 5]
  */
  _buildNumberRange(start, end) {
    const numbers = []

    for (let value = start; value <= end; value++) {
      numbers.push(value)
    }

    return numbers
  }

  /**
   * Builds summary values for the selected country.
   * @param {Array<{count:number}>} stickers - Sticker view models (only .count is used).
   *  Example: [{count:0},{count:1},{count:2}]
   * @returns {{owned:number,missing:number,repeated:number,total:number,completionPercent:number}} Summary.
   *  Example: { owned:2, missing:1, repeated:1, total:3, completionPercent:67 }
  */
  _buildSummary(stickers) {
    const total = stickers.length
    const owned = stickers.filter(sticker => sticker.count > 0).length
    const missing = stickers.filter(sticker => sticker.count === 0).length
    const repeated = stickers.filter(sticker => sticker.count > 1).length
    const completionPercent = total === 0 ? 0 : Math.round((owned / total) * 100)

    return {
      owned,
      missing,
      repeated,
      total,
      completionPercent
    }
  }

  /**
   * Validates UI pending updates, already grouped by country, and converts them into the canonical
   * repository update payload expected by StickerSheetRepository.updateStickerCounts().
   * @param {Array<{code:string,stickers:Array<{number:(number|string),count:(number|string)}>}>} pendingUpdates -
   *  Raw pending updates from the UI, one entry per country. Example: [{ code:'MEX',
   *  stickers:[{number:4,count:2}, {number:5,count:1}] }]
   * @returns {{countries:Array<{code:string,counts:Map<number,number>}>}} Canonical update payload.
   *  Example: { countries: [{ code:'MEX', counts:Map{4=>2, 5=>1} }] }
   * @throws {Error} When pendingUpdates is empty or not an array.
  */
  _normalizePendingUpdates(pendingUpdates) {
    if (!Array.isArray(pendingUpdates) || !pendingUpdates.length) {
      throw new Error('There are no pending updates to apply.')
    }
    return {
      countries: pendingUpdates.map(update => this._normalizeCountryUpdate(update))
    }
  }

  /**
   * Validates and normalizes one country's pending sticker updates.
   * @param {{code:string,stickers:Array<{number:(number|string),count:(number|string)}>}} update - Raw
   *  per-country update. Example: { code:'MEX', stickers:[{number:'4',count:'2'}] }
   * @returns {{code:string,counts:Map<number,number>}} Normalized per-country update.
   *  Example: { code:'MEX', counts:Map{4=>2} }
   * @throws {Error} When the country code is empty or no sticker updates are provided.
  */
  _normalizeCountryUpdate(update) {
    const code = this._normalizeCountryCode(update && update.code)
    const stickers = (update && update.stickers) || []

    if (!Array.isArray(stickers) || !stickers.length) {
      throw new Error(`No sticker updates provided for ${code}.`)
    }
    return {
      code,
      counts: new Map(stickers.map(sticker => this._normalizeStickerUpdate(code, sticker)))
    }
  }

  /**
   * Validates and normalizes one pending sticker update.
   * @param {string} code - Normalized country code. Example: 'MEX'
   * @param {{number:(number|string),count:(number|string)}} sticker - Raw pending sticker update.
   *  Example: { number:'4', count:'2' }
   * @returns {[number,number]} Normalized [number, count] pair, suitable for Map construction.
   *  Example: [4, 2]
   * @throws {Error} When the sticker is not visible for the country, or the count is not a non-negative integer.
  */
  _normalizeStickerUpdate(code, sticker) {
    const number = Number(sticker && sticker.number)
    const count = Number(sticker && sticker.count)

    this._validateVisibleSticker(code, number)

    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid count "${sticker && sticker.count}" for ${code} sticker ${number}.`)
    }

    return [number, count]
  }

  /**
   * Normalizes a country code.
   * @param {string} countryCode - Raw country code. Example: ' mex '
   * @returns {string} Trimmed, uppercased country code. Example: 'MEX'
   * @throws {Error} When countryCode is empty.
  */
  _normalizeCountryCode(countryCode) {
    const normalizedCountryCode = String(countryCode || '').trim().toUpperCase()

    if (!normalizedCountryCode) {
      throw new Error('Country code is required.')
    }

    return normalizedCountryCode
  }

  /**
   * Validates a visible sticker for the selected country.
   * @param {string} countryCode - Normalized country code. Example: 'MEX'
   * @param {number} stickerNumber - Sticker number to validate. Example: 18
   * @throws {Error} When the sticker number is outside the country's visible range.
  */
  _validateVisibleSticker(countryCode, stickerNumber) {
    if (!this._getVisibleStickerNumbers(countryCode).includes(stickerNumber)) {
      throw new Error(`Sticker ${stickerNumber} is not valid for country code "${countryCode}".`)
    }
  }
}
