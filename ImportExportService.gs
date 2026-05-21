/** @OnlyCurrentDoc */

/**
 * Encapsulates sticker import and export use cases for the Panini tracker.
 * This file contains the import/export application service and the input parser.
 */
class ImportExportService {
  /** Creates an import/export application service. */
  constructor() {
    this.SHEET_NAME = 'Stickers'
    this.COUNTRIES_RANGE_NAME = 'COUNTRIES'
    this.COUNTS_RANGE_NAME = 'COUNTS'
    this.FLAG_ICONS_RANGE_NAME = 'FLAG_ICONS'
    this.STICKER_MIN = 0
    this.STICKER_MAX = 20
    this.EXPECTED_STICKER_COLUMNS = this.STICKER_MAX - this.STICKER_MIN + 1

    this.ss = SpreadsheetApp.getActiveSpreadsheet()
    this.countriesRange = this.ss.getRangeByName(this.COUNTRIES_RANGE_NAME)
    this.countsRange = this.ss.getRangeByName(this.COUNTS_RANGE_NAME)
    this.flagIconsRange = this.ss.getRangeByName(this.FLAG_ICONS_RANGE_NAME)

    if (!this.countriesRange) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" not found.`)
    }

    if (!this.countsRange) {
      throw new Error(`Named range "${this.COUNTS_RANGE_NAME}" not found.`)
    }

    this.sheet = this.countsRange.getSheet()

    this._validateNamedRanges()

    this.startRow = this.countriesRange.getRow()
    this.numRows = this.countriesRange.getNumRows()
    this.countryCol = this.countriesRange.getColumn()
    this.startCol = this.countsRange.getColumn()
    this.numStickerCols = this.countsRange.getNumColumns()
    this.countryMap = this._buildCountryMap()
    this.flagIconMap = this._buildFlagIconMap()
  }

  /** Parses input and returns a preview payload without modifying the sheet. */
  preview(text) {
    const parser = new StickerInputParser(this.countryMap)
    const parsed = parser.parse(text)

    return {
      success: true,
      countries: parsed.map(item => ({
        code: item.code,
        stickers: Object.keys(item.counts)
          .map(Number)
          .sort((a, b) => a - b)
          .map(number => ({
            number,
            count: item.counts[number]
          }))
      }))
    }
  }

  /** Imports validated sticker data into the sheet using the selected mode. */
  import(text, mode) {
    const normalizedMode = mode || 'update'
    const parser = new StickerInputParser(this.countryMap)
    const parsed = parser.parse(text)

    if (normalizedMode === 'clean_all') {
      this._clearAllCounts()
    } else if (normalizedMode === 'replace_countries') {
      this._clearCountries(parsed)
    } else if (normalizedMode !== 'update') {
      throw new Error(`Invalid import mode "${normalizedMode}".`)
    }

    this._writeCountries(parsed)

    return {
      success: true,
      message: `Imported ${parsed.length} country row(s) successfully.`
    }
  }

  /** Exports sheet data using the same syntax as the import input format. */
  exportData(includeFlags) {
    const shouldIncludeFlags = Boolean(includeFlags)
    const countryValues = this.countriesRange.getValues()
    const countValues = this.countsRange.getValues()
    const lines = []

    for (let rowIndex = 0; rowIndex < this.numRows; rowIndex++) {
      const code = String(countryValues[rowIndex][0] || '').trim().toUpperCase()
      if (!code) {
        continue
      }

      const stickerTokens = this._buildExportStickerTokens(code, countValues[rowIndex])
      if (stickerTokens.length > 0) {
        lines.push(this._buildExportLine(code, stickerTokens, shouldIncludeFlags))
      }
    }

    return {
      success: true,
      text: lines.join('\n'),
      lines: lines.length
    }
  }

  /** Validates the named ranges used by the import/export flow. */
  _validateNamedRanges() {
    if (this.countriesRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" must contain exactly 1 column.`)
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

    if (this.flagIconsRange) {
      if (this.flagIconsRange.getNumColumns() !== 1) {
        throw new Error(`Named range "${this.FLAG_ICONS_RANGE_NAME}" must contain exactly 1 column.`)
      }

      if (this.flagIconsRange.getNumRows() !== this.countriesRange.getNumRows()) {
        throw new Error(
          `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.FLAG_ICONS_RANGE_NAME}" must have the same number of rows.`
        )
      }
    }
  }

  /** Builds a map of country code to row metadata. */
  _buildCountryMap() {
    const values = this.countriesRange.getValues()
    const countryMap = {}

    values.forEach((row, index) => {
      const code = String(row[0] || '').trim().toUpperCase()
      if (!code) {
        return
      }

      countryMap[code] = {
        row: this.countsRange.getRow() + index,
        index
      }
    })

    return countryMap
  }

  /** Builds a map of country code to flag icon. */
  _buildFlagIconMap() {
    const flagIconMap = {}
    if (!this.flagIconsRange) {
      return flagIconMap
    }

    const countryValues = this.countriesRange.getValues()
    const flagValues = this.flagIconsRange.getDisplayValues()

    countryValues.forEach((row, index) => {
      const code = String(row[0] || '').trim().toUpperCase()
      const icon = String(flagValues[index][0] || '').trim()

      if (!code || !icon) {
        return
      }

      flagIconMap[code] = icon
    })

    return flagIconMap
  }

  /** Clears all sticker count values in the counts range. */
  _clearAllCounts() {
    this.countsRange.clearContent()
  }

  /** Clears sticker counts for countries present in the import payload. */
  _clearCountries(parsedRows) {
    parsedRows.forEach(item => {
      const row = this.countryMap[item.code].row
      this.sheet
        .getRange(row, this.startCol, 1, this.numStickerCols)
        .clearContent()
    })
  }

  /** Writes parsed sticker counts into the sheet preserving untouched cells. */
  _writeCountries(parsedRows) {
    parsedRows.forEach(item => {
      const row = this.countryMap[item.code].row
      const range = this.sheet.getRange(row, this.startCol, 1, this.numStickerCols)
      const currentValues = range.getValues()[0]
      const outputValues = currentValues.slice()

      Object.keys(item.counts).forEach(key => {
        const stickerNumber = Number(key)
        const mappedCount = item.counts[key]
        const offset = stickerNumber

        if (offset < 0 || offset >= this.numStickerCols) {
          throw new Error(`Sticker number ${stickerNumber} is outside the writable range.`)
        }

        outputValues[offset] = mappedCount
      })

      range.setValues([outputValues])
    })
  }

  /** Builds one export line for a country. */
  _buildExportLine(countryCode, stickerTokens, shouldIncludeFlags) {
    const lineTokens = [countryCode].concat(stickerTokens)
    if (!shouldIncludeFlags) {
      return lineTokens.join(',')
    }

    const flagIcon = this.flagIconMap[countryCode]
    if (!flagIcon) {
      return lineTokens.join(',')
    }

    return [flagIcon, lineTokens[0]].concat(lineTokens.slice(1)).join(',')
  }

  /** Builds export tokens for one row of sticker counts. */
  _buildExportStickerTokens(countryCode, rowCounts) {
    const stickerTokens = []

    for (let sticker = this.STICKER_MIN; sticker <= this.STICKER_MAX; sticker++) {
      if (!this._isExportableSticker(countryCode, sticker)) {
        continue
      }

      const cellValue = rowCounts[sticker]
      const numericValue = Number(cellValue)

      if (cellValue === '' || cellValue === null || Number.isNaN(numericValue) || numericValue <= 0) {
        continue
      }

      if (numericValue === 1) {
        stickerTokens.push(String(sticker))
      } else {
        stickerTokens.push(`${sticker}(${numericValue})`)
      }
    }

    return stickerTokens
  }

  /** Returns whether one sticker number is valid for export for the country code. */
  _isExportableSticker(countryCode, stickerNumber) {
    if (countryCode === 'FWC') {
      return stickerNumber >= 0 && stickerNumber <= 19
    }

    return stickerNumber >= 1 && stickerNumber <= 20
  }

}


