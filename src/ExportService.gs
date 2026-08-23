/** @OnlyCurrentDoc */
// src/ExportService.js

/**
 * Classes and methods for exporting sticker data in the Panini tracker.
 * This file includes:
 *  - ExportService, the GAS-facing application service responsible for
 *    reading sheet data and exposing export entry points.
 *  - ExportStickers, a pure business-logic class responsible for formatting
 *    precomputed sticker data into export text.
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
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet=} ss - Optional spreadsheet instance.
 *   Pass an explicit instance when operating from a web app context where
 *   getActiveSpreadsheet() returns null. Omit for normal dialog context.
 */
  constructor(ss) {
    this.ss = ss || null
    this.repo = null
    this.rows = null
  }

  /** 
   * GAS entrypoint for 'Export all stickers' operation.
   * @param {{includeFlags:(boolean|string), isCompact:boolean}} payload - Export options.
   * Example: {includeFlags:true, isCompact:false}
   * @returns {{ success: boolean, text: string, lines: number }}
   * Example: {success:true, text:'🇲🇽 MEX,1,2(3),5-7\nARG,1-3(2),5', lines:2}
  */
  exportAllStickerData(payload) {
    const includeFlags = payload && payload.includeFlags != null && payload.includeFlags !== false
      && payload.includeFlags !== 'false' && payload.includeFlags !== ''
    const isCompact = payload && payload.isCompact === true
    const exportStickers = new ExportStickers(this.getRows())
    const result = exportStickers.exportAllData({ includeFlags: includeFlags, isCompact: isCompact })
    return result
  }

  /** 
   * GAS entrypoint for 'Export shared list' operation.
   * @param {{includeFlags:(boolean|string), isCompact:boolean, sortByDone:boolean}} payload - Export options.
   * Example: {includeFlags:false, isCompact:true, sortByDone:true}
   * @returns {{ success: boolean, text: string, lines: number }}
   * Example: {success:true, text:'MEX,7(2)\nARG,15', lines:2}
  */
  exportSharedStickerData(payload) {
    const includeFlags = payload && payload.includeFlags != null && payload.includeFlags !== false
      && payload.includeFlags !== 'false' && payload.includeFlags !== ''
    const sortByDone = payload && payload.sortByDone === true
    const isCompact = payload && payload.isCompact === true
    const exportStickers = new ExportStickers(this.getRows())
    const result = exportStickers.exportSharedData({
      includeFlags: includeFlags,
      isCompact: isCompact, sortByDone: sortByDone
    })
    return result
  }

  // Getters

  /** Gets the sticker sheet repository instance. Lazy initializes the repository on first access.*/
  getRepo() {
    if (!this.repo) {
      this.repo = this.ss ? new StickerSheetRepository(this.ss) : new StickerSheetRepository()
    }
    return this.repo
  }

  /** 
   * Lazy getter for rows to avoid unnecessary computation during initialization.
   * Only used for export operations.
   * @returns {Array<{code:string,icon:string,done:number,counts:Map<number,number>}>}
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
   * Built entirely from a single StickerSheetRepository.getCountries() call, never a raw named range - export
   * only needs code/counts/icon/done, never the country identity fields (name/group/flag), so those are
   * explicitly excluded rather than carried along unused. `onlyVisible: true` narrows each country's `counts`
   * to its own valid sticker range up front, so a row never contains an invalid sticker position for its
   * country in the first place - ExportStickers can filter owned/missing/repeats without a separate per-position
   * validity check.
   * @returns {Array<{code:string,icon:string,done:number,counts:Map<number,number>}>}
   */
  _buildRows() {
    return this.getRepo().getCountries({
      onlyVisible: true, includeName: false, includeGroup: false,
      includeFlag: false, includeIcon: true, includeDone: true
    })
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
  * @param {Array<{ code: string, icon: string, done: number, counts: Map<number,number> }>} rows
  * Precomputed and normalized export rows.
  */
  constructor(rows) {
    this.STICKER_MIN = StickerSheetRepository.getStickerMin()
    this.STICKER_MAX = StickerSheetRepository.getStickerMax()
    this.EXPECTED_STICKER_COLUMNS = StickerSheetRepository.getExpectedStickerColumns()
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
      const items = this.filterStickerNumbersBy(row, 'owned')
      if (!items.length) { continue }
      const tokens = this._formatStickerNumbers(items, { includeRepeats: true, isCompact: isCompact })
      if (!tokens.length) { continue }
      lines.push(this._buildExportLine(row, tokens, shouldIncludeFlags))
    }
    return { success: true, text: lines.join('\n'), lines: lines.length }
  }

  /**
   * Builds shared export text for repeats/missing sticker analysis. Each section header includes the total
   * count of distinct repeated/missing sticker numbers across all countries, e.g. "🔄 Repeats (5)".
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
    let repeatTotal = 0
    let missingTotal = 0
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]
      const repeatItems = this.filterStickerNumbersBy(row, 'repeats')
      repeatTotal += repeatItems.length
      const repeatTokens = this._formatStickerNumbers(repeatItems, { includeRepeats: false, isCompact: isCompact })
      if (repeatTokens.length) repeatLines.push(this._buildExportLine(row, repeatTokens, shouldIncludeFlags))
    }
    for (let i = 0; i < missingRows.length; i++) {
      const row = missingRows[i]
      const missingItems = this.filterStickerNumbersBy(row, 'missing')
      missingTotal += missingItems.length
      const missingTokens = this._formatStickerNumbers(missingItems, { includeRepeats: false, isCompact: isCompact })
      if (missingTokens.length) missingLines.push(this._buildExportLine(row, missingTokens, shouldIncludeFlags))
    }
    const lines = []
    lines.push(PREAMBLE)
    lines.push(`🔄 Repeats (${repeatTotal})`)
    if (repeatLines.length) for (let i = 0; i < repeatLines.length; i++) lines.push(repeatLines[i])
    else lines.push('No repeated stickers available for trade.')
    lines.push(`\n❌ Missing (${missingTotal})`)
    if (missingLines.length) for (let i = 0; i < missingLines.length; i++) lines.push(missingLines[i])
    else lines.push('No missing stickers, album complete. Congratulations!')
    return { success: true, text: lines.join('\n'), lines: repeatLines.length + missingLines.length }
  }

  /**
   * Filters stickers by export category.
   * Returns number/count pairs matching the requested category. Iterates the row's own `counts` Map directly
   * (in ascending sticker-number order) - no per-position validity check is needed here, since `_buildRows()`
   * already narrows `counts` to only the sticker positions valid for that row's country (see getCountries()'s
   * `onlyVisible: true`).
   * @param {{code:string,counts:Map<number,number>}} row - Export row (see ExportService._buildRows()).
   * @param {string} by - Category to filter by: 'owned' (count >= 1), 'missing' (count === 0), or
   *  'repeats' (count >= 2).
   * @returns {Array<{ number: number, count: number }>}
   */
  filterStickerNumbersBy(row, by) {
    const out = []
    for (const [number, count] of row.counts) {
      if (by === 'owned' && count >= 1) { out.push({ number, count }) }
      else if (by === 'missing' && count === 0) { out.push({ number, count: 0 }) }
      else if (by === 'repeats' && count >= 2) { out.push({ number, count }) }
    }
    return out
  }

  /**
   * Formats sticker entries into export tokens.
   * @param {Array<{ number: number, count: number }>} items - Number/count pairs.
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
      const { number, count } = items[i]
      if (count >= 2) {
        out.push(includeRepeats ? `${number}(${count})` : String(number))
      } else {
        out.push(String(number))
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
  * @param {Array<{ number: number, count: number }>} items - Number/count pairs. Assumed unsorted.
  * @param {Object} [options={}] - Formatting options.
  * @param {boolean} [options.includeRepeats=false] - Include repeat counts as N(X)/A-B(X) in the range token.
  * @returns {string[]}
  */
  _compactStickerRanges(items, { includeRepeats = false } = {}) {
    if (!items.length) { return [] }
    items = [...items].sort((a, b) => a.number - b.number)
    const ranges = []
    let startItem = items[0]
    let endItem = items[0]
    for (let i = 1; i < items.length; i++) {
      const currentItem = items[i]
      const isConsecutive = currentItem.number === endItem.number + 1
      const sameCount = currentItem.count === startItem.count
      if (isConsecutive && (!includeRepeats || sameCount)) {
        endItem = currentItem
        continue
      }
      let value = startItem.number === endItem.number ? String(startItem.number)
        : `${startItem.number}-${endItem.number}`
      if (includeRepeats && startItem.count > 1) {
        value += `(${startItem.count})`
      }
      ranges.push(value)
      startItem = currentItem
      endItem = currentItem
    }
    let value = startItem.number === endItem.number ? String(startItem.number) : `${startItem.number}-${endItem.number}`
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

}

