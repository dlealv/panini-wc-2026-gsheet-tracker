/** @OnlyCurrentDoc */
// src/ImportService.js

/**
 * Classes and methods for importing sticker data in the Panini tracker.
 * This file includes the:
 *  - ImportService which handles import operations (GAS entry points, data normalization,
 *    and sheet updates).
 *  - ImportStickers which validates and parses raw input text for imports.
 *  - InputLineNormalize which pre-normalizes one raw input line to Format 1 canonical form.
 * 
 * NOTE: the export tag in comments indicates classes that are intended to be testable, so they should not be
 * removed or altered without consideration of their role in the overall application architecture.
 */


/** Creates an import application service. 
 * @export
*/
class ImportService {
  /** Creates an import/export application service.
   * Initializes all necessary properties and validates named ranges.
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] - Optional spreadsheet instance.
   *   Pass an explicit instance when operating from a web app context where
   *   getActiveSpreadsheet() returns null. Omit for normal dialog context.
   */
  constructor(ss) {
    this.repo = null
    this.ss = ss || null
  }

  /** Static GAS entrypoint for preview operation. 
   * @returns {{ success: boolean, warnings: Array<string>, 
   *  countries: Array<{ code: string, stickers: Array<{ number: number, count: number }> }> }}
  */
  static previewStickerData(payload) {
    const service = new ImportService()
    return service.preview(payload && payload.text ? payload.text : '')
  }

  /** Static GAS entrypoint for import operations. 
   * @returns {{ success: boolean, warnings: Array<string>, message: string }}
  */
  static importStickerData(payload) {
    const service = new ImportService()
    return service.import(payload && payload.text ? payload.text : '', payload && payload.mode ? payload.mode : 'update')
  }

  /** Previews the parsed result of the input text without modifying the sheet. It does the validation of the 
   * input data for import and returns a structured summary of the parsed countries and sticker counts, along 
   * with any warnings for flexible violations.
   * @returns { success: boolean, warnings: Array<string>, countries: Array<{ code: string, 
   *  stickers: Array<{ number: number, count: number }> }> }
  */
  preview(text) {
    const importStickers = new ImportStickers(this.getRepo().getCountryMap())
    const parsed = importStickers.parse(text)
    return {
      success: true,
      warnings: parsed.warnings,
      countries: parsed.countries.map(item => ({
        code: item.code,
        stickers: Object.keys(item.counts).map(Number).sort((a, b) => a - b)
          .map(number => ({ number, count: item.counts[number] }))
      }))
    }
  }

  /** Imports validated sticker data into the sheet using the selected mode. 
   * Modes: - 'update' (default): updates counts for specified countries, preserving existing values for unspecified stickers and countries.
   *        - 'clean_all': clears all sticker counts before importing.
   *        - 'replace_countries': clears sticker counts for specified countries before importing.
   * @throws Error for invalid modes or if any country in the input data is not found in the sheet mapping.
   * @returns { success: boolean, warnings: Array<string>, message: string }
   */
  import(text, mode) {
    const normalizedMode = mode || 'update'
    const importStickers = new ImportStickers(this.getRepo().getCountryMap())
    const parsed = importStickers.parse(text)
    const countries = parsed.countries
    if (!['update', 'clean_all', 'replace_countries'].includes(normalizedMode)) {
      throw new Error(`Invalid import mode "${normalizedMode}".`)
    }
    this._writeCountries(countries, normalizedMode)
    return { success: true, warnings: parsed.warnings, message: `Imported ${countries.length} country row(s) successfully.` }
  }

  // Getters

  getRepo() {
    if (!this.repo) {
      this.repo = this.ss ? new StickerSheetRepository(this.ss) : new StickerSheetRepository()
    }
    return this.repo
  }

  // Private methods

  /** Writes parsed canonical import rows. Parsed rows already match the repository sparse update model. */
  _writeCountries(parsedRows, mode) {
    this.getRepo().updateStickerCounts({ countries: parsedRows }, mode)
  }

}

/** Creates an ImportStickers instance using the available country codes. 
 * @export
*/
class ImportStickers {
  /** Creates an ImportStickers instance using the available country codes. 
   * @param {Object<string, { row: number, col: number }>} countryMap - Map of valid country codes 
   * to their sheet positions.
   * @param {Object} options - Optional configuration options.
  */
  constructor(countryMap, options = {}) {
    this.options = {
      sortStickers: true,
      ...(options ?? {})
    }
    this.countryMap = countryMap
    this.tokenRegex = /^(\d+)(?:\((\d+)\))?$/
  }

