// @ts-nocheck
// test/ImportExportService.unit.test.js
/**
 * Unit tests for ImportExportService.
 *
 * Focus:
 * - import parsing behavior
 * - validation rules
 * - export structure stability
 *
 * All Google Apps Script dependencies are mocked via:
 * createImportExportService()
 */

/* global __writeRangeMock, __countsRange */

const { initTestKernel } = require('./utils/testKernel.js')
const { ImportExportService, StickerInputParser } = require('../build/ImportExportService.js')

/* Initializes the test environment with mocked Google Apps Script services and global variables,
ensuring that each test runs in a clean, isolated context without side effects from previous
tests or reliance on actual spreadsheet data. */
initTestKernel()

/** ImportExportService (unit) */
describe('ImportExportService (unit)', () => {
  /**
   Tests for import() method covering successful parsing and import scenarios, including handling
  of multiple countries and different import modes, as well as validation of error handling for invalid modes.
  */

  /* Each test starts with cleared mocks to ensure isolation and prevent state leakage between tests. */
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /** Tests for import() modes, ensuring that different import strategies are correctly applied. */
  describe('import() modes', () => {
    test('clean_all clears sheet before import', () => {
      const service = new ImportExportService()
      const result = service.import('FWC,1,2', 'clean_all')
      expect(result.success).toBe(true)
      expect(result.message).toContain('1 country row')
    })
    test('replace_countries clears only target countries', () => {
      const service = new ImportExportService()
      const result = service.import('FWC,1,2', 'replace_countries')
      expect(result.success).toBe(true)
      expect(result.message).toMatch(/Imported \d+ country row\(s\) successfully\./)
    })
    test('invalid mode throws', () => {
      const service = new ImportExportService()
      expect(() => service.import('FWC,1', 'invalid')).toThrow(/Invalid import mode/)
    })
  })

  /** Tests for import() core behavior, focusing on the parsing and importing logic for different input formats. */
  describe('import() core behavior', () => {
    test('parses and imports single country', () => {
      const service = new ImportExportService()
      const result = service.import('FWC,1,2,3')
      expect(result).toEqual(expect.objectContaining({
        success: true,
        message: expect.any(String),
        warnings: expect.any(Array)
      }))
      expect(result.message).toMatch(/Imported 1 country/)
    })
    test('handles multiple countries correctly', () => {
      const service = new ImportExportService()
      const result = service.import('FWC,1\nMEX,2,3')
      expect(result.success).toBe(true)
      expect(result.message).toMatch(/Imported 2 country/)
    })
  })

  /** Tests for parser integration, ensuring that the import and export methods correctly interact with the parser. */
  describe('parser integration', () => {
    test('warnings are preserved from parser', () => {
      const service = new ImportExportService()
      const result = service.import('🇺🇸,1')
      expect(result.success).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
      expect(result.warnings[0]).toMatch(/country/i)
    })
  })

  /** Tests for exportData() method, ensuring correct export behavior and contract adherence. */
  describe('exportData()', () => {
    test('returns valid export contract', () => {
      const service = new ImportExportService()
      const result = service.exportData()
      expect(result).toEqual(expect.objectContaining({
        success: true,
        text: expect.any(String),
        lines: expect.any(Number)
      }))
      expect(result.lines).toBe(1)
    })
    test('flag mode does not crash', () => {
      const service = new ImportExportService()
      expect(() => service.exportData(true)).not.toThrow()
    })
  })

  /**
   * Tests for contract stability, confirming that the import and export methods always return objects
   * with the expected properties.
   */
  describe('contract stability', () => {
    test('import returns stable shape', () => {
      const service = new ImportExportService()
      const result = service.import('FWC,1')
      expect(Object.keys(result).sort()).toEqual(['message', 'success', 'warnings'])
    })
    test('export returns stable shape', () => {
      const service = new ImportExportService()
      const result = service.exportData()
      expect(Object.keys(result).sort()).toEqual(['lines', 'success', 'text'])
    })
  })

  /** Tests for preview() method, ensuring correct preview behavior and contract adherence. */
  describe('preview()', () => {
    test('returns preview payload without writing data', () => {
      const service = new ImportExportService()
      const result = service.preview('FWC,1,2,3')
      expect(result.success).toBe(true)
      expect(Array.isArray(result.countries)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
      expect(result.countries.length).toBe(1)
      expect(result.countries[0].code).toBe('FWC')
    })
    test('preview forwards parser warnings to the caller', () => {
      const service = new ImportExportService()
      const result = service.preview('MEX,1,22') // sticker 22 out of range → warning
      expect(result.success).toBe(true)
      expect(result.warnings.some(w => w.includes('22'))).toBe(true)
    })
  })

  /**
   * Tests for sheet writing behavior, confirming that the import method correctly interacts
   * with the sheet to update sticker counts.
   */
  describe('sheet writes', () => {
    test('writes correct sticker matrix to sheet', () => {
      const service = new ImportExportService()
      service.import('FWC,1,3(2)')
      expect(__writeRangeMock.setValues).toHaveBeenCalled()
      const written = __writeRangeMock.setValues.mock.calls[0][0][0]
      expect(written[1]).toBe(1)
      expect(written[3]).toBe(2)
    })
    test('exports deterministic formatted sticker string', () => {
      const service = new ImportExportService()
      const result = service.exportData()
      expect(result.text).toContain('FWC')
      // expect(result.text).toMatch(/1/)
      // expect(result.text).toMatch(/3\(2\)/)
      expect(result.text.split(',')).toEqual(['FWC', '1', '3(2)'])
    })
    test('export contains no zero values', () => {
      const service = new ImportExportService()
      const result = service.exportData()
      expect(result.text).not.toMatch(/0\(/)
    })
    test('update mode preserves existing valid sticker values not in the import payload', () => {
      // simulate the sheet row already having sticker 3 = 2 before the import
      const existingRow = Array(21).fill(0)
      existingRow[3] = 2
      __writeRangeMock.getValues.mockReturnValueOnce([existingRow])
      const service = new ImportExportService()
      service.import('FWC,1', 'update') // only sticker 1 provided; sticker 3 must survive
      const written = __writeRangeMock.setValues.mock.calls[0][0][0]
      expect(written[1]).toBe(1) // explicitly imported sticker written correctly
      expect(written[3]).toBe(2) // pre-existing sticker preserved by update mode
    })
  })

  /** Tests for sheet clearing behavior, ensuring that the appropriate ranges are cleared based on the import mode. */
  describe('sheet clearing', () => {
    test('clean_all clears counts range', () => {
      const service = new ImportExportService()
      service.import('FWC,1', 'clean_all')
      expect(__countsRange.clearContent).toHaveBeenCalledTimes(1)
    })
    test('replace_countries clears target row before writing', () => {
      const service = new ImportExportService()
      service.import('FWC,1', 'replace_countries')
      expect(__writeRangeMock.clearContent).toHaveBeenCalledTimes(1)
    })
    test('replace_countries clears before writing', () => {
      const service = new ImportExportService()
      service.import('FWC,1,3(2)', 'replace_countries')
      const clearCallIndex = __writeRangeMock.clearContent.mock.invocationCallOrder[0]
      const writeCallIndex = __writeRangeMock.setValues.mock.invocationCallOrder[0]
      expect(clearCallIndex).toBeLessThan(writeCallIndex)
    })
  })

  /** Tests that non-valid sticker positions are always written as 0 on import, for all modes. */
  describe('non-valid sticker position zeroing', () => {
    test('FWC import always writes 0 at offset 20 (update mode)', () => {
      const service = new ImportExportService()
      service.import('FWC,1,3(2)')
      const written = __writeRangeMock.setValues.mock.calls[0][0][0]
      expect(written[20]).toBe(0) // offset 20 is non-valid for FWC
    })
    test('non-FWC import always writes 0 at offset 0 (update mode)', () => {
      const service = new ImportExportService()
      service.import('MEX,1,3(2)')
      const written = __writeRangeMock.setValues.mock.calls[0][0][0]
      expect(written[0]).toBe(0) // offset 0 is non-valid for non-FWC
    })
    test('replace_countries mode also zeroes non-valid offset', () => {
      const service = new ImportExportService()
      service.import('MEX,1', 'replace_countries')
      const written = __writeRangeMock.setValues.mock.calls[0][0][0]
      expect(written[0]).toBe(0)
    })
    test('clean_all mode also zeroes non-valid offset', () => {
      const service = new ImportExportService()
      service.import('MEX,1', 'clean_all')
      const written = __writeRangeMock.setValues.mock.calls[0][0][0]
      expect(written[0]).toBe(0)
    })
  })
})

/** StickerInputParser (unit) */
describe('StickerInputParser (unit)', () => {
  let parser

  /* Each test starts with a fresh instance of StickerInputParser and cleared mocks to ensure
  isolation and prevent state leakage between tests. */
  beforeEach(() => {
    jest.clearAllMocks()
    parser = new StickerInputParser({ FWC: true, MEX: true })
  })

  /**
   Tests for parse() method covering both successful parsing scenarios and expected error cases,as
  well as validation of output structure and warning generation.
  */
  describe('parse() success paths', () => {
    test('simple parsing returns correct structure', () => {
      const result = parser.parse('FWC,1,2,3')
      expect(result.countries[0].code).toBe('FWC')
      expect(result.countries[0].counts).toEqual({ 1: 1, 2: 1, 3: 1 })
      expect(result.warnings.length).toBe(0)
    })
    test('repeat syntax expands correctly', () => {
      const result = parser.parse('FWC,2(2),5(3)')
      expect(result.countries[0].counts).toEqual({ 2: 2, 5: 3 })
    })
    test('range syntax works', () => {
      const result = parser.parse('FWC,1-5')
      expect(result.countries[0].counts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 })
    })
    test('mixed ranges are accepted', () => {
      const result = parser.parse('MEX,1-3,18-20')
      expect(result.countries[0].counts).toEqual({ 1: 1, 2: 1, 3: 1, 18: 1, 19: 1, 20: 1 })
    })
  })

  /**
   Tests for error handling in parse() method, ensuring that invalid inputs are properly
  rejected with exceptions, and that edge cases like empty input are handled gracefully.
  */
  describe('parse() error cases', () => {
    test('reject empty input with message', () => {
      expect(() => parser.parse('')).toThrow('No input provided')
    })
    test('unknown country produces warning and skips line', () => {
      const result = parser.parse('🇺🇸,1')
      expect(result.countries.length).toBe(0)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toMatch(/country/i)
    })
    test('unknown country code produces warning for BRA', () => {
      const result = parser.parse('BRA,25')
      expect(result.countries.length).toBe(0)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
    test('out-of-range sticker produces warning and is skipped, not an error', () => {
      const result = parser.parse('MEX,1,22')
      expect(result.countries.length).toBe(1) // line is still imported; sticker 22 is skipped
      expect(result.warnings.some(w => w.includes('22') && w.includes('outside allowed range'))).toBe(true)
    })
  })

  /**
   Tests for validation behavior in parse() method, verifying that warnings are generated for issues
  like duplicate stickers, and that the output structure includes expected properties like warnings array
   and preserved country code.
   */
  describe('behavior validation', () => {
    test('returns warnings array always defined', () => {
      const result = parser.parse('FWC,1,2,3')
      expect(Array.isArray(result.warnings)).toBe(true)
    })
    test('country code is preserved in output', () => {
      const result = parser.parse('FWC,1,2,3')
      expect(result.countries[0].code).toBe('FWC')
    })
  })

  /**
   Tests for handling of duplicate country entries in parse() method, ensuring that the first occurrence
  is used and subsequent duplicates are ignored with appropriate warnings.
  */
  describe('duplicate country handling', () => {
    test('first country occurrence wins and second is ignored', () => {
      const result = parser.parse('FWC,1,2\nFWC,3,4')
      expect(result.countries.length).toBe(1)
      expect(result.countries[0].code).toBe('FWC')
      expect(result.countries[0].counts).toEqual({ 1: 1, 2: 1 })
      expect(result.warnings.some(w => w.includes('duplicate country'))).toBe(true)
    })
  })

  /**
   Tests for aggregation of multiple warnings in parse() method, confirming that all issues are
  collected and reported together rather than just the first one encountered.
  */
  describe('warning aggregation', () => {
    test('collects multiple warnings in a single parse', () => {
      const result = parser.parse('FWC,1,1\n🇺🇸,1\nBRA,25')
      expect(result.warnings.length).toBeGreaterThan(1)
      expect(result.countries.length).toBeLessThanOrEqual(1)
    })
  })
})

/** InputLineNormalizer (unit) */
describe('InputLineNormalize (unit)', () => {
  let normalize
  beforeEach(() => {
    jest.clearAllMocks()
    normalize = new global.InputLineNormalize({ FWC: true, MEX: true, BRA: true, CPV: true })
  })
  /* Tests for normalizeLine() method covering a wide range of input formats and edge cases, ensuring that
  the normalization process correctly handles various token formats, delimiters, whitespace, and invalid inputs,
  while producing consistent output and appropriate warnings. */
  describe('normalizeLine()', () => {
    test('Format 2 mixed tokens are normalized to Format 1 canonical output', () => {
      const result = normalize.normalizeLine('🇲🇽 MEX-1;MEX3-5(2);MEX-7')
      expect(result.line).toBe('MEX,1,3(2),4(2),5(2),7')
    })
    test('semicolon delimiter is normalized to comma and parsed correctly', () => {
      const result = normalize.normalizeLine('BRA-1;BRA-2;BRA-3')
      expect(result.line).toBe('BRA,1,2,3')
    })
    test('mix lower and upper case country code and parsed correctly', () => {
      const result = normalize.normalizeLine('Bra-1;BRA-2;bra-3')
      expect(result.line).toBe('BRA,1,2,3')
    })
    test('normalize repeats NxX is applied correctly', () => {
      const result = normalize.normalizeLine('MEX,1,2x2,3')
      expect(result.line).toBe('MEX,1,2(2),3')
    })
    test('normalize repeats N(xX) is applied correctly', () => {
      const result = normalize.normalizeLine('MEX-1,MEX-2(x2),MEX3')
      expect(result.line).toBe('MEX,1,2(2),3')
    })
    test('normalize repeats A-BxX is applied correctly', () => {
      const result = normalize.normalizeLine('MEX,1,4-6x2,10')
      expect(result.line).toBe('MEX,1,4(2),5(2),6(2),10')
    })
    test('normalize repeats A-B(xX) is applied correctly', () => {
      const result = normalize.normalizeLine('MEX,1,4-6(x2),10')
      expect(result.line).toBe('MEX,1,4(2),5(2),6(2),10')
    })
    test('Format 2 without dash is parsed correctly', () => {
      const result = normalize.normalizeLine('MEX1,MEX2,MEX3')
      expect(result.line).toBe('MEX,1,2,3')
    })
    test('range expansion without repeats is fully expanded', () => {
      const result = normalize.normalizeLine('CPV-1-3')
      expect(result.line).toBe('CPV,1,2,3')
    })
    test('range expansion with repeats is applied per sticker', () => {
      const result = normalize.normalizeLine('CPV-1-3(2)')
      expect(result.line).toBe('CPV,1(2),2(2),3(2)')
    })
    test('mixed Format 1 and Format 2 tokens are normalized together', () => {
      const result = normalize.normalizeLine('MEX-1,MEX2,MEX3-4(2)')
      expect(result.line).toBe('MEX,1,2,3(2),4(2)')
    })
    test('whitespace and emoji are stripped before parsing', () => {
      const result = normalize.normalizeLine('🇧🇷   BRA-1 , BRA2 ; BRA-3')
      expect(result.line).toBe('BRA,1,2,3')
    })
    test('invalid country code returns null line', () => {
      const result = normalize.normalizeLine('XXX-1,2,3')
      expect(result.line).toBeNull()
    })
    test('multiple exclusion operators <>^', () => {
      const result = normalize.normalizeLine('<>^MEX,1,2')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
    })
    test('multiple exclusion operators !=^<><>!=', () => {
      const result = normalize.normalizeLine('!=^<><>!=MEX,1,2')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
    })
    test('exclusion operator <> computes complement for non-FWC country', () => {
      const result = normalize.normalizeLine('<>MEX,1,2')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
    })
    test('exclusion operator != behaves same as <>', () => {
      const result = normalize.normalizeLine('!=MEX,1,2')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
    })
    test('exclusion operator ^ applies complement correctly', () => {
      const result = normalize.normalizeLine('^MEX,1,2')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
    })
    test('FWC exclusion operator includes 0..19 valid positions only', () => {
      const result = normalize.normalizeLine('<>FWC,1-10')
      expect(result.line).toBe('FWC,0,11,12,13,14,15,16,17,18,19')
    })
    test('duplicate tokens are deduplicated using first-occurrence rule', () => {
      const result = normalize.normalizeLine('MEX,1,1,2,2')
      expect(result.line).toBe('MEX,1,2')
    })
    test('overlapping ranges are deduplicated using first occurrence wins', () => {
      const result = normalize.normalizeLine('MEX,1-3,3-5')
      expect(result.line).toBe('MEX,1,2,3,4,5')
    })
    test('empty input returns null', () => {
      const result = normalize.normalizeLine('')
      expect(result.line).toBeNull()
    })
    test('Format 2 token with repeat preserves count after expansion', () => {
      const result = normalize.normalizeLine('MEX3(2),MEX4')
      expect(result.line).toBe('MEX,3(2),4')
    })
    test('Format 2 mixed separators and repeated delimiters are normalized', () => {
      const result = normalize.normalizeLine('MEX-1,,;MEX2;;;MEX3')
      expect(result.line).toBe('MEX,1,2,3')
    })
    test('range with repeats and overlap deduplicates correctly', () => {
      const result = normalize.normalizeLine('MEX-1-3(2),MEX2')
      expect(result.line).toBe('MEX,1(2),2(2),3(2)')
    })
    test('adjacent ranges merge logically without duplication', () => {
      const result = normalize.normalizeLine('MEX-1-2,MEX2-3')
      expect(result.line).toBe('MEX,1,2,3')
    })
    test('first occurrence wins for mixed count formats', () => {
      const result = normalize.normalizeLine('MEX,1(2),1,1(3)')
      expect(result.line).toBe('MEX,1(2)')
    })
    test('dedup respects expansion order not input order', () => {
      const result = normalize.normalizeLine('MEX-1-2,MEX1')
      expect(result.line).toBe('MEX,1,2')
    })
    test('exclusion ignores repeated tokens but still computes complement', () => {
      const result = normalize.normalizeLine('<>MEX,1(2),2(3)')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
    })
    test('FWC exclusion ignores repeats and expands correctly', () => {
      const result = normalize.normalizeLine('<>FWC,1(2),2(3)')
      expect(result.line).toBe('FWC,0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19')
    })
    test('completely invalid tokens produce null output', () => {
      const result = normalize.normalizeLine('!!!@@@###')
      expect(result.line).toBeNull()
    })
    test('mixed valid and invalid tokens still produce valid output', () => {
      const result = normalize.normalizeLine('MEX-1,@@@,MEX2')
      expect(result.line).toBe('MEX,1,2')
    })
    test('tokens from different country are ignored but do not break line', () => {
      const result = normalize.normalizeLine('MEX-1,ARG-2,MEX3')
      expect(result.line).toBe('MEX,1,3')
    })
    test('output order is stable regardless of input ordering', () => {
      const result = normalize.normalizeLine('MEX3,MEX1,MEX2')
      expect(result.line).toBe('MEX,1,2,3')
    })
    test('repeat counts in exclusion line do not produce a warning', () => {
      const result = normalize.normalizeLine('<>MEX,1-3(2)')
      expect(result.warnings.length).toBe(0) // repeats silently ignored in exclusion per spec
      expect(result.line).not.toBeNull()
    })
  })
  describe('normalizeLine() warnings and errors', () => {
    test('invalid country returns warning', () => {
      const result = normalize.normalizeLine('XXX-1,2,3')
      expect(result.line).toBeNull()
      expect(result.warnings).toEqual(['Country "XXX": not valid, line skipped.'])
    })
    test('mixed country tokens are skipped with warning', () => {
      const result = normalize.normalizeLine('MEX-1,ARG-2,MEX-3')
      expect(result.line).toBe('MEX,1,3')
      expect(result.warnings).toContain(
        'Country "MEX": "ARG-2" skipped. All stickers in the line should belong to the same country.'
      )
    })
    test('duplicate sticker emits warning', () => {
      const result = normalize.normalizeLine('MEX,1,1')
      expect(result.line).toBe('MEX,1')
      expect(result.warnings).toContain('Country "MEX": duplicate sticker(s) "1" ignored; first occurrence wins.')
    })
    test('duplicate sticker with different counts emits warning', () => {
      const result = normalize.normalizeLine('MEX,1(2),1(3)')
      expect(result.line).toBe('MEX,1(2)')
      expect(result.warnings).toContain('Country "MEX": duplicate sticker(s) "1" ignored; first occurrence wins.')
    })
    test('duplicate generated by range expansion emits warning', () => {
      const result = normalize.normalizeLine('MEX,1-3,3-5')
      expect(result.line).toBe('MEX,1,2,3,4,5')
      expect(result.warnings).toContain('Country "MEX": duplicate sticker(s) "3" ignored; first occurrence wins.')
    })
    test('duplicate stickers inside exclusion emit warning', () => {
      const result = normalize.normalizeLine('<>MEX,1,1,2')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
      expect(result.warnings).toContain('Country "MEX": duplicate sticker(s) "1" ignored; first occurrence wins.')
    })
    test('duplicate stickers due to range overlap in exclusion emit warning', () => {
      const result = normalize.normalizeLine('<>MEX,1-10,8-15')
      expect(result.line).toBe('MEX,16,17,18,19,20')
      expect(result.warnings).toContain('Country "MEX": duplicate sticker(s) "8,9,10" ignored; first occurrence wins.')
    })
    test('empty exclusion result returns warning', () => {
      const result = normalize.normalizeLine('<>MEX,1-20')
      expect(result.line).toBeNull()
      expect(result.warnings).toContain(
        'Country "MEX": exclusion operator produces an empty sticker set; line skipped.'
      )
    })
    test('exclusion line with no sticker tokens skips line and warns', () => {
      const result = normalize.normalizeLine('<>MEX')
      expect(result.line).toBeNull()
      expect(result.warnings).toContain(
        'Country "MEX": exclusion line has no sticker tokens; line skipped.'
      )
    })
    test('exclusion repeat-count warning is emitted only once', () => {
      const result = normalize.normalizeLine('<>MEX,1(2),2(3),3(4)')
      expect(result.warnings.filter(w => w === 'Country "MEX": repeat counts are ignored in exclusion operator.')
      ).toHaveLength(0) // repeat-count warning removed; silently ignored per spec
    })
    test('exclusion silently ignores repeat counts and produces no warning', () => {
      const result = normalize.normalizeLine('<>MEX,1(2),2(3)')
      expect(result.line).toBe('MEX,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20')
      expect(result.warnings.length).toBe(0) // repeats silently ignored per spec; no warning emitted
    })
    test('empty input returns null without warning', () => {
      const result = normalize.normalizeLine('')
      expect(result.line).toBeNull()
      expect(result.warnings).toEqual([])
    })
    test('valid stickers are preserved when mixed-country tokens are removed', () => {
      const result = normalize.normalizeLine('MEX-1,ARG-2,ARG-3')
      expect(result.line).toBe('MEX,1')
      expect(result.warnings).toHaveLength(2)
    })
  })
})
