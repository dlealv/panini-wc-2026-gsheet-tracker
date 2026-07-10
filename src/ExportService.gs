/** @OnlyCurrentDoc */
// src/ExportService.js

/**
 * Classes and methods for exporting sticker data in the Panini tracker.
 * This file includes:
 *  - ExportService, the GAS-facing application service responsible for
 *    reading sheet data and exposing export entry points.
 *  - ExportStickers, a pure business-logic class responsible for formatting
 *    precomputed sticker data into export text.
 *
 * NOTE: the export tag in comments indicates classes that are intended to be
 * testable, so they should not be removed or altered without consideration
 * of their role in the overall application architecture.
 */

/**
 * Encapsulates sticker export use cases for the Panini tracker.
 * @export
 */
class ExportService {
  /** Creates an export application service.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} spreadsheet Optional spreadsheet for mobile web app context.
 */
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet || null
    this.repo = null
    this.rows = null
  }

  /** Gets the sticker sheet repository instance. Lazy initializes repository on first access.*/
  getRepo() {
    if (!this.repo) {
      this.repo = new StickerSheetRepository(this.spreadsheet)
    }
    return this.repo
  }

  /** GAS entrypoint for 'Export all stickers' operation. 
   * @returns {{ success: boolean, text: string, lines: number }}
  */
  exportAllStickerData(payload) {
    const service = new ExportService()
    const includeFlags = payload && payload.includeFlags != null && payload.includeFlags !== false && payload.includeFlags !== 'false' && payload.includeFlags !== ''
    const isCompact = payload && payload.isCompact === true
    const exportStickers = new ExportStickers(service.getRows())
    const result = exportStickers.exportAllData({ includeFlags: includeFlags, isCompact: isCompact })
    return result
  }

  /** GAS entrypoint for 'Export shared list' operation. 
   * @returns {{ success: boolean, text: string, lines: number }}
  */
  exportSharedStickerData(payload) {
    const service = new ExportService()
    const includeFlags = payload && payload.includeFlags != null && payload.includeFlags !== false && payload.includeFlags !== 'false' && payload.includeFlags !== ''
    const sortByDone = payload && payload.sortByDone === true
    const isCompact = payload && payload.isCompact === true
    const exportStickers = new ExportStickers(service.getRows())
    const result = exportStickers.exportSharedData({ includeFlags: includeFlags, isCompact: isCompact, sortByDone: sortByDone })
    return result
  }

  // Getters

  /** Gets the sticker sheet repository instance. Lazy initializes the repository on first access.*/
  getRepo() {
    if (!this.repo) {
      this.repo = new StickerSheetRepository()
    }
    return this.repo
  }

  /** Lazy getter for rows to avoid unnecessary computation during initialization. 
   * Only used for export operations.
   * @returns {Array<{code:string,icon:string,done:number,counts:number[]}>}
  */
  getRows() {
    if (!this.rows) {
      this.rows = this._buildRows()
    }
    return this.rows
  }

  // Private methods

  /**
   * Builds the canonical export row model consumed by ExportStickers.
   * Centralizes all sheet-to-domain mapping required for export operations.
   * @returns {Array<{code:string,icon:string,done:number,counts:number[]}>}
   */
  _buildRows() {
    const repo = this.getRepo() // ensure repo is initialized for range access
    const countryValues = repo.getCountriesRange().getValues()
    const countValues = repo.getCountsRange().getValues()
    const doneValues = repo.getDoneRange().getValues()
    const flagValues = repo.getFlagIconsRange() ? repo.getFlagIconsRange().getDisplayValues() : []
    const rows = []
    for (let i = 0; i < countryValues.length; i++) {
      const code = String(countryValues[i][0] || '').trim().toUpperCase()
      if (!code) { continue }
      rows.push({
        code,
        icon: String(flagValues[i] && flagValues[i][0] || '').trim(),
        done: Number(doneValues[i] && doneValues[i][0]) || 0,
        counts: this._normalizeCountsRow(countValues[i])
      })
    }
    return rows
  }

  /** Normalizes a sticker count row into a fixed-size numeric array. 
   * No GAS dependent logic, purely data transformation. It ensures that the counts array has a 
   * consistent length and numeric values, filling missing entries with zeros.
   * @returns {number[]}
   */
  _normalizeCountsRow(values) {
    const SMIN = this.getRepo().STICKER_MIN
    const SMAX = this.getRepo().STICKER_MAX
    const EXPECTED_LENGTH = this.getRepo().EXPECTED_STICKER_COLUMNS
    const normalized = new Array(EXPECTED_LENGTH).fill(0)

    for (let s = SMIN; s <= SMAX; s++) {
      normalized[s] = Number(values && values[s]) || 0
    }
    return normalized
  }

}

