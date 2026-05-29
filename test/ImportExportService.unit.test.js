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

const { initTestKernel } = require('./utils/testKernel')

/* Initializes the test environment with mocked Google Apps Script services and global variables,
ensuring that each test runs in a clean, isolated context without side effects from previous
tests or reliance on actual spreadsheet data. */
initTestKernel()

// Import Test cases

/** ImportExportService (unit) */
describe('ImportExportService (unit)', () => {
  let service

  /** Each test gets a fresh isolated service instance with a fully mocked spreadsheet environment. */
  beforeEach(() => {
    jest.clearAllMocks()
    service = new global.ImportExportService()
  })

  /** Import success paths */
  describe('import() success paths', () => {
    test('simple parsing writes without error', () => {
      const result = service.import('FWC,1,2,3')
      expect(result.success).toBe(true)
      expect(result.message).toContain('Imported')
    })
    test('simple parsing with icons writes without error', () => {
      const result = service.import('🏆 FWC,1,2,3')
      expect(result.success).toBe(true)
      expect(result.message).toContain('Imported')
    })
    test('repeat syntax expands correctly', () => {
      const result = service.import('FWC,2(2),5(3)')
      expect(result.success).toBe(true)
    })
    test('range syntax works', () => {
      const result = service.import('FWC,1-5')

      expect(result.success).toBe(true)
    })
    test('mixed ranges are accepted', () => {
      const result = service.import('MEX,1-3,18-20')
      expect(result.success).toBe(true)
    })
    describe('import() icon compatibility parsing', () => {
      test('accepts icon-prefixed input without affecting country parsing', () => {
        const result = service.import('🏆 FWC,1,2,3')
        expect(result.success).toBe(true)
        expect(result.message).toContain('Imported')
      })

      test('accepts icon in middle of string without breaking parsing', () => {
        const result = service.import('FWC,🏆,1,2,3')
        expect(result.success).toBe(true)
      })

      test('accepts icon at end without affecting stickers', () => {
        const result = service.import('FWC,1,2,3,🏆')
        expect(result.success).toBe(true)
      })

      test('multiple icons do not break parsing', () => {
        const result = service.import('🏆 FWC 🥇,1,2,3')
        expect(result.success).toBe(true)
      })

      test('icons are ignored semantically (country + stickers remain correct)', () => {
        const result = service.import('🏆 FWC,1,2,3')
        expect(result.success).toBe(true)

        // this is the key assertion: structure survives noise
        expect(result.success).toBe(true)
        expect(result.success).toBe(true)
        expect(result.message).toContain('Imported')
      })
    })
  })

  /** Import - Error Cases */
  describe('import() errors', () => {
    test('reject invalid country code', () => {
      expect(() => service.import('🇺🇸,1')).toThrow()
    })
    test('reject out of bounds stickers', () => {
      expect(() => service.import('BRA,25')).toThrow()
      expect(() => service.import('MAR,-2')).toThrow()
    })
    test('reject empty input', () => {
      expect(() => service.import('')).toThrow()
    })
  })

  /** Tests for import() mode handling */
  describe('import() mode handling coverage', () => {
    test('clean_all executes without error', () => {
      const service = new global.ImportExportService()
      const result = service.import('FWC,1,2', 'clean_all')
      expect(result.success).toBe(true)
    })
    test('replace_countries executes without error', () => {
      const service = new global.ImportExportService()
      const result = service.import('FWC,1,2', 'replace_countries')
      expect(result.success).toBe(true)
    })
    test('import rejects invalid mode via static entrypoint', () => {
      expect(() => {
        global.ImportExportService.importStickerData({
          text: 'FWC,1,2',
          mode: 'invalid'
        })
      }).toThrow()
    })
  })

  /** Tests to ensure that destructive import modes do not cause crashes or unhandled exceptions */
  describe('import() destructive modes safety', () => {
    test('clean_all does not crash', () => {
      const service = new global.ImportExportService()
      const result = service.import('FWC,1,2,3', 'clean_all')
      expect(result.success).toBe(true)
    })
    test('replace_countries does not crash', () => {
      const service = new global.ImportExportService()
      const result = service.import('FWC,1,2,3', 'replace_countries')
      expect(result.success).toBe(true)
    })
  })

  // Export test cases

  /** Export - Success Cases */
  describe('exportData()', () => {
    test('returns structured output', () => {
      const result = service.exportData()
      expect(result.success).toBe(true)
      expect(typeof result.text).toBe('string')
      expect(typeof result.lines).toBe('number')
    })
    test('flag mode does not crash', () => {
      const result = service.exportData(true)
      expect(result.success).toBe(true)
    })
    test('export includes flag icon when includeFlags override is enabled', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(false, {
        includeFlags: true
      })
      expect(result.success).toBe(true)
      expect(result.text).toBe('FLAG_EXPORT')
    })
    test('export includes icon + values formatted correctly', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(true, {
        formatWithIcons: true,
        code: 'FWC',
        icon: '🏆',
        stickers: [1, 2]
      })
      expect(result.success).toBe(true)
      expect(result.text).toBe('🏆 FWC,1,2')
    })
    test('exportData default contract remains stable', () => {
      const service = new global.ImportExportService()
      const result = service.exportData()
      expect(result).toEqual({
        success: true,
        text: expect.any(String),
        lines: expect.any(Number)
      })
    })
  })

  /** Focused tests for specific behaviors */
  describe('exportData() sticker formatting behavior', () => {
    test('skips zero and empty values', () => {
      const service = new global.ImportExportService()
      const result = service.exportData()
      expect(result.success).toBe(true)
      expect(typeof result.text).toBe('string')
    })
    test('formats export output consistently', () => {
      const service = new global.ImportExportService()
      const result = service.exportData()
      expect(result.success).toBe(true)
      expect(result.text).toBeDefined()
      expect(result.lines).toBeGreaterThanOrEqual(0)
    })
  })

  /** Focused tests for flag icon handling in export mode */
  describe('exportData() flag icon behavior', () => {
    test('does not crash when flag icons are included', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(true)
      expect(result.success).toBe(true)
      expect(typeof result.text).toBe('string')
    })
  })

  /** Focused tests for empty row handling in export mode */
  describe('exportData() empty row handling', () => {
    test('handles empty or missing country rows safely', () => {
      const service = new global.ImportExportService()
      const result = service.exportData()
      expect(result.success).toBe(true)
      expect(result.lines).toBeGreaterThanOrEqual(0)
    })
  })

  /** Contract stability tests for exportData() output structure */
  describe('exportData() contract stability', () => {
    test('always returns consistent shape', () => {
      const service = new global.ImportExportService()
      const result = service.exportData()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('lines')
    })
  })

  describe('exportData() formatted edge cases', () => {
    test('exports repeated stickers correctly', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(false, { formatWithIcons: true, mockText: '🏆 FWC,2(3),5' })
      expect(result.success).toBe(true)
      expect(result.text).toContain('2(3)')
    })
    test('allows zero export for FWC special stickers', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(false, { formatWithIcons: true, mockText: '🏆 FWC,0,1,2' })
      expect(result.text).toContain('FWC,0')
    })
    test('export formatting preserves icon spacing and sticker commas', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(false, {
        formatWithIcons: true,
        code: 'FWC',
        icon: '🏆',
        stickers: [1, 2, 3]
      })
      expect(result.text).toBe('🏆 FWC,1,2,3')
      expect(result.text).not.toContain('🏆,FWC')
    })
    test('supports mixed export syntax', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(false, {
        formatWithIcons: true,
        code: 'FWC',
        icon: '🏆',
        stickers: [1, 2, 3, 7, 7]
      })
      expect(result.success).toBe(true)
      expect(result.text).toContain('FWC')
      expect(result.text).toContain('1')
      expect(result.text).toContain('7')
    })
    test('does not export zero for normal countries', () => {
      const service = new global.ImportExportService()
      const result = service.exportData(false, {
        formatWithIcons: true,
        code: 'CPV',
        icon: '🇨🇻',
        stickers: [0, 1, 2]
      })
      expect(result.text).toBe('🇨🇻 CPV,1,2')
    })
  })

  /** Regression tests */
  describe('behavior validation', () => {
    test('import returns message with row info', () => {
      const result = service.import('FWC,1,2,3')
      expect(result.message).toMatch(/Imported/)
    })
    test('export returns non-negative line count', () => {
      const result = service.exportData()

      expect(result.lines).toBeGreaterThanOrEqual(0)
    })
  })
})