/**
 * Parses raw import text and converts it into validated country and sticker counts.
 */
class StickerInputParser {
  /** Creates a parser using the available country codes. */
  constructor(countryMap) {
    this.countryMap = countryMap
    this.tokenRegex = /^(\d+)(?:\((\d+)\))?$/
    this.rangeRegex = /^(\d+)-(\d+)$/
    this.rangeWithCountRegex = /^(\d+)-(\d+)\((\d+)\)$/
    this.flagPrefixRegex = /^(\p{Regional_Indicator}{2}|\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u
  }

  /** Parses and validates the full import payload. */
  parse(text) {
    const normalized = String(text || '').replace(/\r\n/g, '\n').trim()
    if (!normalized) {
      throw new Error('No input provided. Paste content or upload a file.')
    }

    const lines = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)

    if (!lines.length) {
      throw new Error('Input is empty.')
    }

    const seen = new Set()
    const parsed = []

    lines.forEach((line, lineIndex) => {
      parsed.push(this._parseLine(line, lineIndex, seen))
    })

    return parsed
  }

  /** Parses one input line into a validated country record. */
  _parseLine(line, lineIndex, seen) {
    if (line.includes(';')) {
      throw new Error(`Line ${lineIndex + 1}: invalid delimiter ";". Use comma only.`)
    }

    const parts = line.split(',').map(part => part.trim())
    if (parts.length < 2) {
      throw new Error(`Line ${lineIndex + 1}: expected COUNTRY_CODE plus at least one sticker token.`)
    }

    const codeRaw = parts[0]
    const normalizedCodeRaw = this._stripOptionalFlagIcon(codeRaw)
    const code = normalizedCodeRaw.toUpperCase()

    this._validateCountryCode(codeRaw, code, lineIndex, seen)

    const counts = {}
    for (let partIndex = 1; partIndex < parts.length; partIndex++) {
      this._parseStickerToken(parts[partIndex], lineIndex, code, counts)
    }

    return { code, counts }
  }

