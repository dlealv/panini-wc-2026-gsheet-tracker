/** @OnlyCurrentDoc */
//src/Commons.gs

/**
 * Provides shared spreadsheet access, named range validation, and common lookup utilities.
 * This file centralizes reusable data access for import/export and Quick Entry flows.
 * 
 * NOTE: the export tag in comments indicates classes intended to be testable and exposed for 
 * external use, so they should not be removed or altered without consideration of their role in the overall 
 * application architecture.
 */

// Constants used in the class
const STICKER_MIN = 0    // start index position
const STICKER_MAX = 20   // end index position
const MAX_ROWS = 50      // 48 teams plus FWC and CCC
const EXPECTED_STICKER_COLUMNS = STICKER_MAX - STICKER_MIN + 1

/** Defines valid sticker number ranges for specific countries, used for validation during import and updates. 
 * `TEAM` represents all standard teams, `FWC` represents the World Cup team, and `CC` represents the Coca-Cola team.
 * The bounds are inclusive.*/
const COUNTRY_BOUNDS = new Map([
  ['FWC', [STICKER_MIN, STICKER_MAX - 1]],  // FWC has stickers 0-19
  ['CC', [STICKER_MIN + 1, 12]], // Coca-Cola has stickers 1-12
  ['TEAM', [STICKER_MIN + 1, STICKER_MAX]] // All teams have 1-20 stickers.
])

/** Provides shared access to sticker sheet data stored in named ranges. 
 * @export
 */
class StickerSheetRepository {

  // Static getter methods (are used outside of the class):
  /** Returns the country bounds map, which defines valid sticker number ranges for specific countries.*/
  static getCountryBounds() {
    return new Map(COUNTRY_BOUNDS)
  }

  /* Returns the minimum sticker number allowed, which is 0. */
  static getStickerMin() {
    return STICKER_MIN
  }

  /* Returns the maximum sticker number allowed, which is 20. */
  static getStickerMax() {
    return STICKER_MAX
  }

  /* Returns the maximum number of rows allowed in the named ranges, which is 50. This includes 48 teams plus FWC and CC. */
  static getMaxRows() {
    return MAX_ROWS
  }

  /* Returns the expected number of sticker columns*/
  static getExpectedStickerColumns() {
    return EXPECTED_STICKER_COLUMNS
  }

  // Instance methods:

  /** Creates a repository for sticker data.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] - Optional spreadsheet instance.
   *   Defaults to SpreadsheetApp.getActiveSpreadsheet() for normal dialog context.
   *   Pass an explicit instance when operating from a web app context where
   *   getActiveSpreadsheet() returns null (e.g. doGet or google.script.run from a web app).
   */
  constructor(ss) {
    // Constants
    this.COUNTRIES_RANGE_NAME = 'COUNTRIES'
    this.COUNTS_RANGE_NAME = 'COUNTS'
    this.GROUPS_RANGE_NAME = 'GROUPS'
    this.DONE_RANGE_NAME = 'DONE'
    this.FLAGS_URL_RANGE_NAME = 'FLAGS_URL'
    this.FLAG_ICONS_RANGE_NAME = 'FLAG_ICONS'
    this.COUNTRY_NAMES_RANGE_NAME = 'COUNTRY_NAMES'

    this.ss = ss || SpreadsheetApp.getActiveSpreadsheet()
    this.countriesRange = null
    this.countsRange = null
    this.groupsRange = null
    this.flagsUrlRange = null
    this.flagIconsRange = null
    this.countryNamesRange = null
    this.doneRange = null
    this.sheet = null
    this.startRow = null
    this.startCol = null
    this.numRows = null
    this.numStickerCols = null
    this.countryMap = null
    this.countries = null
    this.groupCodes = null
  }

  // Getters for named ranges and sheet info

  /** Lazy loads and validates the COUNTRIES named range, ensuring it has the correct shape and dimensions. */
  getCountriesRange() {
    if (!this.countriesRange) {
      const COUNTRIES_RANGE_NAME = this.COUNTRIES_RANGE_NAME
      this.countriesRange = this.ss.getRangeByName(COUNTRIES_RANGE_NAME)
      this._validateRange(this.countriesRange, MAX_ROWS, 1, COUNTRIES_RANGE_NAME)
    }
    return this.countriesRange
  }