  /**
   * Parses and validates the full import payload.
   * The returned sortStickers flag indicates whether countries are already sorted.
   * When sorting is disabled, each country includes stickerOrder preserving the normalized input order.
   * @return {{ sortStickers: boolean, countries: Array<{ code: string, 
   *  counts: { [stickerNumber]: number }, stickerOrder?: number[] }>, warnings: string[] }}
   */
  parse(text) {
    const raw = String(text || '').
      replace(/\r\n/g, '\n').
      trim()
    if (!raw) {
      throw new Error('No input provided. Paste content or upload a file.')
    }
    const lines = raw.
      split('\n').
      map(line => line.trim()).
      filter(Boolean)
    if (!lines.length) {
      throw new Error('Input is empty.')
    }
    const normalizer = new LineNormalize(this.countryMap, this.options)
    const warnings = []
    const seenCountries = new Set()
    const countries = []

    lines.forEach((line, lineIndex) => {
      const normalized = normalizer.normalizeLine(line)
      if (normalized.warnings && normalized.warnings.length) {
        warnings.push(...normalized.warnings)
      }
      if (!normalized.line) return
      const parsed = this._parseLine(normalized.line, lineIndex, seenCountries, warnings)
      if (parsed) countries.push(parsed)
    })
    return {
      sortStickers: this.options.sortStickers,
      countries,
      warnings
    }
  }

  /**
   * Parses one normalized Format 1 line.
   * Returns null when the country is duplicate or invalid.
   * Assumes the line is already pre-normalized to the expected canonical form by the LineNormalize
   * class, so only strict Format 1 syntax is accepted here.
   * The returned object contains the country code, sticker counts, and the sticker order according
   * to the configured sorting option.
   * @param {string} line - The normalized Format 1 line to parse.
   * @param {number} lineIndex - The index of the line in the original input for warning messages.
   * @param {Set<string>} seenCountries - A set of already processed country codes to detect duplicates.
   * @param {Array<string>} warnings - An array to collect warning messages for invalid or duplicate entries.
   * @returns {{ code: string, counts: Object<number, number>, stickerOrder: number[] } | null}
   */
  _parseLine(line, lineIndex, seenCountries, warnings) {
    const parts = line.split(',')
    const code = parts[0]
    if (parts.length < 2) {
      throw new Error(`Country "${code}": expected at least one sticker token.`)
    }
    if (seenCountries.has(code)) { // snippet = CODE + first 2 sticker tokens to help user locate the line
      const snippet = parts.slice(0, 3).join(',')

      warnings.push(
        `Country "${code}": starting with ${snippet} (line ${lineIndex + 1}) ` +
        `duplicate country "${code}" ignored; first occurrence wins.`
      )
      return null
    }
    if (!this._validateCountryCode(code, warnings)) { return null }
    seenCountries.add(code)

    const counts = {}
    const stickerOrder = []
    for (let i = 1; i < parts.length; i++) {
      if (!parts[i] || parts[i].trim() === '') {
        throw new Error(`Country "${code}": empty token detected.`)
      }
      this._parseStickerToken(parts[i], code, counts, warnings, stickerOrder)
    }
    const result = { code, counts }
    if (!this.options.sortStickers) {
      result.stickerOrder = this._buildStickerOrder(stickerOrder)
    }
    return result
  }

  /** Validates one country code. Returns false and collects a warning when invalid or unknown. */
  _validateCountryCode(code, warnings) {
    const COUNTRY_CODE_PATTERN = new RegExp(this.COUNTRY_CODE_PATTERN)
    if (!COUNTRY_CODE_PATTERN.test(code) || !this.countryMap[code]) {
      warnings.push(`Country1 "${code}": not valid, line skipped.`)
      return false
    }
    return true
  }

  /** Parses a fully normalized Format 1 token (atomic or N(X)). Skips with warning when out of range. */
  _parseStickerToken(token, code, counts, warnings, stickerOrder) {
    const match = token.match(this.tokenRegex)
    if (!match) {
      throw new Error(`Country "${code}": invalid token "${token}".`)
    }
    const stickerNumber = Number(match[1])
    const explicitCount = match[2] ? Number(match[2]) : null
    if (!this._validateStickerNumber(stickerNumber, code, warnings)) { return } // warning already collected
    this._validateExplicitCount(explicitCount, token, code)
    if (counts[stickerNumber] != null) {
      throw new Error(`Country "${code}": duplicate sticker "${stickerNumber}" after normalization.`)
    }
    counts[stickerNumber] = this._mapTokenToCount(code, stickerNumber, explicitCount)
    stickerOrder.push(stickerNumber)
  }

