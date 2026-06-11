/// test/Commons.unit.test.js

/** Unit tests for StickerSheetRepository. */

const { StickerSheetRepository } = require('../build/Commons.js')

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

/** Unit tests for StickerSheetRepository. */
describe('StickerSheetRepository unit tests', () => {
  describe('updateStickerCounts()', () => {
    test('groups updates and applies once per country', () => {
      const repo = createUnitRepo()
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'BRA', stickerNumber: 3, count: 1 },
        { countryCode: 'ARG', stickerNumber: 5, count: 4 }
      ])
      expect(repo._updateCountryCounts).toHaveBeenCalledTimes(2)
      expect(repo._updateCountryCounts).toHaveBeenCalledWith('ARG', [
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'ARG', stickerNumber: 5, count: 4 }
      ])
      expect(repo._updateCountryCounts).toHaveBeenCalledWith('BRA', [
        { countryCode: 'BRA', stickerNumber: 3, count: 1 }
      ])
    })
    test('writes grouped updates to sheet', () => {
      const repo = createUnitRepo()
      const setValues = jest.fn()
      const expected = Array(21).fill(0)
      expected[1] = 2
      expected[5] = 4
      repo.sheet = { getRange: jest.fn(() => ({ getValues: () => [Array(21).fill(0)], setValues })) }
      repo.startCol = 1
      repo.numStickerCols = 21
      repo.updateStickerCounts([
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'ARG', stickerNumber: 5, count: 4 }
      ])
      expect(setValues).toHaveBeenCalledWith([expected])
    })
    test('does nothing for empty updates', () => {
      const repo = createUnitRepo()
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([])
      expect(repo._updateCountryCounts).not.toHaveBeenCalled()
    })
  })

  describe('getCountryCounts()', () => {
    test('returns normalized counts', () => {
      const repo = createUnitRepo()
      repo.countsRange = { getValues: () => [['', 1, '2', -1], [3, '', null, 'abc']] }
      expect(repo.getCountryCounts('ARG')).toEqual([0, 1, 2, 0])
    })
    test('normalizes invalid values to zero', () => {
      const repo = createUnitRepo()
      repo.countsRange = { getValues: () => [['', null, 'abc', -1, 2]] }
      expect(repo.getCountryCounts('ARG')).toEqual([0, 0, 0, 0, 2])
    })
  })

  describe('getStickerCount()', () => {
    test('returns one sticker count', () => {
      const repo = createUnitRepo()
      repo.countsRange = { getValues: () => [[0, 1, 2, 3]] }
      expect(repo.getStickerCount('ARG', 2)).toBe(2)
    })
    test('throws when country row missing', () => {
      const repo = createUnitRepo()
      repo.countsRange = { getValues: () => [] }
      expect(() => repo.getStickerCount('ARG', 1)).toThrow('No count data found for country "ARG"')
    })
    test('rejects invalid sticker number', () => {
      const repo = createUnitRepo()
      expect(() => repo.getStickerCount('ARG', 99)).
        toThrow('Sticker number 99 is outside allowed range 0-20.')
    })
  })

  describe('getGroupCodes()', () => {
    test('returns unique normalized group codes preserving order', () => {
      const repo = createUnitRepo()
      repo.groupsRange = { getValues: () => [['a'], ['B'], ['A'], [''], [' c ']] }
      expect(repo.getGroupCodes()).toEqual(['A', 'B', 'C'])
    })
  })

  describe('updateStickerCounts()', () => {
    test('groups updates and applies once per country', () => {
      const repo = createUnitRepo()
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([
        { countryCode: 'ARG', stickerNumber: 1, count: 2 }, { countryCode: 'BRA', stickerNumber: 3, count: 1 },
        { countryCode: 'ARG', stickerNumber: 5, count: 4 }
      ])
      expect(repo._updateCountryCounts).toHaveBeenCalledTimes(2)
      expect(repo._updateCountryCounts).toHaveBeenCalledWith('ARG', [
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'ARG', stickerNumber: 5, count: 4 }
      ])
      expect(repo._updateCountryCounts).toHaveBeenCalledWith('BRA', [
        { countryCode: 'BRA', stickerNumber: 3, count: 1 }
      ])
    })
    test('does nothing for empty updates', () => {
      const repo = createUnitRepo()
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([])
      expect(repo._updateCountryCounts).not.toHaveBeenCalled()
    })
  })

  describe('_buildCountryRecord()', () => {
    test('valid record', () => {
      const repo = createUnitRepo()
      repo._toCount = jest.fn(v => Number(v))
      const result = repo._buildCountryRecord(['ARG'], ['A'], ['https://flagcdn.com/w160/ar.png'], ['Argentina'], [1, 2, 3])
      expect(result).toEqual({
        code: 'ARG',
        countryName: 'Argentina',
        group: 'A',
        flag: 'https://flagcdn.com/w160/ar.png',
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
    test('builds row and index lookup table', () => {
      const repo = createUnitRepo()
      repo.startRow = 5
      repo.getCountries = jest.fn(() => [{ code: 'ARG' }, { code: 'BRA' }])
      expect(repo._buildCountryMap()).toEqual({
        ARG: { row: 5, index: 0 },
        BRA: { row: 6, index: 1 }
      })
    })
    test('trims and normalizes values', () => {
      const repo = createUnitRepo()
      repo._toCount = jest.fn(v => Number(v))
      const result = repo._buildCountryRecord([' arg '], [' b '], [' flag '], [' Argentina '], [1])
      expect(result.code).toBe('ARG')
      expect(result.group).toBe('B')
      expect(result.flag).toBe('flag')
      expect(result.countryName).toBe('Argentina')
    })
  })

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
    test('normalization trims and uppercase correctly for valid lookup', () => {
      const repo = createUnitRepo()
      const result = repo._normalizeCountryCode(' arg ')

      expect(result).toBe('ARG')
    })
  })

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

  describe('_buildCountryMap()', () => {
    test('builds row and index lookup table', () => {
      const repo = createUnitRepo()
      repo.startRow = 5
      repo.getCountries = jest.fn(() => [{ code: 'ARG' }, { code: 'BRA' }])
      expect(repo._buildCountryMap()).toEqual({
        ARG: { row: 5, index: 0 },
        BRA: { row: 6, index: 1 }
      })
    })
  })

  describe('_updateCountryCounts()', () => {
    test('updates specified stickers and preserves existing values', () => {
      const repo = createUnitRepo()
      const currentRow = Array(21).fill(0)
      currentRow[1] = 1
      currentRow[3] = 2
      const setValues = jest.fn()
      repo.sheet = { getRange: jest.fn(() => ({ getValues: () => [currentRow], setValues })) }
      repo.startCol = 1
      repo.numStickerCols = 21
      repo._updateCountryCounts('ARG', [
        { stickerNumber: 3, count: 5 },
        { stickerNumber: 10, count: 2 }
      ])
      expect(setValues).toHaveBeenCalledTimes(1)
      const written = setValues.mock.calls[0][0][0]
      expect(written[1]).toBe(1)
      expect(written[3]).toBe(5)
      expect(written[10]).toBe(2)
    })
    test('last update wins when same sticker appears multiple times', () => {
      const repo = createUnitRepo()
      const setValues = jest.fn()
      repo.sheet = { getRange: jest.fn(() => ({ getValues: () => [Array(21).fill(0)], setValues })) }
      repo.startCol = 1
      repo.numStickerCols = 21
      repo._updateCountryCounts('ARG', [
        { stickerNumber: 5, count: 1 },
        { stickerNumber: 5, count: 3 }
      ])
      expect(setValues.mock.calls[0][0][0][5]).toBe(3)
    })
    test('rejects unknown country', () => {
      const repo = createUnitRepo()
      expect(() => repo._updateCountryCounts('XXX', [])).
        toThrow('Country code "XXX" was not found in the COUNTRIES named range.')
    })
  })
})