  /** Lazy loads and validates the COUNTRY_NAMES named range, ensuring it has the correct shape and dimensions. */
  getCountryNamesRange() {
    if (!this.countryNamesRange) {
      const COUNTRY_NAMES_RANGE_NAME = this.COUNTRY_NAMES_RANGE_NAME
      this.countryNamesRange = this.ss.getRangeByName(COUNTRY_NAMES_RANGE_NAME)
      this._validateRange(this.countryNamesRange, MAX_ROWS, 1, COUNTRY_NAMES_RANGE_NAME)
    }
    return this.countryNamesRange
  }

  /** Lazy loads and validates the COUNTS named range, ensuring it has the correct shape and dimensions. 
   * This method also initializes related properties such as startRow, startCol, numRows, and numStickerCols 
   * based on the dimensions of the COUNTS range. The COUNTS range is expected to have a number of rows equal to 
   * MAX_ROWS and a number of columns equal to EXPECTED_STICKER_COLUMNS, which corresponds to the range of sticker 
   * numbers (0-20). If the named range is not found or does not have the expected dimensions, an error will be 
   * thrown to alert the developer of the misconfiguration in the spreadsheet.
  */
  getCountsRange() {
    if (!this.countsRange) {
      const COUNTS_RANGE_NAME = this.COUNTS_RANGE_NAME
      this.countsRange = this.ss.getRangeByName(COUNTS_RANGE_NAME)
      this._validateRange(this.countsRange, MAX_ROWS, EXPECTED_STICKER_COLUMNS, COUNTS_RANGE_NAME)
      this.startRow = this.countsRange.getRow()
      this.startCol = this.countsRange.getColumn()
      this.numRows = this.countsRange.getNumRows()
      this.numStickerCols = this.countsRange.getNumColumns()
    }
    return this.countsRange
  }

  /** Lazy loads and validates the DONE named range, ensuring it has the correct shape and dimensions. */
  getDoneRange() {
    if (!this.doneRange) {
      const DONE_RANGE_NAME = this.DONE_RANGE_NAME
      this.doneRange = this.ss.getRangeByName(DONE_RANGE_NAME)
      this._validateRange(this.doneRange, MAX_ROWS, 1, DONE_RANGE_NAME)
    }
    return this.doneRange
  }

  /** Lazy loads and validates the FLAG_ICONS named range, ensuring it has the correct shape and dimensions. */
  getFlagIconsRange() {
    if (!this.flagIconsRange) {
      const FLAG_ICONS_RANGE_NAME = this.FLAG_ICONS_RANGE_NAME
      this.flagIconsRange = this.ss.getRangeByName(FLAG_ICONS_RANGE_NAME)
      this._validateRange(this.flagIconsRange, MAX_ROWS, 1, FLAG_ICONS_RANGE_NAME)
    }
    return this.flagIconsRange
  }

  /** Lazy loads and validates the FLAGS_URL named range, ensuring it has the correct shape and dimensions. */
  getFlagsUrlRange() {
    if (!this.flagsUrlRange) {
      const FLAGS_URL_RANGE_NAME = this.FLAGS_URL_RANGE_NAME
      this.flagsUrlRange = this.ss.getRangeByName(FLAGS_URL_RANGE_NAME)
      this._validateRange(this.flagsUrlRange, MAX_ROWS, 1, FLAGS_URL_RANGE_NAME)
    }
    return this.flagsUrlRange
  }

  /** Lazy loads and validates the GROUPS named range, ensuring it has the correct shape and dimensions. */
  getGroupsRange() {
    if (!this.groupsRange) {
      const GROUPS_RANGE_NAME = this.GROUPS_RANGE_NAME
      this.groupsRange = this.ss.getRangeByName(GROUPS_RANGE_NAME)
      this._validateRange(this.groupsRange, MAX_ROWS, 1, GROUPS_RANGE_NAME)
    }
    return this.groupsRange
  }

  /** Returns the sheet object for the COUNTS range, which is used for all read/write operations. It is lazy-loaded. */
  getSheet() {
    if (!this.sheet) {
      this.sheet = this.getCountsRange().getSheet()
    }
    return this.sheet
  }

  /** Returns the starting row of the COUNTS range. */
  getStartRow() {
    if (!this.startRow) {
      this.getCountsRange() // ensures startRow is initialized
    }
    return this.startRow
  }

