/**
 * Provides shared access to sticker sheet data stored in named ranges.
 */
class StickerSheetRepository {
  /** Creates a repository for sticker data. */
  constructor() {
    this.SHEET_NAME = 'Stickers'
    this.COUNTRIES_RANGE_NAME = 'COUNTRIES'
    this.COUNTS_RANGE_NAME = 'COUNTS'
    this.GROUPS_RANGE_NAME = 'GROUPS'
    this.FLAGS_RANGE_NAME = 'FLAGS_URL'
    this.COUNTRY_NAMES_RANGE_NAME = 'COUNTRY_NAMES'
    this.STICKER_MIN = 0
    this.STICKER_MAX = 20
    this.EXPECTED_STICKER_COLUMNS = this.STICKER_MAX - this.STICKER_MIN + 1

    this.ss = SpreadsheetApp.getActiveSpreadsheet()
    this.countriesRange = this.ss.getRangeByName(this.COUNTRIES_RANGE_NAME)
    this.countsRange = this.ss.getRangeByName(this.COUNTS_RANGE_NAME)
    this.groupsRange = this.ss.getRangeByName(this.GROUPS_RANGE_NAME)
    this.flagsRange = this.ss.getRangeByName(this.FLAGS_RANGE_NAME)
    this.countryNamesRange = this.ss.getRangeByName(this.COUNTRY_NAMES_RANGE_NAME)

    this._validateRanges()
    this.sheet = this.countsRange.getSheet()
    this.startRow = this.countsRange.getRow()
    this.startCol = this.countsRange.getColumn()
    this.numRows = this.countriesRange.getNumRows()
    this.numStickerCols = this.countsRange.getNumColumns()
    this.countryMap = this._buildCountryMap()
  }

  /** Returns all countries with group, flag, country name, and count data. */
  getCountries() {
    const countryValues = this.countriesRange.getValues()
    const countValues = this.countsRange.getValues()
    const groupValues = this.groupsRange.getValues()
    const flagFormulaValues = this.flagsRange.getFormulas()
    const flagDisplayValues = this.flagsRange.getDisplayValues()
    const countryNameValues = this.countryNamesRange.getDisplayValues()

    return countryValues
      .map((row, index) => {
        return this._buildCountryRecord(
          row,
          groupValues[index],
          flagFormulaValues[index],
          flagDisplayValues[index],
          countryNameValues[index],
          countValues[index]
        )
      })
      .filter(Boolean)
  }

  /** Returns all distinct group codes in sheet order. */
  getGroupCodes() {
    const groups = this.groupsRange.getValues()
      .map(row => String(row[0] || '').trim().toUpperCase())
      .filter(Boolean)

    return Array.from(new Set(groups))
  }

  /** Returns all sticker counts for one country. */
  getCountryCounts(countryCode) {
    const normalizedCountryCode = this._normalizeCountryCode(countryCode)
    const countryIndex = this.countryMap[normalizedCountryCode].index
    const countValues = this.countsRange.getValues()[countryIndex]
    return countValues.map(value => this._toCount(value))
  }

  /** Returns one stored sticker count. */
  getStickerCount(countryCode, stickerNumber) {
    const counts = this.getCountryCounts(countryCode)
    return counts[this._validateStickerNumber(stickerNumber)]
  }

  /** Updates multiple sticker counts in one batch write. */
  updateStickerCounts(updates) {
    const groupedUpdates = this._groupUpdatesByCountry(updates)

    Object.keys(groupedUpdates).forEach(countryCode => {
      this._updateCountryCounts(countryCode, groupedUpdates[countryCode])
    })
  }

  /** Validates required named ranges. */
  _validateRanges() {
    if (!this.countriesRange) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" not found.`)
    }

    if (!this.countsRange) {
      throw new Error(`Named range "${this.COUNTS_RANGE_NAME}" not found.`)
    }

    if (!this.groupsRange) {
      throw new Error(`Named range "${this.GROUPS_RANGE_NAME}" not found.`)
    }

    if (!this.flagsRange) {
      throw new Error(`Named range "${this.FLAGS_RANGE_NAME}" not found.`)
    }

    if (!this.countryNamesRange) {
      throw new Error(`Named range "${this.COUNTRY_NAMES_RANGE_NAME}" not found.`)
    }

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

    if (this.flagsRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.FLAGS_RANGE_NAME}" must contain exactly 1 column.`)
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

    if (this.countriesRange.getNumRows() !== this.flagsRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.FLAGS_RANGE_NAME}" must have the same number of rows.`
      )
    }

    if (this.countriesRange.getNumRows() !== this.countryNamesRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.COUNTRY_NAMES_RANGE_NAME}" must have the same number of rows.`
      )
    }
  }

  /** Builds a country map for direct lookup. */
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

  /** Builds one country record from named range rows. */
  _buildCountryRecord(countryRow, groupRow, flagFormulaRow, flagDisplayRow, countryNameRow, countRow) {
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
      flag: this._extractFlagValue(flagFormulaRow, flagDisplayRow, countryCode),
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

  /** Extracts a renderable flag value from FLAGS named range rows. */
  _extractFlagValue(flagFormulaRow, flagDisplayRow, countryCode) {
    const formulaValue = flagFormulaRow && flagFormulaRow[0] ? String(flagFormulaRow[0]).trim() : ''
    const displayValue = flagDisplayRow && flagDisplayRow[0] ? String(flagDisplayRow[0]).trim() : ''

    if (formulaValue) {
      const imageUrlMatch = formulaValue.match(/IMAGE\(\s*"([^"]+)"/i)
      if (imageUrlMatch) {
        return imageUrlMatch[1]
      }

      if (this._isUrl(formulaValue)) {
        return formulaValue
      }
    }

    if (this._isUrl(displayValue)) {
      return displayValue
    }

    if (countryCode === 'FWC') {
      return ''
    }

    return ''
  }

  /** Returns whether a text value is an http or https URL. */
  _isUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim())
  }
}

/** Returns the country name for one ISO country code. */
function getCountryNameByCode(isoCountryCode) {
  const normalizedIsoCountryCode = String(isoCountryCode || '').trim().toUpperCase()

  if (!normalizedIsoCountryCode) {
    return ''
  }

  const specialNamesByIsoCode = {
    'GB-ENG': 'England',
    'GB-SCT': 'Scotland',
    'GB-WLS': 'Wales',
    'GB-NIR': 'Northern Ireland'
  }

  if (specialNamesByIsoCode[normalizedIsoCountryCode]) {
    return specialNamesByIsoCode[normalizedIsoCountryCode]
  }

  const response = UrlFetchApp.fetch(
    `https://restcountries.com/v3.1/alpha/${normalizedIsoCountryCode}`,
    { muteHttpExceptions: true }
  )

  if (response.getResponseCode() !== 200) {
    throw new Error(`Could not resolve country name for ISO country code "${normalizedIsoCountryCode}".`)
  }

  const payload = JSON.parse(response.getContentText())
  const country = Array.isArray(payload) ? payload[0] : payload

  if (!country || !country.name || !country.name.common) {
    throw new Error(`Country name not found for ISO country code "${normalizedIsoCountryCode}".`)
  }

  return String(country.name.common).trim()
}