/**
 * Encapsulates all sticker export use cases.
 * Uses a single row model as the source of truth for export operations.
 * Notes:
 * - It assumes that the input row model has already been computed and normalized,
 *   so it does not perform any validation or normalization on the input data.
 * - No GAS-dependent logic should be implemented in this class, it should purely 
 *   focus on formatting the provided data into export text.
 * @export
 */
class ExportStickers {
  /**
  * Creates an export use-case object from precomputed row data.
  * @param {Array<{ code: string, icon: string, done: number, counts: number[] }>} rows
  * Precomputed and normalized export rows.
  */
  constructor(rows) {
    this.STICKER_MIN = 0
    this.STICKER_MAX = 20
    this.EXPECTED_STICKER_COLUMNS = this.STICKER_MAX - this.STICKER_MIN + 1
    this.rows = Array.isArray(rows) ? rows : []
  }

  /**
   * Exports all owned stickers including repeat counts.
   * Returns one line per country containing owned stickers.
   * @returns {{success: boolean, text: string, lines: number}}
   */
  exportAllData({ includeFlags = false, isCompact = false } = {}) {
    const shouldIncludeFlags = includeFlags === true || includeFlags === 'true' || includeFlags === 1
    const lines = []
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]
      const items = this._filterStickerNumbersBy(row, 'owned')
      if (!items.length) { continue }
      const tokens = this._formatStickerNumbers(items, { includeRepeats: true, isCompact: isCompact })
      if (!tokens.length) { continue }
      lines.push(this._buildExportLine(row, tokens, shouldIncludeFlags))
    }
    return { success: true, text: lines.join('\n'), lines: lines.length }
  }

  /**
   * Builds shared export text for repeats/missing sticker analysis.
   * @param {Object} options - export options
   * @param {boolean} options.includeFlags - includes row icon (emoji) prefix in output line
   * @param {boolean} options.sortByDone - sorts rows by done descending
   * @param {boolean} options.isCompact - formats ranges (e.g. 1-5 instead of 1,2,3,4,5)
   * @returns {{ success: boolean, text: string, lines: number }}
   */
  exportSharedData({ includeFlags = false, isCompact = false, sortByDone = false } = {}) {
    const PREAMBLE = "Output generated by: https://bit.ly/panini-wc2026-gsheet-tracker\n"
    const shouldIncludeFlags = includeFlags === true || includeFlags === 'true' || includeFlags === 1
    const repeatLines = []
    const missingRows = [...this.rows]
    if (sortByDone) missingRows.sort((a, b) => b.done - a.done)
    const missingLines = []
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]
      const repeatItems = this._filterStickerNumbersBy(row, 'repeats')
      const repeatTokens = this._formatStickerNumbers(repeatItems, { includeRepeats: false, isCompact: isCompact })
      if (repeatTokens.length) repeatLines.push(this._buildExportLine(row, repeatTokens, shouldIncludeFlags))
    }
    for (let i = 0; i < missingRows.length; i++) {
      const row = missingRows[i]
      const missingItems = this._filterStickerNumbersBy(row, 'missing')
      const missingTokens = this._formatStickerNumbers(missingItems, { includeRepeats: false, isCompact: isCompact })
      if (missingTokens.length) missingLines.push(this._buildExportLine(row, missingTokens, shouldIncludeFlags))
    }
    const lines = []
    lines.push(PREAMBLE)
    lines.push('🔄 Repeats')
    if (repeatLines.length) for (let i = 0; i < repeatLines.length; i++) lines.push(repeatLines[i])
    else lines.push('No repeated stickers available for trade.')
    lines.push('\n❌ Missing')
    if (missingLines.length) for (let i = 0; i < missingLines.length; i++) lines.push(missingLines[i])
    else lines.push('No missing stickers, album complete. Congratulations!')
    return { success: true, text: lines.join('\n'), lines: repeatLines.length + missingLines.length }
  }

  /**
   * Filters stickers by export category.
   * Returns sticker/count pairs matching the requested category.
   * @returns {Array<{ sticker: number, count: number }>}
   */
  _filterStickerNumbersBy(row, by) {
    const out = []
    for (let s = this.STICKER_MIN; s <= this.STICKER_MAX; s++) {
      if (!this._isExportableSticker(row.code, s)) { continue }
      const n = Number(row.counts[s] || 0)
      if (by === 'owned' && n >= 1) { out.push({ sticker: s, count: n }) }
      else if (by === 'missing' && n === 0) { out.push({ sticker: s, count: 0 }) }
      else if (by === 'repeats' && n >= 2) { out.push({ sticker: s, count: n }) }
    }
    return out
  }

  /**
   * Formats sticker entries into export tokens.
   * @param {Array<{ sticker: number, count: number }>} items - Sticker/count pairs.
   * @param {Object} [options={}] - Formatting options.
   * @param {boolean} [options.includeRepeats=false] - Include repeat counts as N(X).
   * @param {boolean} [options.isCompact=false] - Compact consecutive stickers into ranges.
   * @returns {string[]}
  */
  _formatStickerNumbers(items, { includeRepeats = false, isCompact = false } = {}) {
    if (isCompact) {
      return this._compactStickerRanges(items, { includeRepeats: includeRepeats })
    }
    const out = []
    for (let i = 0; i < items.length; i++) {
      const { sticker, count } = items[i]
      if (count >= 2) {
        out.push(includeRepeats ? `${sticker}(${count})` : String(sticker))
      } else {
        out.push(String(sticker))
      }
    }
    return out
  }

  /**
  * Compacts consecutive stickers into ranges. When includeRepeats is false, 
  * it simply compacts consecutive sticker numbers into ranges (e.g. 1-5) without providing the repeat count.
  * When includeRepeats is true, it also groups consecutive stickers with the same repeat count.
  * into ranges (e.g. 1-5(2) for stickers 1 to 5 all having a count of 2).
  * Examples: 
  * [0(2),1(2),2(2),4,5,9] => ['0-2', '4-5', '9'] when includeRepeats is false.
  * [0(2),1(2),2(2),4,5,9] => ['0-2(2)', '4-5', '9'] when includeRepeats is true.
  * @param {Array<{ sticker: number, count: number }>} items - Sticker/count pairs. Assumed unsorted.
  * @param {Object} [options={}] - Formatting options.
  * @param {boolean} [options.includeRepeats=false] - Include repeat counts as N(X)/A-B(X) in the range token.
  * @returns {string[]}
  */
  _compactStickerRanges(items, { includeRepeats = false } = {}) {
    if (!items.length) { return [] }
    items = [...items].sort((a, b) => a.sticker - b.sticker)
    const ranges = []
    let startItem = items[0]
    let endItem = items[0]
    for (let i = 1; i < items.length; i++) {
      const currentItem = items[i]
      const isConsecutive = currentItem.sticker === endItem.sticker + 1
      const sameCount = currentItem.count === startItem.count
      if (isConsecutive && (!includeRepeats || sameCount)) {
        endItem = currentItem
        continue
      }
      let value = startItem.sticker === endItem.sticker ? String(startItem.sticker)
        : `${startItem.sticker}-${endItem.sticker}`
      if (includeRepeats && startItem.count > 1) {
        value += `(${startItem.count})`
      }
      ranges.push(value)
      startItem = currentItem
      endItem = currentItem
    }
    let value = startItem.sticker === endItem.sticker ? String(startItem.sticker) : `${startItem.sticker}-${endItem.sticker}`
    if (includeRepeats && startItem.count > 1) {
      value += `(${startItem.count})`
    }
    ranges.push(value)
    return ranges
  }

  /**
   * Builds one export line for a country.
   * Returns the formatted export line.
   * @returns {string}
   */
  _buildExportLine(row, stickerTokens, shouldIncludeFlags) {
    const code = row.code
    const icon = row.icon
    const baseLine = [code].concat(stickerTokens).join(',')
    if (!shouldIncludeFlags) { return baseLine }
    if (!icon) { return baseLine }
    return `${icon} ${baseLine}`
  }

  /**
   * Checks whether a sticker number is valid for export.
   * Returns true when the sticker belongs to the country range.
   * @returns {boolean}
   */
  _isExportableSticker(countryCode, stickerNumber) {
    if (countryCode === 'FWC') { return stickerNumber >= 0 && stickerNumber <= 19 }
    return stickerNumber >= 1 && stickerNumber <= 20
  }

}