  /** Returns the starting column of the COUNTS range. */
  getStartCol() {
    if (!this.startCol) {
      this.getCountsRange() // ensures startCol is initialized
    }
    return this.startCol
  }

  /** Returns the number of rows in the COUNTS range. */
  getNumRows() {
    if (!this.numRows) {
      this.getCountsRange() // ensures numRows is initialized
    }
    return this.numRows
  }

  /** Returns the number of sticker columns in the COUNTS range. */
  getNumStickerCols() {
    if (!this.numStickerCols) {
      this.getCountsRange() // ensures numStickerCols is initialized
    }
    return this.numStickerCols
  }

  /**
   * Builds a mapping of country codes to their row and index in the named ranges.
   * @returns {Object} countryMap mapping country codes to their row and index in the named ranges.
   * Example structure of countryMap:
   *  {
   *    "FWC": { row: 1, index: 0 },
   *    "MEX": { row: 2, index: 1 }
   *  }
   * If the COUNTRIES named range contains empty rows, those rows will be skipped and not included in the country map. 
   * If there are duplicate country codes in the COUNTRIES named range, the last occurrence will overwrite previous ones 
   * in the map, which is why it is important to ensure that the COUNTRIES range is properly maintained with unique and valid 
   * country codes.
   * If the COUNTRIES named range is empty, the country map will be an empty object.
   * If there are inconsistencies in the data (e.g., missing country codes), the method will still attempt to build 
   * the country map with whatever data is available, but it will log warnings for any issues encountered during the loading process.
   */
  getCountryMap() {
    if (!this.countryMap) {
      this.countryMap = this._buildCountryMap()
    }
    return this.countryMap
  }

  /** Returns all distinct group codes in sheet order. 
   * This method retrieves all group codes from the GROUPS named range, normalizes them by trimming whitespace and 
   * converting to uppercase, and then filters out any empty values. Finally, it returns an array of unique group codes 
   * while preserving their original order in the sheet. This allows the application to provide accurate group filtering 
   * options based on the data defined in the spreadsheet.
   * Example return value: ['A', 'B', 'C']
  */
  getGroupCodes() {
    if (!this.groupCodes) {
      const groups = this.getGroupsRange().getValues()
        .map(row => String(row[0] || '').trim().toUpperCase())
        .filter(Boolean)

      this.groupCodes = Array.from(new Set(groups))
    }
    return this.groupCodes
  }

  // Main methods

  /** Returns all sticker counts for one country.
   * @param {string} countryCode - The country code to retrieve counts for.
   * This method first normalizes and validates the provided country code against the country map built from the COUNTRIES 
   * named range. 
   * It then retrieves the corresponding row of sticker counts from the COUNTS named range based on the country's index. 
   * The raw values from the sheet are converted to non-negative integers using the _toCount helper method, which ensures 
   * that any empty, null, or invalid values are treated as zero. Finally, it returns an array of sticker counts for the 
   * specified country, where each index corresponds to a sticker number (0-20).
   * @returns {Array} An array of sticker counts for the specified country, where each index corresponds to a sticker number (0-20).
   * Example return value for countryCode 'MEX': [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0]
   */
  getCountryCounts(countryCode) {
    const normalizedCountryCode = this._normalizeCountryCode(countryCode)
    const countryIndex = this.getCountryMap()[normalizedCountryCode].index
    const countValues = this.getCountsRange().getValues()[countryIndex]
    return countValues.map(value => this._toCount(value))
  }

  /** Returns one stored sticker count. 
   * @param {string} countryCode - The country code to retrieve the sticker count for.
   * @param {number} stickerNumber - The sticker number (0-20) to retrieve the count for.
   * This method first validates the provided sticker number to ensure it is an integer within the allowed range (0-20). 
   * It then normalizes and validates the provided country code against the country map built from the COUNTRIES named range. 
   * The method retrieves the corresponding row of sticker counts from the COUNTS named range based on the country's index, and then accesses the specific count for the given sticker number. The raw value from the sheet is converted to a non-negative integer using the _toCount helper method, which ensures that any empty, null, or invalid values are treated as zero. Finally, it returns the count for the specified sticker number and country.
   * @returns {number} The count of the specified sticker number for the given country.
   * Example return value for countryCode 'MEX' and stickerNumber 17: 1
  */
  getStickerCount(countryCode, stickerNumber) {
    const validStickerNumber = this._validateStickerNumber(stickerNumber)
    const normalizedCountryCode = this._normalizeCountryCode(countryCode)
    const countryIndex = this.getCountryMap()[normalizedCountryCode].index
    const countValues = this.getCountsRange().getValues()[countryIndex]

    if (!countValues) {
      throw new Error(`No count data found for country "${countryCode}"`)
    }
    return countValues.map(v => this._toCount(v))[validStickerNumber]
  }

