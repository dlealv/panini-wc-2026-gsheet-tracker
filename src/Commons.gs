/** @OnlyCurrentDoc */
//src/Commons.gs

/**
 * Provides shared spreadsheet access, named range validation, and common lookup utilities.
 * This file centralizes reusable data access for import/export and Quick Entry flows.
 * NOTE: the export tag in comments indicates methods that are intended to be testable and exposed for 
 * external use, so they should not be removed or altered without consideration of their role in the overall 
 * application architecture.
 */

/** Provides shared access to sticker sheet data stored in named ranges. 
 * @export
 */
class StickerSheetRepository {
  /** Creates a repository for sticker data. */
  constructor() {
    this.COUNTRIES_RANGE_NAME = 'COUNTRIES'
    this.COUNTS_RANGE_NAME = 'COUNTS'
    this.GROUPS_RANGE_NAME = 'GROUPS'
    this.FLAGS_URL_RANGE_NAME = 'FLAGS_URL'
    this.FLAG_ICONS_RANGE_NAME = 'FLAG_ICONS'
    this.COUNTRY_NAMES_RANGE_NAME = 'COUNTRY_NAMES'
    this.DONE_RANGE_NAME = 'DONE'
    this.STICKER_MIN = 0
    this.STICKER_MAX = 20
    this.EXPECTED_STICKER_COLUMNS = this.STICKER_MAX - this.STICKER_MIN + 1

    this.ss = SpreadsheetApp.getActiveSpreadsheet()
    this.countriesRange = this.ss.getRangeByName(this.COUNTRIES_RANGE_NAME)
    this.countsRange = this.ss.getRangeByName(this.COUNTS_RANGE_NAME)
    this.groupsRange = this.ss.getRangeByName(this.GROUPS_RANGE_NAME)
    this.flagsUrlRange = this.ss.getRangeByName(this.FLAGS_URL_RANGE_NAME)
    this.flagIconsRange = this.ss.getRangeByName(this.FLAG_ICONS_RANGE_NAME)
    this.countryNamesRange = this.ss.getRangeByName(this.COUNTRY_NAMES_RANGE_NAME)
    this.doneRange = this.ss.getRangeByName(this.DONE_RANGE_NAME)

    this._validateRanges()
    this.sheet = this.countsRange.getSheet()
    this.startRow = this.countsRange.getRow()
    this.startCol = this.countsRange.getColumn()
    this.numRows = this.countriesRange.getNumRows()
    this.numStickerCols = this.countsRange.getNumColumns()
    this.countryMap = this._buildCountryMap()
  }

  // Getters for named ranges and sheet info
  getCountriesRange() { return this.countriesRange }
  getCountsRange() { return this.countsRange }
  getDoneRange() { return this.doneRange }
  getFlagIconsRange() { return this.flagIconsRange }
  getFlagsUrlRange() { return this.flagsUrlRange }
  getCountryNamesRange() { return this.countryNamesRange }
  getSheet() { return this.sheet }
  getStartRow() { return this.startRow }
  getStartCol() { return this.startCol }
  getNumRows() { return this.numRows }
  getNumStickerCols() { return this.numStickerCols }

  /** Returns all distinct group codes in sheet order. 
   * This method retrieves all group codes from the GROUPS named range, normalizes them by trimming whitespace and 
   * converting to uppercase, and then filters out any empty values. Finally, it returns an array of unique group codes 
   * while preserving their original order in the sheet. This allows the application to provide accurate group filtering 
   * options based on the data defined in the spreadsheet.
   * Example return value: ['A', 'B', 'C']
   * If the GROUPS range contains duplicate or empty values, they will be filtered out and only unique, non-empty group 
   * codes will be returned.
   * For instance, if the GROUPS range has values ['A', 'B', 'A', '', 'C'], the method will return ['A', 'B', 'C'].
   * If the GROUPS range is empty or contains only empty values, the method will return an empty array.
   * If the GROUPS range contains values with extra whitespace or mixed case (e.g., [' a ', 'B', 'c ']), the method 
   * will normalize them to ['A', 'B', 'C'] before returning.
  */
  getGroupCodes() {
    const groups = this.groupsRange.getValues()
      .map(row => String(row[0] || '').trim().toUpperCase())
      .filter(Boolean)
    return Array.from(new Set(groups))
  }