  /**
   * Validates one sticker number against the global sticker domain.
   * Returns false and collects a warning only for INVALID_STICKER
   * (outside the global numeric domain).
   *
   * OUT_OF_ALBUM_STICKER values (e.g. CC,13 or MEX,0, FWC,20) are considered
   * valid by the parser and are handled later during import.
   */
  _validateStickerNumber(stickerNumber, code, warnings) {
    const min = StickerSheetRepository.getStickerMin()
    const max = StickerSheetRepository.getStickerMax()

    if (!Number.isInteger(stickerNumber) || stickerNumber < min || stickerNumber > max) {
      const bounds = StickerSheetRepository.getCountryBounds()
      const [countryMin, countryMax] = bounds.get(code) || bounds.get('TEAM')
      warnings.push(
        `Country "${code}": sticker number ${stickerNumber} ` +
        `is outside allowed range ${countryMin}-${countryMax}. ` +
        `Sticker skipped.`
      )
      return false
    }
    return true
  }

  /** Validates one explicit repeat count. */
  _validateExplicitCount(explicitCount, token, code) {
    if (explicitCount !== null && (!Number.isInteger(explicitCount) || explicitCount <= 0)) {
      throw new Error(`Country "${code}": invalid repeat count in "${token}".`)
    }
  }

  /** Maps a parsed sticker token to the final count written into the sheet. 
   * @param {string} code - The country code.
   * @param {number} stickerNumber - The sticker number.
   * @param {number|null} explicitCount - The explicit repeat count, or null if not specified. 
   *  For example N(X) or A-B(X) would have explicitCount = X, while N or A-B would have explicitCount = null.
   */
  _mapTokenToCount(code, stickerNumber, explicitCount) {
    const bounds = StickerSheetRepository.getCountryBounds()
    const [minSticker, maxSticker] = bounds.get(code) || bounds.get('TEAM')

    // OUT_OF_ALBUM_STICKER: accepted by the parser but mapped to 0.
    if (stickerNumber < minSticker || stickerNumber > maxSticker) {
      return 0
    }
    return explicitCount !== null ? explicitCount : 1
  }

  /**
 * Builds the sticker order exposed with the parsed country.
 * Preserves input order when sorting is disabled.
 * Uses numeric order when sorting is enabled.
 */
  _buildStickerOrder(order) {
    if (this.options.sortStickers) {
      return order.sort((a, b) => a - b)
    }
    return order
  }
}

/**
 * Pre-normalizes one raw import line to Format 1 canonical form before ImportStickers processing.
 * Handles non-ASCII stripping, delimiter normalization, Format 2 to Format 1 token conversion,
 * and exclusion operator expansion to its complement sticker set.
 * @export
 */

class LineNormalize {
  /**
   * Creates a normalizer bound to the available country codes.
   * countryMap must be keyed by uppercase 3-letter country code.
   * @param {Object<string, { row: number, col: number }>} countryMap - Map of valid country 
   *  codes to their sheet positions.
   * @param {Object} [options] - Optional configuration object.
   */
  constructor(countryMap, options = {}) {
    /* Country code pattern for Format 2, including the special case of CC. */
    this.COUNTRY_CODE_PATTERN = '[A-Z]{3}|CC'

    /* Format 2 token pattern: COUNTRY-STICKER or COUNTRYSTICKER. */
    this.FORMAT2_COUNTRY_REGEX = new RegExp(`^(${this.COUNTRY_CODE_PATTERN})-?(\\d.*)$`)

    /* Options for normalization behavior. */
    this.options = {
      sortStickers: true,
      ...(options ?? {})
    }

    this.countryMap = Object.fromEntries(
      Object.entries(countryMap).map(([code, value]) => [code.toUpperCase(), value])
    )
    this.countryCodes = new Set(Object.keys(this.countryMap))
  }