  /** Returns all countries with group, flag, country name, and count data. It is lazy-loaded. 
   * @returns {Array} An array of country records, where each record contains the country code, group code, flag URL, 
   * country name, and an array of sticker counts. 
   * Example of a country record:
   * {
   *   code: 'MEX',
   *   countryName: 'Mexico',
   *   group: 'B',
   *   flag: 'https://example.com/flags/mexico.png',
   *   counts: [0, 1, 0, 0, 2, ...] // array of counts for stickers 0-20
   * }
   * If the COUNTRIES named range contains empty rows, those rows will be skipped and not included in
  */
  getCountries() {
    if (!this.countries) {
      this.countries = this._loadCountries()
    }
    return this.countries
  }

  /**
   * Updates multiple sticker counts using a single spreadsheet write operation.
   * The input is a sparse country-based update model where only changed sticker numbers are provided.
   * The method loads the COUNTS range once, applies every update in memory, and persists the modified
   * values with a single `setValues()` call so the operation can be undone with one Ctrl+Z action.
   * @param {{countries:Array<{code:string,counts:Object<number,number>}>}} updates
   * Canonical sticker update payload.
   * Example: { countries: [{ code:'ARG', counts:{1:2,5:4} }, { code:'BRA', counts:{3:1} }] }
   * @param {string} mode - The update mode, which can be 'update', 'clean_all', or 'replace_countries'.
   */
  updateStickerCounts(updates, mode = 'update') {
    const countries = updates && updates.countries
    if (!Array.isArray(countries) || !countries.length) return
    const range = this.getCountsRange()
    if (mode === 'clean_all') {
      range.clearContent()
    }
    const values = range.getValues()
    if (mode === 'replace_countries') {
      countries.forEach(country => {
        const index = this.getCountryMap()[this._normalizeCountryCode(country.code)].index
        values[index].fill('')
      })
    }
    countries.forEach(country => {
      const index = this.getCountryMap()[this._normalizeCountryCode(country.code)].index
      this._applyCountUpdates(country, values[index])
    })
    range.setValues(values)
  }

  /* Helper method to validate ranges with expected dimensions. */
  _validateRange(range, expectedRows, expectedCols, rangeName) {
    if (!range) {
      throw new Error(`Named range "${rangeName}" not found.`)
    }
    if (range.getNumColumns() !== expectedCols) {
      throw new Error(
        `Named range "${rangeName}" must contain exactly ${expectedCols} columns.`
      )
    }
    if (range.getNumRows() !== expectedRows) {
      throw new Error(
        `Named range "${rangeName}" must have ${expectedRows} rows.`
      )
    }
  }

  /** Builds a country map for direct lookup. 
   * @return {Object} countryMap mapping country codes to their row and index in the named ranges.
   * The country map is built by iterating through the countries defined in the COUNTRIES named range and creating an object where each key is a normalized country code, and the value is an object containing the row number in the sheet and the index of the country in the named range. This allows for efficient lookup of country data when updating counts or retrieving information based on country codes.
   * Example structure of countryMap:
   *  {"FWC": { row: 1, index: 0 },"MEX": { row: 2, index: 1 }}
  */
  _buildCountryMap() {
    const countryMap = {}
    this.getCountries().forEach((country, index) => {
      countryMap[country.code] = {
        row: this.getStartRow() + index,
        index
      }
    })
    return countryMap
  }