  /** Returns all sticker counts for one country.
   * @param {string} countryCode - The country code to retrieve counts for.
   * This method first normalizes and validates the provided country code against the country map built from the COUNTRIES 
   * named range. 
   * It then retrieves the corresponding row of sticker counts from the COUNTS named range based on the country's index. 
   * The raw values from the sheet are converted to non-negative integers using the _toCount helper method, which ensures 
   * that any empty, null, or invalid values are treated as zero. Finally, it returns an array of sticker counts for the 
   * specified country, where each index corresponds to a sticker number (0-20).
   */
  getCountryCounts(countryCode) {
    const normalizedCountryCode = this._normalizeCountryCode(countryCode)
    const countryIndex = this.countryMap[normalizedCountryCode].index
    const countValues = this.countsRange.getValues()[countryIndex]
    return countValues.map(value => this._toCount(value))
  }

  /** Returns one stored sticker count. */
  getStickerCount(countryCode, stickerNumber) {
    const validStickerNumber = this._validateStickerNumber(stickerNumber)
    const normalizedCountryCode = this._normalizeCountryCode(countryCode)
    const countryIndex = this.countryMap[normalizedCountryCode].index
    const countValues = this.countsRange.getValues()[countryIndex]

    if (!countValues) {
      throw new Error(`No count data found for country "${countryCode}"`)
    }
    return countValues.map(v => this._toCount(v))[validStickerNumber]
  }

  /** Updates multiple sticker counts in one batch write. 
   * @param {Array} updates - An array of update objects, each containing a countryCode, stickerNumber, and count.
   * The method first groups the updates by country code to minimize the number of sheet writes. Then, for each country, 
   * it retrieves the current sticker counts from the sheet, applies all relevant updates to the in-memory array, 
   * and writes the updated counts back to the sheet in a single operation. This approach optimizes performance by 
   * reducing the number of interactions with the spreadsheet, which can be slow if done repeatedly for individual updates.
   * Example of updates parameter:
   * [
   *   { countryCode: 'ARG', stickerNumber: 1, count: 2 },
   *   { countryCode: 'BRA', stickerNumber: 3, count: 1 },
   *   { countryCode: 'ARG', stickerNumber: 5, count: 4 }
   * ]
   * In this example, the method would group updates for 'ARG' together and apply them in one write, and then 
   * apply the update for 'BRA' in another write.
  */
  updateStickerCounts(updates) {
    const groupedUpdates = this._groupUpdatesByCountry(updates)
    Object.keys(groupedUpdates).forEach(countryCode => {
      this._updateCountryCounts(countryCode, groupedUpdates[countryCode])
    })
  }