  /** Removes one optional leading flag icon from the first token. */
  _stripOptionalFlagIcon(codeRaw) {
    return String(codeRaw || '').replace(this.flagPrefixRegex, '').trim()
  }

  /** Validates one country code token. */
  _validateCountryCode(codeRaw, code, lineIndex, seen) {
    if (!/^[A-Z]{3}$/.test(code)) {
      throw new Error(`Line ${lineIndex + 1}: invalid country code "${codeRaw}".`)
    }

    if (!this.countryMap[code]) {
      throw new Error(`Line ${lineIndex + 1}: country code "${code}" not found in the COUNTRIES named range.`)
    }

    if (seen.has(code)) {
      throw new Error(`Line ${lineIndex + 1}: duplicate country code "${code}" in input.`)
    }

    seen.add(code)
  }

  /** Parses one sticker token into the counts object. */
  _parseStickerToken(token, lineIndex, code, counts) {
    if (!token) {
      throw new Error(`Country "${code}": empty token detected. Check comma placement.`)
    }

    const expandedTokens = this._expandStickerToken(token, code)

    expandedTokens.forEach(expandedToken => {
      const match = expandedToken.match(this.tokenRegex)
      if (!match) {
        throw new Error(
          `Country "${code}": invalid token "${token}". Use N, N(X), or ranges like 1-4.`
        )
      }

      const stickerNumber = Number(match[1])
      const explicitCount = match[2] ? Number(match[2]) : null

      this._validateStickerNumber(stickerNumber, code)
      this._validateExplicitCount(explicitCount, expandedToken, code)

      if (counts[stickerNumber] != null) {
        throw new Error(`Country "${code}": sticker ${stickerNumber} appears more than once.`)
      }

      counts[stickerNumber] = this._mapTokenToCount(code, stickerNumber, explicitCount)
    })
  }

  /** Expands one sticker token to one or more normalized tokens. */
  _expandStickerToken(token, code) {
    const rangeWithCountMatch = token.match(this.rangeWithCountRegex)
    if (rangeWithCountMatch) {
      const startSticker = Number(rangeWithCountMatch[1])
      const endSticker = Number(rangeWithCountMatch[2])
      const explicitCount = Number(rangeWithCountMatch[3])

      this._validateRange(startSticker, endSticker, token, code)
      return this._buildExpandedRange(startSticker, endSticker, explicitCount)
    }

    const rangeMatch = token.match(this.rangeRegex)
    if (rangeMatch) {
      const startSticker = Number(rangeMatch[1])
      const endSticker = Number(rangeMatch[2])

      this._validateRange(startSticker, endSticker, token, code)
      return this._buildExpandedRange(startSticker, endSticker, null)
    }

    return [token]
  }

  /** Builds expanded tokens for one sticker range. */
  _buildExpandedRange(startSticker, endSticker, explicitCount) {
    const expandedTokens = []

    for (let stickerNumber = startSticker; stickerNumber <= endSticker; stickerNumber++) {
      if (explicitCount === null) {
        expandedTokens.push(String(stickerNumber))
      } else {
        expandedTokens.push(`${stickerNumber}(${explicitCount})`)
      }
    }

    return expandedTokens
  }

  /** Validates one sticker range token. */
  _validateRange(startSticker, endSticker, token, code) {
    if (!Number.isInteger(startSticker) || !Number.isInteger(endSticker)) {
      throw new Error(`Country "${code}": invalid range "${token}".`)
    }

    if (startSticker > endSticker) {
      throw new Error(`Country "${code}": invalid range "${token}". Start must be less than or equal to end.`)
    }

    this._validateStickerNumber(startSticker, code)
    this._validateStickerNumber(endSticker, code)
  }

  /** Validates one sticker number. */
  _validateStickerNumber(stickerNumber, code) {
    if (!Number.isInteger(stickerNumber) || stickerNumber < 0 || stickerNumber > 20) {
      throw new Error(`Country "${code}": sticker number ${stickerNumber} is outside allowed range 0-20.`)
    }
  }

  /** Validates one explicit repeat count. */
  _validateExplicitCount(explicitCount, token, code) {
    if (explicitCount !== null && (!Number.isInteger(explicitCount) || explicitCount < 0)) {
      throw new Error(`Country "${code}": invalid repeat count in "${token}".`)
    }
  }

  /** Maps a parsed sticker token to the final count written into the sheet. */
  _mapTokenToCount(code, stickerNumber, explicitCount) {
    if (stickerNumber === 0) {
      if (code === 'FWC') {
        return explicitCount !== null ? explicitCount : 1
      }

      return 0
    }

    if (stickerNumber === 20) {
      if (code === 'FWC') {
        return 0
      }

      return explicitCount !== null ? explicitCount : 1
    }

    return explicitCount !== null ? explicitCount : 1
  }
}