  /**
   * Normalizes one raw input line into canonical Format 1.
   * Pipeline:
   * STEP 1 pre-clean input
   * STEP 2 detect exclusion operator
   * STEP 3 extract country
   * STEP 4 expand tokens (format 2 + ranges)
   * STEP 5 deduplicate stickers (first occurrence wins)
   * STEP 6 resolve exclusion if present
   * STEP 7 optionally sort stickers and build canonical output
   */
  normalizeLine(rawLine) {
    const warnings = []
    // Processing steps at line level
    const stripped = this._stripNonAsciiAndUpperCase(rawLine)
    if (!stripped) { return { line: null, warnings } }
    const normalizedDels = this._normalizeDelimiters(stripped)
    if (!normalizedDels) { return { line: null, warnings } }
    const normalizedRepeats = this._normalizeRepeats(normalizedDels)
    if (!normalizedRepeats) { return { line: null, warnings } }
    const { isExclusion, rest } = this._detectExclusionOperator(normalizedRepeats)
    // Processing steps at token level
    const tokens = rest.split(',').filter(Boolean)
    if (tokens.length === 0) { return { line: null, warnings } }
    const { code, firstStickerToken } = this._extractCountryCode(tokens[0], warnings)
    if (!code) { return { line: null, warnings } }
    let stickerTokens = this._buildStickerTokens(tokens, code, firstStickerToken, warnings)

    stickerTokens = this._deduplicateStickers(stickerTokens, code, warnings)
    if (isExclusion) { // exclusion complement is already numerically sorted by _getValidPositions
      stickerTokens = this._computeExclusion(code, stickerTokens, warnings)
      if (!stickerTokens) { return { line: null, warnings } }
    }
    if (this.options.sortStickers) {
      stickerTokens = this._sortStickers(stickerTokens)
    }
    if (stickerTokens.length === 0) {
      warnings.push(`Country "${code}": no valid stickers after normalization.`)
      return { line: null, warnings }
    }
    return { line: this._buildCanonicalLine(code, stickerTokens), warnings }
  }

  /**
   * Removes all non-ASCII characters from a raw string.
   * Flag emojis are non-ASCII and are removed by this step. Finally converts
   * to uppercase for consistent processing.
   */
  _stripNonAsciiAndUpperCase(raw) {
    return String(raw || '').
      // eslint-disable-next-line no-control-regex
      replace(/[^\x00-\x7F]/g, '').toUpperCase()
  }

  /** Normalizes delimiters (';', ':', whitespace) to comma and removes repeated or leading/trailing commas.*/
  _normalizeDelimiters(line) {
    return line.
      replace(/;/g, ',').replace(/:+/g, ',').replace(/\s+/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '')
  }

  /**
   * Normalizes repeats count considering different formats to a canonical form:
   * N(X) or A-B(X).
   */
  _normalizeRepeats(line) {
    if (!line) return line
    return line.
      replace(/(\d+)-(\d+)\(x(\d+)\)/gi, '$1-$2($3)').  // A-B(xN) → A-B(N)
      replace(/(\d+)-(\d+)x(\d+)/gi, '$1-$2($3)').      // A-BxN → A-B(N)
      replace(/(\d+)\(x(\d+)\)/gi, '$1($2)').           // N(xN) → N(N)
      replace(/(\d+)x(\d+)/gi, '$1($2)')                // NxN → N(N)
  }

  /**
 * Detects exclusion operator prefixes (<>, !=, ^) at the start of a line.
 * Any consecutive sequence of supported exclusion operators is treated as
 * a single exclusion marker and removed before further parsing.
 * Returns: {isExclusion: boolean, rest: string}
 */
  _detectExclusionOperator(line) {
    const rest = line.replace(/^(?:(?:<>)|(?:!=)|\^)+/, '')
    return {
      isExclusion: rest !== line,
      rest
    }
  }

  /**
   * Extracts country code from the first token.
   * Supports Format 1 (MEX / CC) and Format 2 (MEX-1 / MEX1 / CC-1 / CC1).
   * Also extracts the first sticker token in Format 2 lines.
   * Example: "MEX-5(2)" would produce code "MEX" and firstStickerToken "5(2)",
   * "CC-5(2)" would produce code "CC" and firstStickerToken "5(2)",
   * while "MEX" or "CC" would produce the country code and null firstStickerToken.
   * @returns { code: string|null, firstStickerToken: string|null } For format 1 the firstStickerToken is null, 
   * for format 2 it is the first sticker token.
 */
  _extractCountryCode(firstToken, warnings) {
    const COUNTRY_CODE_PATTERN = this.COUNTRY_CODE_PATTERN
    const FORMAT2_COUNTRY_REGEX = this.FORMAT2_COUNTRY_REGEX
    const format1Regex = new RegExp(`^${COUNTRY_CODE_PATTERN}$`)
    if (format1Regex.test(firstToken) && this.countryCodes.has(firstToken)) { // Format 1 detected
      return { code: firstToken, firstStickerToken: null }
    }

    const f2Match = firstToken.match(FORMAT2_COUNTRY_REGEX)
    if (f2Match && this.countryCodes.has(f2Match[1])) { // Format 2 detected, returns the first sticker token too
      return { code: f2Match[1], firstStickerToken: f2Match[2] }
    }

    // best candidate for a meaningful warning: country code pattern if available, else raw token
    const codeCandidateMatch = firstToken.match(new RegExp(`^(${COUNTRY_CODE_PATTERN})`, 'i'))
    const codeCandidate = codeCandidateMatch ? codeCandidateMatch[1] : firstToken

    warnings.push(`Country "${codeCandidate}": not valid, line skipped.`)
    return { code: null, firstStickerToken: null }
  }

