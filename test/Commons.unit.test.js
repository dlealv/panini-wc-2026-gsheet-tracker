/// test/Commons.unit.test.js

/** Unit tests for StickerSheetRepository. */

const { StickerSheetRepository } = require('../build/Commons.js')
const { initTestKernel } = require('./utils/testKernel.js')

/** Unit tests for StickerSheetRepository. */
describe('StickerSheetRepository unit tests', () => {
  let repo
  beforeEach(() => {
    initTestKernel()
    repo = new StickerSheetRepository()
  })

  /**
   * Helper to test range getters with common behaviors:
   * - returns valid range with expected number of rows
   * - caches value on subsequent calls
   * - throws if range has invalid shape
   */
  function testRangeGetter (methodName) {
    test('returns valid range', () => {
      const range = repo[methodName]()
      expect(range.getValues().length).toBe(49)
    })
    test('caches value', () => {
      const first = repo[methodName]()
      const second = repo[methodName]()
      expect(first).toBe(second)
    })
    test('throws on invalid shape', () => {
      initTestKernel()
      global.SpreadsheetApp.getActiveSpreadsheet = () => ({
        getRangeByName: () => ({ getNumRows: () => 10, getNumColumns: () => 1 })
      })
      const repo = new StickerSheetRepository()
      expect(() => repo[methodName]()).toThrow()
    })
  }

  /**
   * Helper to test cached number getters with common behaviors:
   * - returns valid number greater than or equal to min
   * - caches value on subsequent calls
   */
  function testCachedNumberGetter (methodName, min = 0) {
    test(`${methodName} returns valid number`, () => {
      const v = repo[methodName]()
      expect(typeof v).toBe('number')
      expect(v).toBeGreaterThanOrEqual(min)
    })
    test(`${methodName} caches value`, () => {
      expect(repo[methodName]()).toBe(repo[methodName]())
    })
  }

  /** Test each range getter with shared behaviors. */
  describe('getCountriesRange()', () => {
    testRangeGetter('getCountriesRange')
  })

  /** Test each range getter with shared behaviors. */
  describe('getCountryNamesRange()', () => {
    testRangeGetter('getCountryNamesRange')
  })

  /** Test each range getter with shared behaviors. */
  describe('getGroupsRange()', () => {
    testRangeGetter('getGroupsRange')
  })

  /** Test each range getter with shared behaviors. */
  describe('getFlagsUrlRange()', () => {
    testRangeGetter('getFlagsUrlRange')
  })

  /** Test each range getter with shared behaviors. */
  describe('getCountsRange()', () => {
    testRangeGetter('getCountsRange')
  })

  /** Test each range getter with shared behaviors. */
  describe('getDoneRange()', () => {
    testRangeGetter('getDoneRange')
  })

  /** Test each range getter with shared behaviors. */
  describe('getFlagIconsRange()', () => {
    testRangeGetter('getFlagIconsRange')
  })

  /** Test getSheet() method */
  describe('getSheet()', () => {
    test('returns valid sheet object', () => {
      const sheet = repo.getSheet()
      expect(sheet).toBeDefined()
      expect(typeof sheet.getRange).toBe('function')
    })
    test('caches value', () => {
      const first = repo.getSheet()
      const second = repo.getSheet()
      expect(first).toBe(second)
    })
  })

  /** Test getStartCol() method */
  describe('getStartCol()', () => {
    testCachedNumberGetter('getStartCol', 1)
  })

  /** Test getNumRows() method */
  describe('getNumRows()', () => {
    testCachedNumberGetter('getNumRows', 1)
  })

  /** Test getStartCol() method */
  describe('getNumStickerCols()', () => {
    testCachedNumberGetter('getNumStickerCols', 1)
  })

  /** Test getCountryMap() method */
  describe('getCountryMap()', () => {
    test('returns valid country map object', () => {
      const map = repo.getCountryMap()
      expect(map).toBeDefined()
      expect(typeof map).toBe('object')
      expect(map.FWC).toEqual({ row: 1, index: 0 })
      expect(map.MEX).toEqual({ row: 2, index: 1 })
    })
    test('caches value', () => {
      const first = repo.getCountryMap()
      const second = repo.getCountryMap()
      expect(first).toBe(second)
    })
    test('uses getStartRow for row offset', () => {
      repo.countries = [{ code: 'FWC' }, { code: 'MEX' }]
      repo.getStartRow = jest.fn(() => 10)
      expect(repo.getCountryMap()).toEqual({ FWC: { row: 10, index: 0 }, MEX: { row: 11, index: 1 } })
    })
    test('uses startRow property fallback', () => {
      repo.countries = [{ code: 'ARG' }]
      repo.startRow = 25
      expect(repo.getCountryMap()).toEqual({ ARG: { row: 25, index: 0 } })
    })
    test('returns empty object when no countries exist', () => {
      repo.countries = []
      expect(repo.getCountryMap()).toEqual({})
    })
    test('last duplicate country code wins', () => {
      repo.countries = [{ code: 'ARG' }, { code: 'BRA' }, { code: 'ARG' }]
      repo.startRow = 1
      expect(repo.getCountryMap()).toEqual({ ARG: { row: 3, index: 2 }, BRA: { row: 2, index: 1 } })
    })
  })

  /** Test getGroupCodes() method */
  describe('getGroupCodes()', () => {
    test('returns unique normalized group codes preserving order', () => {
      repo.groupsRange = { getValues: jest.fn(() => [['a'], ['B'], ['A'], [''], [' c ']]) }
      expect(repo.getGroupCodes()).toEqual(['A', 'B', 'C'])
    })
    test('caches value', () => {
      const first = repo.getGroupCodes()
      const second = repo.getGroupCodes()
      expect(first).toBe(second)
    })
    test('returns empty array when no valid groups exist', () => {
      repo.groupsRange = { getValues: jest.fn(() => [[''], [' '], [null]]) }
      expect(repo.getGroupCodes()).toEqual([])
    })
  })

  /** Test getStickerCount() method */
  describe('getStickerCount()', () => {
    test('returns one sticker count', () => {
      expect(repo.getStickerCount('FWC', 1)).toBe(1)
    })
    test('throws when counts row is empty (ARG setup)', () => {
      repo.countsRange = { getValues: jest.fn(() => []) }
      repo.countryMap = { ARG: { index: 0, row: 1 } }
      expect(() => repo.getStickerCount('ARG', 1)).toThrow('No count data found for country "ARG"')
    })
    test('throws when counts row is empty (FWC kernel case)', () => {
      repo.countsRange = { getValues: jest.fn(() => []) }
      expect(() => repo.getStickerCount('FWC', 1)).toThrow('No count data found for country "FWC"')
    })
    test('rejects invalid sticker number', () => {
      repo.countryMap = { ARG: { index: 0, row: 1 } }
      expect(() => repo.getStickerCount('ARG', 99)).
        toThrow('Sticker number 99 is outside allowed range 0-20.')
    })
    test('normalizes country code before lookup', () => {
      expect(repo.getStickerCount(' fwc ', 1)).toBe(1)
    })
    test('throws when country code does not exist', () => {
      expect(() => repo.getStickerCount('ARG', 1)).
        toThrow('Country code "ARG" was not found in the COUNTRIES named range.')
    })
  })

  /** Test getCountryCounts() method */
  describe('getCountryCounts()', () => {
    test('returns country counts from repository', () => {
      const counts = repo.getCountryCounts('FWC')
      expect(counts[1]).toBe(1)
      expect(counts[3]).toBe(2)
    })
    test('returns normalized counts', () => {
      repo.countsRange = {
        getValues: jest.fn(() => [['', 1, '2', -1], [3, '', null, 'abc']])
      }
      repo.countryMap = { ARG: { index: 0, row: 1 } }
      expect(repo.getCountryCounts('ARG')).toEqual([0, 1, 2, 0])
    })
    test('normalizes invalid values to zero', () => {
      repo.countsRange = {
        getValues: jest.fn(() => [['', null, 'abc', -1, 2]])
      }
      repo.countryMap = { ARG: { index: 0, row: 1 } }
      expect(repo.getCountryCounts('ARG')).toEqual([0, 0, 0, 0, 2])
    })
    test('normalizes country code before lookup', () => {
      expect(repo.getCountryCounts(' fwc ')[1]).toBe(1)
      expect(repo.getCountryCounts('mex')).toEqual(Array(21).fill(0))
    })
    test('throws when country code does not exist', () => {
      expect(() => repo.getCountryCounts('ARG')).
        toThrow('Country code "ARG" was not found in the COUNTRIES named range.')
    })
    test('getCountryCounts throws when COUNTRIES range is empty', () => {
      repo.countryMap = {}
      expect(() => repo.getCountryCounts('FWC')).toThrow()
    })
  })

  /** Test updateStickerCounts() method */
  describe('updateStickerCounts()', () => {
    test('groups updates and applies once per country', () => {
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([
        { countryCode: 'FWC', stickerNumber: 1, count: 2 },
        { countryCode: 'MEX', stickerNumber: 3, count: 1 },
        { countryCode: 'FWC', stickerNumber: 5, count: 4 }
      ])
      expect(repo._updateCountryCounts).toHaveBeenCalledTimes(2)
      expect(repo._updateCountryCounts).toHaveBeenCalledWith('FWC', [
        { countryCode: 'FWC', stickerNumber: 1, count: 2 },
        { countryCode: 'FWC', stickerNumber: 5, count: 4 }
      ])
      expect(repo._updateCountryCounts).toHaveBeenCalledWith('MEX', [
        { countryCode: 'MEX', stickerNumber: 3, count: 1 }
      ])
    })
    test('writes grouped updates to sheet', () => {
      const setValues = jest.fn()
      repo.sheet = { getRange: jest.fn(() => ({ getValues: () => [Array(21).fill(0)], setValues })) }
      repo.updateStickerCounts([
        { countryCode: 'FWC', stickerNumber: 1, count: 2 },
        { countryCode: 'FWC', stickerNumber: 5, count: 4 }
      ])
      const expected = Array(21).fill(0)
      expected[1] = 2
      expected[5] = 4
      expect(setValues).toHaveBeenCalledWith([expected])
    })
    test('does nothing for empty updates', () => {
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([])
      expect(repo._updateCountryCounts).not.toHaveBeenCalled()
    })
    test('processes countries in first-seen order', () => {
      repo._updateCountryCounts = jest.fn()
      repo.updateStickerCounts([
        { countryCode: 'MEX', stickerNumber: 1, count: 1 },
        { countryCode: 'FWC', stickerNumber: 1, count: 1 }
      ])
      expect(repo._updateCountryCounts.mock.calls.map(call => call[0])).toEqual(['MEX', 'FWC'])
    })
  })

  /** Test getCountries() method */
  describe('getCountries()', () => {
    test('returns full country dataset from kernel', () => {
      const countries = repo.getCountries()
      expect(countries).toHaveLength(2)
      expect(countries[0]).toMatchObject({
        code: 'FWC',
        countryName: 'World Cup',
        group: 'A',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_FIFA.svg'
      })
      expect(countries[0].counts[1]).toBe(1)
      expect(countries[0].counts[3]).toBe(2)
    })
    test('preserves sheet order', () => {
      const res = repo.getCountries()
      expect(res[0].code).toBe('FWC')
    })
    test('handles missing row data safely', () => {
      repo.groupsRange = { getValues: () => [['A'], []] }
      const res = repo.getCountries()
      expect(res[0].group).toBe('A')
      expect(res[1].group).toBe('')
    })
    test('normalizes country fields (trim + uppercase)', () => {
      repo.countriesRange = { getValues: () => [[' arg ']] }
      repo.groupsRange = { getValues: () => [[' b ']] }
      repo.flagsUrlRange = { getDisplayValues: () => [[' flag ']] }
      repo.countryNamesRange = { getDisplayValues: () => [[' Argentina ']] }
      repo.countsRange = { getValues: () => [[1]] }

      const res = repo.getCountries()[0]
      expect(res.code).toBe('ARG')
      expect(res.group).toBe('B')
      expect(res.flag).toBe('flag')
      expect(res.countryName).toBe('Argentina')
    })
    test('normalizes invalid counts to zero', () => {
      repo.countsRange = { getValues: () => [['', null, 'abc', -1, 2], Array(5).fill('')] }
      const res = repo.getCountries()[0].counts
      expect(res).toEqual([0, 0, 0, 0, 2])
    })
    test('returns empty array when no valid countries exist', () => {
      repo.countriesRange = { getValues: () => [['']] }
      const res = repo.getCountries()
      expect(res).toEqual([])
    })
    test('filters out rows with empty country codes', () => {
      repo.countriesRange = { getValues: () => [['FWC'], [''], ['   '], ['MEX']] }
      const res = repo.getCountries()
      expect(res.map(c => c.code)).toEqual(['FWC', 'MEX'])
    })
    test('keeps data aligned across all named ranges', () => {
      repo.countriesRange = { getValues: () => [['FWC'], ['MEX']] }
      repo.groupsRange = { getValues: () => [['A'], ['B']] }
      repo.flagsUrlRange = { getDisplayValues: () => [['f1'], ['f2']] }
      repo.countryNamesRange = { getDisplayValues: () => [['WC'], ['MX']] }
      repo.countsRange = { getValues: () => [[1], [2]] }
      const res = repo.getCountries()
      expect(res[0]).toMatchObject({ code: 'FWC', group: 'A', countryName: 'WC' })
      expect(res[1]).toMatchObject({ code: 'MEX', group: 'B', countryName: 'MX' })
    })
    test('keeps valid numeric counts unchanged', () => {
      repo.countsRange = { getValues: () => [[0, 1, 2, 20]] }
      const res = repo.getCountries()[0].counts
      expect(res).toEqual([0, 1, 2, 20])
    })
    test('handles missing optional metadata gracefully', () => {
      repo.groupsRange = { getValues: () => [[]] }
      repo.flagsUrlRange = { getDisplayValues: () => [[]] }
      repo.countryNamesRange = { getDisplayValues: () => [[]] }
      repo.countriesRange = { getValues: () => [['FWC']] }
      repo.countsRange = { getValues: () => [[1]] }
      const res = repo.getCountries()[0]
      expect(res.group).toBe('')
      expect(res.flag).toBe('')
      expect(res.countryName).toBe('')
    })
    test('handles missing counts row safely', () => {
      repo.countriesRange = { getValues: () => [['FWC'], ['MEX']] }
      repo.groupsRange = { getValues: () => [['A'], ['B']] }
      repo.flagsUrlRange = { getDisplayValues: () => [['f1'], ['f2']] }
      repo.countryNamesRange = { getDisplayValues: () => [['WC'], ['MX']] }
      repo.countsRange = { getValues: () => [[1, 2, 3]] } // ❌ only 1 row
      const res = repo.getCountries()
      expect(res[1].counts).toEqual([])
    })
    test('returns cached reference (mutation affects cache)', () => {
      const first = repo.getCountries()
      const lenBefore = first.length
      first.push({ code: 'X' })
      const second = repo.getCountries()
      expect(second.length).toBe(lenBefore + 1)
      expect(second).toBe(first)
    })
    test('filters empty and whitespace-only country rows', () => {
      repo.countriesRange = { getValues: () => [['FWC'], [''], ['   '], ['MEX']] }
      expect(repo.getCountries().map(c => c.code)).toEqual(['FWC', 'MEX'])
    })
    test('getCountries returns cached reference (mutations affect cache)', () => {
      const first = repo.getCountries()
      const lenBefore = first.length
      first.push({ code: 'X' })
      const second = repo.getCountries()
      expect(second).toBe(first)
      expect(second.length).toBe(lenBefore + 1)
    })
  })
})