  /** Validates required named ranges. */
  _validateRanges() {
    if (!this.countriesRange) { throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" not found.`) }
    if (!this.countsRange) { throw new Error(`Named range "${this.COUNTS_RANGE_NAME}" not found.`) }
    if (!this.groupsRange) { throw new Error(`Named range "${this.GROUPS_RANGE_NAME}" not found.`) }
    if (!this.flagsUrlRange) { throw new Error(`Named range "${this.FLAGS_URL_RANGE_NAME}" not found.`) }
    if (!this.flagIconsRange) { throw new Error(`Named range "${this.FLAG_ICONS_RANGE_NAME}" not found.`) }
    if (!this.countryNamesRange) { throw new Error(`Named range "${this.COUNTRY_NAMES_RANGE_NAME}" not found.`) }
    if (!this.doneRange) { throw new Error(`Named range "${this.DONE_RANGE_NAME}" not found.`) }

    this._validateRangeShape()
  }

  /** Validates named range dimensions. */
  _validateRangeShape() {
    if (this.countriesRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" must contain exactly 1 column.`)
    }
    if (this.groupsRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.GROUPS_RANGE_NAME}" must contain exactly 1 column.`)
    }
    if (this.flagsUrlRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.FLAGS_URL_RANGE_NAME}" must contain exactly 1 column.`)
    }
    if (this.countryNamesRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.COUNTRY_NAMES_RANGE_NAME}" must contain exactly 1 column.`)
    }
    if (this.countsRange.getNumColumns() !== this.EXPECTED_STICKER_COLUMNS) {
      throw new Error(
        `Named range "${this.COUNTS_RANGE_NAME}" must contain exactly ${this.EXPECTED_STICKER_COLUMNS} columns.`
      )
    }
    if (this.countriesRange.getNumRows() !== this.countsRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.COUNTS_RANGE_NAME}" must have the same number of rows.`
      )
    }
    if (this.countriesRange.getNumRows() !== this.groupsRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.GROUPS_RANGE_NAME}" must have the same number of rows.`
      )
    }
    if (this.countriesRange.getNumRows() !== this.flagsUrlRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.FLAGS_URL_RANGE_NAME}" must have the same number of rows.`
      )
    }
    if (this.countriesRange.getNumRows() !== this.countryNamesRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.COUNTRY_NAMES_RANGE_NAME}" must have the same number of rows.`
      )
    }
  }

  /** Builds a country map for direct lookup. 
   * @return {Object} countryMap mapping country codes to their row and index in the named ranges.
   * The country map is built by iterating through the countries defined in the COUNTRIES named range and creating an object where each key is a normalized country code, and the value is an object containing the row number in the sheet and the index of the country in the named range. This allows for efficient lookup of country data when updating counts or retrieving information based on country codes.
   * Example structure of countryMap:
   *  {
   *    "FWC": { row: 1, index: 0 },
   *    "MEX": { row: 2, index: 1 }
   *  }
  */
  _buildCountryMap() {
    const countryMap = {}
    this.getCountries().forEach((country, index) => {
      countryMap[country.code] = {
        row: this.startRow + index,
        index
      }
    })
    return countryMap
  }

  /** Returns all countries with group, flag, country name, and count data. */
  getCountries() {
    const countryValues = this.countriesRange.getValues()
    const countValues = this.countsRange.getValues()
    const groupValues = this.groupsRange.getValues()
    const flagValues = this.flagsUrlRange.getDisplayValues()
    const countryNameValues = this.countryNamesRange.getDisplayValues()

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
    const groupCode = String(groupRow[0] || '').trim().toUpperCase()
    const countryName = String(countryNameRow[0] || '').trim()

    return {
      code: countryCode,
      countryName,
      group: groupCode,
      flag: String(flagRow[0] || '').trim(),
      counts: countRow.map(value => this._toCount(value))
    }
  }

  /** Normalizes and validates a country code. */
  _normalizeCountryCode(countryCode) {
    const normalizedCountryCode = String(countryCode || '').trim().toUpperCase()

    if (!this.countryMap[normalizedCountryCode]) {
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
    if (numericStickerNumber < this.STICKER_MIN || numericStickerNumber > this.STICKER_MAX) {
      throw new Error(`Sticker number ${numericStickerNumber} is outside allowed range 0-20.`)
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

  /** Applies all sticker updates for one country. */
  _updateCountryCounts(countryCode, updates) {
    const normalizedCountryCode = this._normalizeCountryCode(countryCode)
    const row = this.countryMap[normalizedCountryCode].row
    const range = this.sheet.getRange(row, this.startCol, 1, this.numStickerCols)
    const currentValues = range.getValues()[0]
    const updatedValues = currentValues.slice()

    updates.forEach(update => {
      const stickerNumber = this._validateStickerNumber(update.stickerNumber)
      updatedValues[stickerNumber] = update.count
    })
    range.setValues([updatedValues])
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