  /**
   * Loads all country records from the named ranges and constructs a comprehensive list of country data.
   * @returns {Array} An array of country records, where each record contains the country code, group code, flag URL, 
   * country name, and an array of sticker counts.
   * Example of a country record:
   * {code: 'MEX', countryName: 'Mexico', group: 'B', flag: 'https://example.com/flags/mexico.png',
   *  counts: [0, 1, 0, 0, 2, ...] // array of counts for stickers 0-20
   * }
   */
  _loadCountries() {
    const countryValues = this.getCountriesRange().getValues()
    const countValues = this.getCountsRange().getValues()
    const groupValues = this.getGroupsRange().getValues()
    const flagValues = this.getFlagsUrlRange().getDisplayValues()
    const countryNameValues = this.getCountryNamesRange().getDisplayValues()

    return countryValues
      .map((row, index) => {
        return this._buildCountryRecord(
          row,
          groupValues[index],
          flagValues[index],
          countryNameValues[index],
          countValues[index]
        )
      })
      .filter(Boolean)
  }

  /** Builds one country record from named range rows. */
  _buildCountryRecord(countryRow, groupRow, flagRow, countryNameRow, countRow) {
    const countryCode = String(countryRow[0] || '').trim().toUpperCase()
    if (!countryCode) {
      return null
    }
    const groupCode = String((groupRow && groupRow[0]) || '').trim().toUpperCase()
    const countryName = String(countryNameRow[0] || '').trim()

    return {
      code: countryCode,
      countryName,
      group: groupCode,
      flag: String((flagRow && flagRow[0]) || '').trim(),
      counts: (countRow ?? []).map(value => this._toCount(value))
    }
  }

  /** Normalizes and validates a country code. */
  _normalizeCountryCode(countryCode) {
    const normalizedCountryCode = String(countryCode || '').trim().toUpperCase()

    if (!this.getCountryMap()[normalizedCountryCode]) {
      throw new Error(`Country code "${countryCode}" was not found in the COUNTRIES named range.`)
    }

    return normalizedCountryCode
  }

  /** Validates one sticker number. */
  _validateStickerNumber(stickerNumber) {
    const numericStickerNumber = Number(stickerNumber)
    if (!Number.isInteger(numericStickerNumber)) {
      throw new Error(`Sticker number "${stickerNumber}" is not a valid integer.`)
    }
    if (numericStickerNumber < STICKER_MIN || numericStickerNumber > STICKER_MAX) {
      throw new Error(
        `Sticker number ${numericStickerNumber} is outside allowed range ` +
        `${STICKER_MIN}-${STICKER_MAX}.`
      );

    }
    return numericStickerNumber
  }

  /** Groups pending updates by country code. */
  _groupUpdatesByCountry(updates) {
    return updates.reduce((grouped, update) => {
      if (!grouped[update.countryCode]) {
        grouped[update.countryCode] = []
      }

      grouped[update.countryCode].push(update)
      return grouped
    }, {})
  }

  /**
   * Applies canonical sticker count updates for one country row in memory.
   * Does not read or write the spreadsheet.
   * The caller is responsible for loading and persisting the COUNTS range.
   * Invalid sticker positions for the country are reset to zero to keep row data consistent.
   * @param {{code:string,counts:Object<number,number>}} country - Country update in canonical form.
   * @param {Array} values - Current sticker count row to modify.
   * Example: { code:'ARG', counts:{1:2,5:4} }
   */
  _applyCountUpdates(country, values) {
    const bounds = StickerSheetRepository.getCountryBounds()
    const normalizedCountryCode = String(country.code).trim().toUpperCase()
    const [minSticker, maxSticker] = bounds.get(normalizedCountryCode) || bounds.get('TEAM')
    const counts = country.counts || {}
    for (let sticker = 0; sticker < values.length; sticker++) {
      // Sticker positions outside the country's allowed range must always be reset.
      // These are structural invalid values, so they are stored as numeric zero.
      // Example: TEAM countries cannot have sticker 0, FWC cannot have sticker 20.
      if (sticker < minSticker || sticker > maxSticker) {
        values[sticker] = 0
        continue
      }
      // Only update stickers explicitly included in the import payload.
      // A valid imported count of zero is represented as a blank cell in the sheet.
      // This preserves the spreadsheet convention where empty cells mean zero counts.
      if (Object.prototype.hasOwnProperty.call(counts, sticker)) {
        values[sticker] = counts[sticker] === 0 ? '' : counts[sticker]
      }
    }
  }

  /** Converts raw sheet values to non-negative counts. */
  _toCount(value) {
    const numericValue = Number(value)
    if (value === '' || value === null || Number.isNaN(numericValue) || numericValue < 0) {
      return 0
    }
    return numericValue
  }

}