  /**
   * Builds canonical Format 1 sticker tokens from the raw token list.
   * Handles Format 2 inline tokens and expands all ranges.
   * Output is a flat list of atomic sticker tokens (not yet deduplicated).
   * The first token is treated separately to allow Format 2 country code extraction without
   * losing the first sticker token.
   * Returns an array of expanded sticker tokens, skipping any invalid tokens with warnings.
   * Example: input tokens ["MEX-1", "MEX-3-5(2)", "7"] with code "MEX" would produce ["1", "3(2)", "4(2)", "5(2)", "7"].
   * Invalid tokens (e.g. wrong country code, malformed range) are skipped with a warning, but do not prevent processing 
   * of other valid tokens in the line.
   * This method does not perform any validation on sticker numbers or counts; it assumes the input is syntactically 
   * correct and relies on later validation steps to catch out-of-range values.
   */
  _buildStickerTokens(tokens, code, firstStickerToken, warnings) {
    const result = []
    if (firstStickerToken) {
      result.push(...this._expandStickerToken(firstStickerToken)) // only number part of the first token
    }
    for (let i = 1; i < tokens.length; i++) {
      const norm = this._normalizeToken(tokens[i], code, warnings) // only number part
      if (!norm) continue
      result.push(...this._expandStickerToken(norm)) // sticker range expansion, if applicable
    }
    return result
  }

