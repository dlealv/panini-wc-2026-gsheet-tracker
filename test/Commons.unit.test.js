/// test/Commons.unit.test.js

/** Unit tests for StickerSheetRepository. */

const { StickerSheetRepository } = require('../build/Commons.js')

/** Unit tests for StickerSheetRepository. */
describe('StickerSheetRepository unit tests', () => {
  // ===========================
  // UNIT TESTS (PURE FUNCTIONS)
  // ===========================

  /** Validation tests ensure input parameters are correctly checked and errors are thrown for invalid data. */
  describe('_validateStickerNumber()', () => {
    test('valid values', () => {
      const repo = createUnitRepo()
      expect(repo._validateStickerNumber(0)).toBe(0)
      expect(repo._validateStickerNumber(20)).toBe(20)
      expect(repo._validateStickerNumber(10)).toBe(10)
    })
    test('negative values rejected', () => {
      const repo = createUnitRepo()
      expect(() => repo._validateStickerNumber(-1)).
        toThrow('Sticker number -1 is outside allowed range 0-20.')
    })
    test('above max rejected', () => {
      const repo = createUnitRepo()
      expect(() => repo._validateStickerNumber(21)).
        toThrow('Sticker number 21 is outside allowed range 0-20.')
    })
    test('non-integers rejected', () => {
      const repo = createUnitRepo()
      expect(() => repo._validateStickerNumber('abc')).
        toThrow('Sticker number "abc" is not a valid integer.')
      expect(() => repo._validateStickerNumber(10.5)).
        toThrow('Sticker number "10.5" is not a valid integer.')
    })
  })

  // =========================
  // LOGIC TESTS
  // =========================

  /**
   * Logic tests verify the core behavior of pure functions, ensuring they produce correct outputs
   * for valid inputs and handle edge cases appropriately.
   */
  describe('_toCount()', () => {
    test('valid conversions', () => {
      const repo = createUnitRepo()
      expect(repo._toCount(0)).toBe(0)
      expect(repo._toCount(5)).toBe(5)
      expect(repo._toCount('10')).toBe(10)
      expect(repo._toCount('7')).toBe(7)
    })
    test('invalid converts to zero', () => {
      const repo = createUnitRepo()
      expect(repo._toCount('')).toBe(0)
      expect(repo._toCount(null)).toBe(0)
      expect(repo._toCount(undefined)).toBe(0)
      expect(repo._toCount('abc')).toBe(0)
      expect(repo._toCount(-1)).toBe(0)
    })
    test('string zero converts correctly', () => {
      const repo = createUnitRepo()
      expect(repo._toCount('0')).toBe(0)
    })
  })

  /**
   * URL validation is critical for ensuring that flag URLs are correctly identified and processed,
   * preventing errors in flag display and data integrity.
   */
  describe('_isUrl()', () => {
    test('valid urls', () => {
      const repo = createUnitRepo()
      expect(repo._isUrl('https://example.com')).toBe(true)
      expect(repo._isUrl('http://example.com')).toBe(true)
      expect(repo._isUrl(' HTTPS://example.com ')).toBe(true)
    })
    test('invalid urls', () => {
      const repo = createUnitRepo()
      expect(repo._isUrl('ftp://example.com')).toBe(false)
      expect(repo._isUrl('example.com')).toBe(false)
      expect(repo._isUrl('')).toBe(false)
      expect(repo._isUrl(null)).toBe(false)
    })
    test('url detection ignores surrounding whitespace', () => {
      const repo = createUnitRepo()
      expect(repo._isUrl('  https://a.com  ')).toBe(true)
    })
  })

  /**
   * Country code normalization ensures that user input is standardized before lookup,
   * improving the robustness of country data retrieval and reducing errors caused by formatting inconsistencies.
   */
  describe('_normalizeCountryCode()', () => {
    test('normalization', () => {
      const repo = createUnitRepo()
      expect(repo._normalizeCountryCode('arg')).toBe('ARG')
      expect(repo._normalizeCountryCode(' bra ')).toBe('BRA')
    })
    test('unknown code rejected', () => {
      const repo = createUnitRepo()
      expect(() => repo._normalizeCountryCode('XXX')).
        toThrow('Country code "XXX" was not found in the COUNTRIES named range.')
    })
    test('empty code rejected', () => {
      const repo = createUnitRepo()
      expect(() => repo._normalizeCountryCode('')).
        toThrow('Country code "" was not found in the COUNTRIES named range.')
    })
    test('normalization trims and uppercases correctly for valid lookup', () => {
      const repo = createUnitRepo()
      const result = repo._normalizeCountryCode(' arg ')

      expect(result).toBe('ARG')
    })
  })

  /**
   * Flag extraction is essential for correctly displaying country flags in the application,
   * and handling various input formats (formula, direct URL, fallback) ensures flexibility and
   * resilience in flag data retrieval.
   */
  describe('_extractFlagValue()', () => {
    test('image formula extraction', () => {
      const repo = createUnitRepo()
      const result = repo._extractFlagValue(['=IMAGE("https://flag.com/ar.png")'], [''], 'ARG')
      expect(result).toBe('https://flag.com/ar.png')
    })
    test('direct url', () => {
      const repo = createUnitRepo()
      const result = repo._extractFlagValue(['https://flag.com/br.png'], [''], 'BRA')
      expect(result).toBe('https://flag.com/br.png')
    })
    test('display fallback', () => {
      const repo = createUnitRepo()
      const result = repo._extractFlagValue([''], ['https://flag.com/ar.png'], 'ARG')
      expect(result).toBe('https://flag.com/ar.png')
    })
    test('FWC special case', () => {
      const repo = createUnitRepo()
      const result = repo._extractFlagValue([''], [''], 'FWC')
      expect(result).toBe('')
    })
    test('invalid returns empty', () => {
      const repo = createUnitRepo()
      const result = repo._extractFlagValue(['invalid'], ['invalid'], 'ARG')
      expect(result).toBe('')
    })
    test('image formula with spaces and case-insensitive match', () => {
      const repo = createUnitRepo()
      const result = repo._extractFlagValue(
        ['=image( "https://flag.com/ar.png" )'], [''], 'ARG'
      )

      expect(result).toBe('https://flag.com/ar.png')
    })
  })

  /**
   * Grouping updates by country allows for efficient processing and application of changes,
   * ensuring that all updates for a specific country are handled together.
   */
  describe('_groupUpdatesByCountry()', () => {
    test('grouping behavior', () => {
      const repo = createUnitRepo()
      const updates = [
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'BRA', stickerNumber: 3, count: 1 },
        { countryCode: 'ARG', stickerNumber: 5, count: 4 }
      ]
      const result = repo._groupUpdatesByCountry(updates)
      expect(Object.keys(result)).toEqual(['ARG', 'BRA'])
      expect(result.ARG).toHaveLength(2)
      expect(result.BRA).toHaveLength(1)
      expect(result.ARG[0].stickerNumber).toBe(1)
      expect(result.ARG[1].stickerNumber).toBe(5)
    })
    test('empty input', () => {
      const repo = createUnitRepo()
      expect(repo._groupUpdatesByCountry([])).toEqual({})
    })
    test('grouping preserves input order inside each country', () => {
      const repo = createUnitRepo()
      const updates = [
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'ARG', stickerNumber: 2, count: 3 },
        { countryCode: 'ARG', stickerNumber: 3, count: 4 }
      ]
      const result = repo._groupUpdatesByCountry(updates)
      expect(result.ARG.map(u => u.stickerNumber)).toEqual([1, 2, 3])
    })
  })

  /**
   * Building country records from raw data is crucial for transforming spreadsheet data
   * into structured objects that can be easily manipulated and displayed in the application,
   * ensuring that all relevant information (code, name, group, flag, counts) is correctly assembled.
   */
  describe('_buildCountryRecord()', () => {
    test('valid record', () => {
      const repo = createUnitRepo()
      repo._extractFlagValue = jest.fn(() => 'flag-url')
      repo._toCount = jest.fn(v => Number(v))
      const result = repo._buildCountryRecord(
        ['ARG'], ['A'], ['=IMAGE("x")'], [''], ['Argentina'], [1, 2, 3]
      )

      expect(result).toEqual({
        code: 'ARG',
        countryName: 'Argentina',
        group: 'A',
        flag: 'flag-url',
        counts: [1, 2, 3]
      })
    })
    test('empty code returns null', () => {
      const repo = createUnitRepo()
      const result = repo._buildCountryRecord(
        [''], ['A'], [''], [''], ['Argentina'], [1, 2, 3]
      )

      expect(result).toBeNull()
    })
  })
})

/* Helper to create a test instance of StickerSheetRepository with necessary properties for unit testing. */
function createUnitRepo () {
  const repo = Object.create(StickerSheetRepository.prototype)
  repo.STICKER_MIN = 0
  repo.STICKER_MAX = 20
  repo.countryMap = {
    ARG: { index: 0, row: 1 },
    BRA: { index: 1, row: 2 }
  }
  return repo
}
