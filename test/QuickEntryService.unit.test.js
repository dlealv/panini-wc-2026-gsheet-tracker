// test/QuickEntryService.unit.test.js

/**
 * QuickEntryService unit tests.
 *
 * Responsibilities:
 * - validates UI view model generation
 * - validates sticker status logic
 * - validates normalization behavior
 * - validates summary calculations
 * - validates pending update rules
 *
 * IMPORTANT:
 * The shared test kernel MUST initialize BEFORE loading
 * any compiled GAS build modules.
 */

const { initTestKernel } = require('./utils/testKernel.js')

/* Initializes the test environment with mocked Google Apps Script services and global variables,
ensuring that each test runs in a clean, isolated context without side effects from previous tests
or reliance on actual spreadsheet data. */
initTestKernel()

const { QuickEntryService } = require('../build/QuickEntryService.js')

/** QuickEntryService (unit) */
describe('QuickEntryService (unit)', () => {
  let service

  /** Create a fresh service before each test. */
  beforeEach(() => {
    service = new QuickEntryService()
  })

  /** Tests for initial data retrieval. */
  describe('getInitialData()', () => {
    test('returns structured payload', () => {
      const result = service.getInitialData()

      expect(result).toHaveProperty('countries')
      expect(result).toHaveProperty('groupCodes')
      expect(result.selectedStatusFilter).toBe('all')
      expect(result.selectedGroupFilter).toBe('all')
    })
  })

  /** Tests for functions that determine sticker status based on count. */
  describe('_getStickerStatus()', () => {
    test('returns missing for zero', () => {
      expect(service._getStickerStatus(0)).toBe('missing')
    })
    test('returns all for one', () => {
      expect(service._getStickerStatus(1)).toBe('all')
    })
    test('returns repeated for values above one', () => {
      expect(service._getStickerStatus(2)).toBe('repeated')
      expect(service._getStickerStatus(5)).toBe('repeated')
    })
  })

  /** Tests for mapping sticker counts to CSS classes for UI rendering. */
  describe('_getStickerColorClass()', () => {
    test('maps zero correctly', () => {
      expect(service._getStickerColorClass(0)).toBe('count-0')
    })
    test('maps one correctly', () => {
      expect(service._getStickerColorClass(1)).toBe('count-1')
    })
    test('maps two correctly', () => {
      expect(service._getStickerColorClass(2)).toBe('count-2')
    })
    test('maps three correctly', () => {
      expect(service._getStickerColorClass(3)).toBe('count-3')
    })
    test('maps four correctly', () => {
      expect(service._getStickerColorClass(4)).toBe('count-4')
    })
    test('maps values above four correctly', () => {
      expect(service._getStickerColorClass(5)).toBe('count-5-plus')
      expect(service._getStickerColorClass(10)).toBe('count-5-plus')
    })
  })

  /** Tests for functions that generate number ranges. */
  describe('_buildNumberRange()', () => {
    test('builds inclusive ranges', () => {
      expect(service._buildNumberRange(1, 5)).
        toEqual([1, 2, 3, 4, 5])
    })
    test('supports zero start', () => {
      expect(service._buildNumberRange(0, 3)).
        toEqual([0, 1, 2, 3])
    })
    test('supports single value ranges', () => {
      expect(service._buildNumberRange(7, 7)).
        toEqual([7])
    })
  })

  /** Tests for functions that generate icon labels for stickers. */
  describe('_getStickerIconLabel()', () => {
    test('FWC never returns labels', () => {
      expect(service._getStickerIconLabel('FWC', 1)).toBe('')
      expect(service._getStickerIconLabel('FWC', 13)).toBe('')
    })
    test('sticker 1 returns CREST', () => {
      expect(service._getStickerIconLabel('ARG', 1)).
        toBe('CREST')
    })
    test('sticker 13 returns TEAM', () => {
      expect(service._getStickerIconLabel('ARG', 13)).
        toBe('TEAM')
    })
    test('other stickers return empty string', () => {
      expect(service._getStickerIconLabel('ARG', 5)).
        toBe('')
    })
  })

  /** Tests for functions that normalize country codes. */
  describe('_normalizeCountryCode()', () => {
    test('normalizes formatting', () => {
      expect(service._normalizeCountryCode(' arg ')).
        toBe('ARG')
    })
    test('rejects empty values', () => {
      expect(() => service._normalizeCountryCode('')).
        toThrow('Country code is required.')
    })
  })

  /** Tests for functions that normalize pending updates. */
  describe('_normalizePendingUpdates()', () => {
    test('normalizes valid updates', () => {
      const result = service._normalizePendingUpdates([
        {
          countryCode: 'arg',
          stickerNumber: 1,
          count: 2
        }
      ])

      expect(result).toEqual([
        {
          countryCode: 'ARG',
          stickerNumber: 1,
          count: 2
        }
      ])
    })
    test('rejects empty arrays', () => {
      expect(() => service._normalizePendingUpdates([])).
        toThrow('There are no pending updates to apply.')
    })
  })

  /** Tests for functions that validate visible stickers based on country and number. */
  describe('_validateVisibleSticker()', () => {
    test('accepts valid stickers', () => {
      expect(() =>
        service._validateVisibleSticker('ARG', 1)
      ).not.toThrow()
    })
    test('rejects invalid stickers', () => {
      expect(() =>
        service._validateVisibleSticker('ARG', 99)
      ).toThrow(
        'Sticker 99 is not valid for country code "ARG".'
      )
    })
  })

  /** Tests for summary calculations. */
  describe('_buildSummary()', () => {
    test('calculates summary correctly', () => {
      const summary = service._buildSummary([
        { count: 0 },
        { count: 1 },
        { count: 2 }
      ])

      expect(summary).toEqual({
        owned: 2,
        missing: 1,
        repeated: 1,
        total: 3,
        completionPercent: 67
      })
    })
    test('handles empty stickers safely', () => {
      const summary = service._buildSummary([])
      expect(summary).toEqual({
        owned: 0,
        missing: 0,
        repeated: 0,
        total: 0,
        completionPercent: 0
      })
    })
  })

  /** Tests for building sticker view models for the UI. */
  describe('_buildStickerView()', () => {
    test('builds correct sticker view model', () => {
      const view = service._buildStickerView('ARG', 1, 2)
      expect(view).toEqual({
        number: 1,
        count: 2,
        status: 'repeated',
        colorClass: 'count-2',
        iconLabel: 'CREST',
        label: '1 (2)'
      })
    })
    test('FWC disables icon labels', () => {
      const view = service._buildStickerView('FWC', 0, 0)
      expect(view.iconLabel).toBe('')
    })
  })

  /** Tests for determining visible sticker numbers based on country code. */
  describe('_getVisibleStickerNumbers()', () => {
    test('FWC returns 0-19 range', () => {
      const result = service._getVisibleStickerNumbers('FWC')
      expect(result[0]).toBe(0)
      expect(result[result.length - 1]).toBe(19)
      expect(result).toHaveLength(20)
    })
    test('normal country returns 1-20 range', () => {
      const result = service._getVisibleStickerNumbers('ARG')
      expect(result[0]).toBe(1)
      expect(result[result.length - 1]).toBe(20)
      expect(result).toHaveLength(20)
    })
  })

  /** Tests for building country view models for the UI. */
  describe('_buildCountryViewModel()', () => {
    test('builds full country view model', () => {
      const country = {
        code: 'ARG',
        countryName: 'Argentina',
        group: 'A',
        flag: 'flag-url',
        counts: {
          1: 1,
          2: 0
        }
      }
      const result = service._buildCountryViewModel(country)
      expect(result.code).toBe('ARG')
      expect(result.countryName).toBe('Argentina')
      expect(result.isCompleted).toBe(false)
      expect(result.stickers.length).toBeGreaterThan(0)
      expect(result.summary).toHaveProperty('missing')
    })
  })
})