  /**
   * Expands a token into canonical Format 1 sticker tokens.
   * Preserves repeat counts when present.
   * Supports ranges and single values, producing atomic sticker entries.
   * Returns an array of expanded sticker tokens, considering all cases:
   * - A-B(N) → [A(N), (A+1)(N), ..., B(N)]
   * - A-B → [A, A+1, ..., B]
   * - N(X) → [N(X)]
   * - N → [N]
   * Returns an empty array when the token format is invalid.
   * Note: this method does not perform any validation on sticker numbers or counts;
   *       it assumes the input is syntactically correct and relies on later validation steps
   *       to catch out-of-range values.
   */
  _expandStickerToken(token) {
    const rangeWithCountMatch = token.match(/^(\d+)-(\d+)\((\d+)\)$/)
    if (rangeWithCountMatch) {
      const start = Number(rangeWithCountMatch[1])
      const end = Number(rangeWithCountMatch[2])
      const count = Number(rangeWithCountMatch[3])
      return this._buildNumberRange(start, end).map(n => `${n}(${count})`) // A-B(N) case
    }
    const rangeMatch = token.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) { // A-B case
      return this._buildNumberRange(Number(rangeMatch[1]), Number(rangeMatch[2])).map(String)
    }
    if (token.match(/^(\d+)\((\d+)\)$/)) { return [token] } // N(X) case
    if (token.match(/^(\d+)$/)) { return [token] } // N case
    return []
  }

  /**
   * Normalizes Format 2 inline tokens that repeat the country code inside the line.
   * Converts CODE-N, CODE-N(X), CODE-A-B, CODE-A-B(X) to numeric-only token form.
   * Returns null when the token refers to a different country code, otherwise the sticker number.
   * Example: with country code "MEX", token "MEX-5(2)" would produce "5(2)", while token "ARG-3"  
   * would be skipped with a warning since it doesn't match the country code.
   * For token "5(2)" returns the same token since it doesn't match the Format 2 pattern, allowing 
   * mixed formats in the same line would be skipped with a warning. It handles, non-team countries such as FWC and CC, as well.
   */
  _normalizeToken(token, countryCode, warnings) {
    const F2_MATCH = token.match(this.FORMAT2_COUNTRY_REGEX)
    if (!F2_MATCH) return token
    const tokenCode = F2_MATCH[1]
    const stickerPart = F2_MATCH[2]
    if (tokenCode !== countryCode) {
      warnings.push(
        `Country "${countryCode}": "${token}" skipped. All stickers in the line should belong to the same country.`
      )
      return null
    }
    return stickerPart
  }

  /**
   * Removes duplicate stickers using first-occurrence wins while preserving input order.
   * Sticker number defines uniqueness; repeat counts are ignored for deduplication.
   * Emits a single consolidated warning listing duplicate numbers in first-occurrence order.
   */
  _deduplicateStickers(tokens, code, warnings) {
    const seen = new Set()
    const map = new Map()
    const duplicates = []

    for (const token of tokens) {
      const match = token.match(/^(\d+)(?:\((\d+)\))?$/)
      if (!match) continue
      const key = Number(match[1])
      if (seen.has(key)) {
        duplicates.push(key) // collect all duplicates to emit one consolidated warning
        continue
      }
      seen.add(key)
      map.set(key, token)
    }
    if (duplicates.length > 0) {
      const unique = [...new Set(duplicates)]
      warnings.push(`Country "${code}": duplicate sticker(s) "${unique.join(',')}" ignored; first occurrence wins.`)
    }

    return Array.from(map.values())
  }

  /**
   * Computes the complement sticker set for an exclusion line.
   * Takes all valid positions for the country, removes those listed in excludeTokens,
   * and returns the remaining positions as string tokens with count 1.
   * Repeat counts in exclusion tokens are silently ignored per specification.
   * Returns null and adds a warning when the complement is empty.
   */
  _computeExclusion(countryCode, excludeTokens, warnings) {
    if (excludeTokens.length === 0) { // exclusion with no sticker tokens is meaningless; skip with warning
      warnings.push(`Country "${countryCode}": exclusion line has no sticker tokens; line skipped.`)
      return null
    }
    const validPositions = this._getAlbumPositions(countryCode)
    const excluded = new Set()

    excludeTokens.forEach(token => { // repeat counts stripped silently; only sticker numbers used
      this._expandToStickerNumbers(token).forEach(n => excluded.add(n))
    })
    const complement = validPositions.filter(n => !excluded.has(n))
    if (complement.length === 0) {
      warnings.push(`Country "${countryCode}": exclusion operator produces an empty sticker set; line skipped.`)
      return null
    }
    return complement.map(String)
  }

  /**
 * Expands a token into raw sticker numbers (no counts preserved).
 * Used only for exclusion resolution; all repeat counts are ignored.
 * Supports N, N(X), A-B, A-B(X).
 */
  _expandToStickerNumbers(token) {
    const rangeRepeat = token.match(/^(\d+)-(\d+)\(\d+\)$/)
    if (rangeRepeat) { return this._buildNumberRange(Number(rangeRepeat[1]), Number(rangeRepeat[2])) }
    const range = token.match(/^(\d+)-(\d+)$/)
    if (range) { return this._buildNumberRange(Number(range[1]), Number(range[2])) }
    const singleRepeat = token.match(/^(\d+)\(\d+\)$/)
    if (singleRepeat) { return [Number(singleRepeat[1])] }
    const single = token.match(/^(\d+)$/)
    if (single) { return [Number(single[1])] }
    return []
  }

  /**
   * Returns the array of valid sticker positions for a country code. It consider special cases for non-team countries such as
   * FWC and CC. The valid positions are determined by the country bounds defined in the StickerSheetRepository.
   */
  _getAlbumPositions(countryCode) {
    const bounds = StickerSheetRepository.getCountryBounds()
    const [start, end] = bounds.get(countryCode) || bounds.get('TEAM')
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  /**
   * Builds final Format 1 canonical output string.
   * Assumes all tokens are already expanded and deduplicated.
   */
  _buildCanonicalLine(code, tokens) {
    return `${code},${tokens.join(',')}`
  }

  /** Sorts sticker tokens by their numeric sticker number. */
  _sortStickers(tokens) {
    return tokens.sort((a, b) => {
      const aNum = Number(a.match(/^(\d+)/)[1])
      const bNum = Number(b.match(/^(\d+)/)[1])
      return aNum - bNum
    })
  }

  /**
   * Builds inclusive numeric range [start..end].
   * Used as a low-level helper for token expansion.
   */
  _buildNumberRange(start, end) {
    const result = []

    for (let i = start; i <= end; i++) { result.push(i) }
    return result
  }
}