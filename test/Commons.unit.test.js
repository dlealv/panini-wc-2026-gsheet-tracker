/// test/Commons.unit.test.js

/** Unit tests for StickerSheetRepository. */

const { StickerSheetRepository } = require('../build/Commons.js')
const { initTestKernel } = require('./utils/testKernel.js')

const MAX_ROWS = StickerSheetRepository.getMaxRows()

/**
 * Helper function to check sticker values for a given country, it checks empty stickers (''),
 * non empty and zero values
 * */
function checkStickers(row, stickersWithValues, stickersWithZero = []) {
  row.forEach((value, index) => {
    const stickerNumber = index
    if (stickersWithValues.includes(stickerNumber)) {
      expect(value).toBeGreaterThan(0)
    }
    if (stickersWithZero.includes(stickerNumber)) {
      expect(value).toBe(0)
    }
    if (!stickersWithValues.includes(stickerNumber) && !stickersWithZero.includes(stickerNumber)) {
      expect(value).toBe('')
    }
  })
}

/** Unit tests for StickerSheetRepository. */
describe('StickerSheetRepository unit tests', () => {
  let repo
  beforeEach(() => {
    jest.clearAllMocks()
    initTestKernel()
    repo = new StickerSheetRepository()
  })

  /** constructor — optional ss parameter */
  describe('constructor(ss)', () => {
    test('defaults to SpreadsheetApp.getActiveSpreadsheet() when ss is omitted', () => {
      const ss = global.SpreadsheetApp.getActiveSpreadsheet()
      const r = new StickerSheetRepository()
      expect(r.ss).toBe(ss)
    })
    test('uses the provided ss instance when one is passed', () => {
      const fakeSs = { getRangeByName: jest.fn() }
      const r = new StickerSheetRepository(fakeSs)
      expect(r.ss).toBe(fakeSs)
    })
  })

  /**
   * Helper to test range getters with common behaviors:
   * - returns valid range with expected number of rows
   * - caches value on subsequent calls
   * - throws if range has invalid shape
   */
  function testRangeGetter(methodName) {
    test('returns valid range', () => {
      const range = repo[methodName]()
      expect(range.getValues().length).toBe(MAX_ROWS)
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
  function testCachedNumberGetter(methodName, min = 0) {
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
  describe('getCountryCodesRange()', () => {
    testRangeGetter('getCountryCodesRange')
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

  /** Test getTradePreferencesRange() method */
  describe('getTradePreferencesRange()', () => {
    test('returns valid range', () => {
      const range = repo.getTradePreferencesRange()
      expect(range).toBeDefined()
      expect(typeof range.getDisplayValues).toBe('function')
    })
    test('caches value', () => {
      const first = repo.getTradePreferencesRange()
      const second = repo.getTradePreferencesRange()
      expect(first).toBe(second)
    })
    test('returns null when TRADE_PREFERENCES named range does not exist', () => {
      initTestKernel()
      global.SpreadsheetApp.getActiveSpreadsheet = () => ({
        getRangeByName: name => {
          if (name === 'TRADE_PREFERENCES') {
            return null
          }
          return { getValues: () => [['FWC']], getDisplayValues: () => [['FWC']] }
        }
      })
      const localRepo = new StickerSheetRepository()
      expect(localRepo.getTradePreferencesRange()).toBeNull()
    })
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

  /** Test getCountryCodes() method */
  describe('getCountryCodes()', () => {
    test('returns normalized codes in album order (COUNTRIES range order)', () => {
      repo.countryCodeRange = { getValues: jest.fn(() => [['fwc'], [' mex '], ['ARG']]) }
      expect(repo.getCountryCodes()).toEqual(new Set(['FWC', 'MEX', 'ARG']))
    })
    test('filters empty and whitespace-only rows', () => {
      repo.countryCodeRange = { getValues: jest.fn(() => [['FWC'], [''], ['   '], ['MEX']]) }
      expect(repo.getCountryCodes()).toEqual(new Set(['FWC', 'MEX']))
    })
    test('caches value and reads the range only once', () => {
      const getValues = jest.fn(() => [['FWC'], ['MEX']])
      repo.countryCodeRange = { getValues }
      const first = repo.getCountryCodes()
      const second = repo.getCountryCodes()
      expect(first).toBe(second)
      expect(getValues).toHaveBeenCalledTimes(1)
    })
    test('returns empty set when no valid codes exist', () => {
      repo.countryCodeRange = { getValues: jest.fn(() => [[''], [' '], [null]]) }
      expect(repo.getCountryCodes()).toEqual(new Set())
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

  /** Test getFlagIcons() method */
  describe('getFlagIcons()', () => {
    test('returns positional flag icon values, trimmed, blank rows preserved as empty string', () => {
      const icons = repo.getFlagIcons()
      expect(icons[0]).toBe('🏆')
      expect(icons[1]).toBe('🇲🇽')
      expect(icons[2]).toBe('')
      expect(icons).toHaveLength(50)
    })
    test('trims surrounding whitespace', () => {
      repo.flagIconsRange = { getDisplayValues: jest.fn(() => [[' 🏆 '], ['🇲🇽']]) }
      expect(repo.getFlagIcons()).toEqual(['🏆', '🇲🇽'])
    })
    test('caches value', () => {
      const first = repo.getFlagIcons()
      const second = repo.getFlagIcons()
      expect(first).toBe(second)
    })
  })

  /** Test getDone() method */
  describe('getDone()', () => {
    test('returns positional Done values computed from the DONE named range', () => {
      const done = repo.getDone()
      expect(done[0]).toBe(2) // FWC: stickers 1,3 owned (see TEST_DATA)
      expect(done[1]).toBe(2) // MEX: stickers 18,20 owned
      expect(done[2]).toBe(0) // CC: none owned
      expect(done).toHaveLength(50)
    })
    test('normalizes invalid/blank values to zero', () => {
      repo.doneRange = { getValues: jest.fn(() => [[''], [null], ['abc'], [3]]) }
      expect(repo.getDone()).toEqual([0, 0, 0, 3])
    })
    test('caches value', () => {
      const first = repo.getDone()
      const second = repo.getDone()
      expect(first).toBe(second)
    })
  })

  /**
   * Test getStickerCount() method. Also covers getCountryCounts(), an inner function of getStickerCount()
   * (only ever called from there) - per the "public methods only" testing rule, its row-lookup/normalization
   * behavior is exercised entirely through this public entry point instead of a dedicated describe block.
   */
  describe('getStickerCount()', () => {
    test('returns one sticker count', () => {
      expect(repo.getStickerCount('FWC', 1)).toBe(1)
      expect(repo.getStickerCount('FWC', 3)).toBe(2)
    })
    test('returns normalized counts across a multi-row COUNTS range', () => {
      repo.countsRange = {
        getValues: jest.fn(() => [['', 1, '2', -1], [3, '', null, 'abc']])
      }
      repo.countryCodes = new Set(['ARG'])
      repo.countryIndexByCode = new Map([['ARG', 0]])
      expect(repo.getStickerCount('ARG', 0)).toBe(0)
      expect(repo.getStickerCount('ARG', 1)).toBe(1)
      expect(repo.getStickerCount('ARG', 2)).toBe(2)
      expect(repo.getStickerCount('ARG', 3)).toBe(0)
    })
    test('normalizes invalid values to zero', () => {
      repo.countsRange = {
        getValues: jest.fn(() => [['', null, 'abc', -1, 2]])
      }
      repo.countryCodes = new Set(['ARG'])
      repo.countryIndexByCode = new Map([['ARG', 0]])
      expect(repo.getStickerCount('ARG', 0)).toBe(0)
      expect(repo.getStickerCount('ARG', 1)).toBe(0)
      expect(repo.getStickerCount('ARG', 2)).toBe(0)
      expect(repo.getStickerCount('ARG', 3)).toBe(0)
      expect(repo.getStickerCount('ARG', 4)).toBe(2)
    })
    test('throws when counts row is empty (ARG setup)', () => {
      repo.countsRange = { getValues: jest.fn(() => []) }
      repo.countryCodes = new Set(['ARG'])
      repo.countryIndexByCode = new Map([['ARG', 0]])
      expect(() => repo.getStickerCount('ARG', 1)).toThrow('No count data found for country "ARG"')
    })
    test('throws when counts row is empty (FWC kernel case)', () => {
      repo.countsRange = { getValues: jest.fn(() => []) }
      expect(() => repo.getStickerCount('FWC', 1)).toThrow('No count data found for country "FWC"')
    })
    test('throws when COUNTRIES range is empty', () => {
      repo.countryCodes = new Set()
      expect(() => repo.getStickerCount('FWC', 1)).toThrow()
    })
    test('rejects invalid sticker number', () => {
      expect(() => repo.getStickerCount('ARG', 99)).
        toThrow('Sticker number 99 is outside allowed range 0-20.')
    })
    test('normalizes country code before lookup', () => {
      expect(repo.getStickerCount(' fwc ', 1)).toBe(1)
      expect(repo.getStickerCount('mex', 18)).toBe(1)
      expect(repo.getStickerCount('mex', 20)).toBe(2)
    })
    test('throws when country code does not exist', () => {
      expect(() => repo.getStickerCount('ARG', 1)).
        toThrow('Country code "ARG" was not found in the COUNTRIES named range.')
    })
  })

  /** Test getTradePreferences() method */
  describe('getTradePreferences()', () => {
    test('returns normalized unique preferences preserving first-seen order', () => {
      repo.tradePreferencesRange = { getDisplayValues: jest.fn(() => [['POR,15'], [' por 15 '], ['FWC'], ['  mex, 1  ']]) }
      expect(repo.getTradePreferences()).toEqual(['POR15', 'FWC', 'MEX1'])
    })
    test('removes empty values and deduplicates', () => {
      repo.tradePreferencesRange = { getDisplayValues: jest.fn(() => [[''], ['   '], ['MEX,1'], ['mex1'], ['FWC'], ['FWC']]) }
      expect(repo.getTradePreferences()).toEqual(['MEX1', 'FWC'])
    })
    test('supports multi-column ranges', () => {
      repo.tradePreferencesRange = { getDisplayValues: jest.fn(() => [['POR,15', ' FWC '], [' MEX 1 ', '']]) }
      expect(repo.getTradePreferences()).toEqual(['POR15', 'FWC', 'MEX1'])
    })
    test('returns empty array when range is null', () => {
      repo.tradePreferencesRange = null
      repo.getTradePreferencesRange = jest.fn(() => null)
      expect(repo.getTradePreferences()).toEqual([])
    })
    test('returns empty array when range has empty content', () => {
      repo.tradePreferencesRange = { getDisplayValues: jest.fn(() => [[''], ['  '], [' ,  ']]) }
      expect(repo.getTradePreferences()).toEqual([])
    })
    test('caches normalized result and reads range once', () => {
      const getDisplayValues = jest.fn(() => [['POR,15'], ['FWC']])
      repo.tradePreferencesRange = { getDisplayValues }
      const first = repo.getTradePreferences()
      const second = repo.getTradePreferences()
      expect(first).toBe(second)
      expect(getDisplayValues).toHaveBeenCalledTimes(1)
    })
  })

  /** Test updateStickerCounts() method */
  describe('updateStickerCounts()', () => {
    let countsRange
    beforeEach(() => {
      repo.countryCodes = new Set(['FWC', 'MEX', 'CC'])
      repo.countryIndexByCode = new Map([['FWC', 0], ['MEX', 1], ['CC', 2]])
      countsRange = {
        getValues: jest.fn(() => [Array(21).fill(''), Array(21).fill(''), Array(21).fill('')]),
        setValues: jest.fn()
      }
      repo.getCountsRange = jest.fn(() => countsRange)
    })
    test('update mode: groups updates and applies once per country', () => {
      repo._applyCountUpdates = jest.fn()
      repo.updateStickerCounts({ countries: [{ code: 'FWC', counts: new Map([[1, 2], [5, 4]]) }, { code: 'MEX', counts: new Map([[3, 1]]) }] })
      expect(repo._applyCountUpdates).toHaveBeenCalledTimes(2)
      expect(repo._applyCountUpdates).toHaveBeenNthCalledWith(1, { code: 'FWC', counts: new Map([[1, 2], [5, 4]]) }, expect.any(Array), false)
      expect(repo._applyCountUpdates).toHaveBeenNthCalledWith(2, { code: 'MEX', counts: new Map([[3, 1]]) }, expect.any(Array), false)
      expect(countsRange.setValues).toHaveBeenCalledTimes(1)
    })
    test('update mode: writes all updated rows in a single setValues call', () => {
      repo._applyCountUpdates = jest.fn((country, row) => {
        country.counts.forEach((c, s) => { row[s] = c })
      })
      repo.updateStickerCounts({
        countries: [
          { code: 'FWC', counts: new Map([[1, 2]]) },
          { code: 'MEX', counts: new Map([[3, 1]]) }
        ]
      })
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[0][1]).toBe(2)
      expect(values[1][3]).toBe(1)
      expect(countsRange.setValues).toHaveBeenCalledTimes(1)
    })
    test('update mode: stores zero as empty cell when reducing MEX sticker 20 to zero', () => {
      countsRange.getValues.mockReturnValue([
        Array(21).fill(''),
        (() => {
          const row = Array(21).fill('')
          row[17] = 1
          row[20] = 2
          return row
        })()
      ])
      repo.updateStickerCounts({ countries: [{ code: 'MEX', counts: new Map([[20, 0]]) }] })
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[1][17]).toBe(1)
      expect(values[1][20]).toBe('')
    })
    test('update mode: stores 0 for invalid FWC sticker 20', () => {
      repo.updateStickerCounts({ countries: [{ code: 'FWC', counts: new Map([[20, 0]]) }] })
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[0][20]).toBe(0)
    })
    test('update mode: stores 0 for invalid CC sticker 13', () => {
      repo.updateStickerCounts({ countries: [{ code: 'CC', counts: new Map([[13, 0]]) }] })
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[2][13]).toBe(0)
    })
    test('update mode: stores 0 for invalid CC sticker 13 with positive count', () => {
      repo.updateStickerCounts({ countries: [{ code: 'CC', counts: new Map([[13, 1]]) }] })
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[2][13]).toBe(0)
    })
    test('update mode: stores 0 for invalid MEX sticker 0', () => {
      repo.updateStickerCounts({ countries: [{ code: 'MEX', counts: new Map([[0, 0]]) }] })
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[1][0]).toBe(0)
    })
    test('update mode: does nothing for empty updates', () => {
      repo._applyCountUpdates = jest.fn()
      repo.updateStickerCounts({ countries: [] })
      expect(repo._applyCountUpdates).not.toHaveBeenCalled()
      expect(countsRange.setValues).not.toHaveBeenCalled()
    })
    test('update mode: processes countries in first-seen order', () => {
      repo._applyCountUpdates = jest.fn()
      repo.updateStickerCounts({
        countries: [
          { code: 'MEX', counts: new Map([[1, 1]]) },
          { code: 'FWC', counts: new Map([[1, 1]]) }
        ]
      })
      expect(repo._applyCountUpdates.mock.calls.map(call => call[0].code)).toEqual(['MEX', 'FWC'])
    })
    test('update mode: reads and writes the COUNTS range only once', () => {
      countsRange.getValues = jest.fn(() => [Array(21).fill(''), Array(21).fill(''), Array(21).fill('')])
      countsRange.setValues = jest.fn()
      repo.updateStickerCounts({
        countries: [
          { code: 'FWC', counts: new Map([[1, 2], [5, 4]]) },
          { code: 'MEX', counts: new Map([[3, 1]]) }
        ]
      })
      expect(countsRange.getValues).toHaveBeenCalledTimes(1)
      expect(countsRange.setValues).toHaveBeenCalledTimes(1)
    })
    test('replace_countries mode: clears existing values before applying imported countries', () => {
      countsRange.getValues.mockReturnValue([
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [11, 12, 13, 14, 15]
      ])
      repo._applyCountUpdates = jest.fn((country, row) => {
        row[1] = country.counts.get(1)
      })
      repo.updateStickerCounts({ countries: [{ code: 'FWC', counts: new Map([[1, 99]]) }] }, 'replace_countries')
      const values = countsRange.setValues.mock.calls[0][0]
      expect(values[0][0]).toBe('')
      expect(values[0][1]).toBe(99)
      expect(values[0][2]).toBe('')
      expect(values[1]).toEqual([6, 7, 8, 9, 10])
      expect(values[2]).toEqual([11, 12, 13, 14, 15])
    })
    test('clean_all mode: clears all and restores invalid positions and update counts for one country', () => {
      repo.updateStickerCounts({ countries: [{ code: 'FWC', counts: new Map([[1, 2]]) }] }, 'clean_all')
      const written = countsRange.setValues.mock.calls[0][0]
      expect(countsRange.setValues).toHaveBeenCalledTimes(1)
      const fwcRow = written[0]
      checkStickers(fwcRow, [1], [20])
      expect(fwcRow[1]).toBe(2)
      const mexRow = written[1]
      checkStickers(mexRow, [], [0])
    })
    test('clean_all mode: clears all and restores invalid positions and update counts for two countries', () => {
      const countries = [{ code: 'FWC', counts: new Map([[1, 1]]) }, { code: 'MEX', counts: new Map([[2, 1]]) }]
      repo.updateStickerCounts({ countries }, 'clean_all')
      const written = countsRange.setValues.mock.calls[0][0]
      expect(countsRange.setValues).toHaveBeenCalledTimes(1)
      const fwcRow = written[0]
      checkStickers(fwcRow, [1], [20])
      expect(fwcRow[1]).toBe(1)
      const mexRow = written[1]
      checkStickers(mexRow, [2], [0])
      expect(mexRow[2]).toBe(1)
    })
  })

  /** Test getCountries() method */
  describe('getCountries()', () => {
    test('returns full country dataset from kernel', () => {
      const countries = repo.getCountries()
      expect(countries).toHaveLength(3)
      expect(countries[0]).toMatchObject({
        code: 'FWC',
        name: 'World Cup',
        group: 'A',
        flag: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_FIFA.svg'
      })
      expect(countries[0].counts.get(1)).toBe(1)
      expect(countries[0].counts.get(3)).toBe(2)
    })
    test('preserves sheet order', () => {
      const res = repo.getCountries()
      expect(res[0].code).toBe('FWC')
    })
    test('handles missing optional metadata safely', () => {
      repo.countryCodeRange = { getValues: () => [['FWC'], ['CC']] }
      repo.groupsRange = { getValues: () => [['A']] }
      repo.flagsUrlRange = { getDisplayValues: () => [['flag']] }
      repo.countryNamesRange = { getDisplayValues: () => [['World Cup'], ['Club Cup']] }
      const res = repo.getCountries()
      expect(res[0].group).toBe('A')
      expect(res[1].group).toBe('')
      expect(res[1].flag).toBe('')
    })
    test('normalizes country fields (trim + uppercase)', () => {
      repo.countryCodeRange = { getValues: () => [[' arg ']] }
      repo.groupsRange = { getValues: () => [[' b ']] }
      repo.flagsUrlRange = { getDisplayValues: () => [[' flag ']] }
      repo.countryNamesRange = { getDisplayValues: () => [[' Argentina ']] }
      repo.countsRange = { getValues: () => [[1]] }

      const res = repo.getCountries()[0]
      expect(res.code).toBe('ARG')
      expect(res.group).toBe('B')
      expect(res.flag).toBe('flag')
      expect(res.name).toBe('Argentina')
    })
    test('normalizes invalid counts to zero', () => {
      repo.countsRange = { getValues: () => [['', null, 'abc', -1, 2], Array(5).fill('')] }
      const res = repo.getCountries()[0].counts
      expect(res).toEqual(new Map([[0, 0], [1, 0], [2, 0], [3, 0], [4, 2]]))
    })
    test('returns empty array when no valid countries exist', () => {
      repo.countryCodeRange = { getValues: () => [['']] }
      const res = repo.getCountries()
      expect(res).toEqual([])
    })
    test('filters out rows with empty country codes', () => {
      repo.countryCodeRange = { getValues: () => [['FWC'], [''], ['   '], ['MEX']] }
      const res = repo.getCountries()
      expect(res.map(c => c.code)).toEqual(['FWC', 'MEX'])
    })
    test('keeps data aligned across all named ranges', () => {
      repo.countryCodeRange = { getValues: () => [['FWC'], ['MEX']] }
      repo.groupsRange = { getValues: () => [['A'], ['B']] }
      repo.flagsUrlRange = { getDisplayValues: () => [['f1'], ['f2']] }
      repo.countryNamesRange = { getDisplayValues: () => [['WC'], ['MX']] }
      repo.countsRange = { getValues: () => [[1], [2]] }
      const res = repo.getCountries()
      expect(res[0]).toMatchObject({ code: 'FWC', group: 'A', name: 'WC' })
      expect(res[1]).toMatchObject({ code: 'MEX', group: 'B', name: 'MX' })
    })
    test('keeps valid numeric counts unchanged', () => {
      repo.countsRange = { getValues: () => [[0, 1, 2, 20]] }
      const res = repo.getCountries()[0].counts
      expect(res).toEqual(new Map([[0, 0], [1, 1], [2, 2], [3, 20]]))
    })
    test('handles missing optional metadata gracefully', () => {
      repo.groupsRange = { getValues: () => [[]] }
      repo.flagsUrlRange = { getDisplayValues: () => [[]] }
      repo.countryNamesRange = { getDisplayValues: () => [[]] }
      repo.countryCodeRange = { getValues: () => [['FWC']] }
      repo.countsRange = { getValues: () => [[1]] }
      const res = repo.getCountries()[0]
      expect(res.group).toBe('')
      expect(res.flag).toBe('')
      expect(res.name).toBe('')
    })
    test('handles missing counts row safely', () => {
      repo.countryCodeRange = { getValues: () => [['FWC'], ['MEX']] }
      repo.groupsRange = { getValues: () => [['A'], ['B']] }
      repo.flagsUrlRange = { getDisplayValues: () => [['f1'], ['f2']] }
      repo.countryNamesRange = { getDisplayValues: () => [['WC'], ['MX']] }
      repo.countsRange = { getValues: () => [[1, 2, 3]] } // ❌ only 1 row
      const res = repo.getCountries()
      expect(res[1].counts).toEqual(new Map())
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
      repo.countryCodeRange = { getValues: () => [['FWC'], [''], ['   '], ['MEX']] }
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

    describe('onlyVisible=true', () => {
      test('narrows counts to each country type\'s visible bounds', () => {
        const [fwc, mex, cc] = repo.getCountries({ onlyVisible: true })
        expect(Array.from(fwc.counts.keys())).toEqual(Array.from({ length: 20 }, (_, i) => i)) // 0-19
        expect(Array.from(mex.counts.keys())).toEqual(Array.from({ length: 20 }, (_, i) => i + 1)) // 1-20
        expect(Array.from(cc.counts.keys())).toEqual(Array.from({ length: 12 }, (_, i) => i + 1)) // 1-12
      })
      test('preserves count values within the visible range', () => {
        const [fwc] = repo.getCountries({ onlyVisible: true })
        expect(fwc.counts.get(1)).toBe(1)
        expect(fwc.counts.get(3)).toBe(2)
      })
      test('preserves non-counts fields unchanged', () => {
        const [fwc] = repo.getCountries({ onlyVisible: true })
        expect(fwc).toMatchObject({ code: 'FWC', name: 'World Cup', group: 'A' })
      })
      test('does not affect the default (dense) result', () => {
        const dense = repo.getCountries()
        expect(Array.from(dense[0].counts.keys())).toHaveLength(21) // untouched, still 0-20
      })
      test('caches the visible variant separately from the dense one', () => {
        const first = repo.getCountries({ onlyVisible: true })
        const second = repo.getCountries({ onlyVisible: true })
        expect(first).toBe(second)
      })
      test('dense and visible calls in the same execution do not corrupt each other, in either order', () => {
        const dense1 = repo.getCountries()
        const visible1 = repo.getCountries({ onlyVisible: true })
        const dense2 = repo.getCountries()
        const visible2 = repo.getCountries({ onlyVisible: true })
        expect(Array.from(dense1[0].counts.keys())).toHaveLength(21)
        expect(Array.from(visible1[0].counts.keys())).toHaveLength(20)
        expect(dense2).toBe(dense1)
        expect(visible2).toBe(visible1)
      })
    })

    describe('includeIcon/includeDone/includeName/includeGroup/includeFlag', () => {
      test('includeIcon=true adds the icon field, zipped by row position', () => {
        const [fwc, mex] = repo.getCountries({ includeIcon: true })
        expect(fwc.icon).toBe('🏆')
        expect(mex.icon).toBe('🇲🇽')
      })
      test('includeDone=true adds the done field, zipped by row position', () => {
        const [fwc, mex] = repo.getCountries({ includeDone: true })
        expect(typeof fwc.done).toBe('number')
        expect(typeof mex.done).toBe('number')
      })
      test('includeIcon/includeDone default to false (absent from the default record)', () => {
        const [fwc] = repo.getCountries()
        expect(fwc).not.toHaveProperty('icon')
        expect(fwc).not.toHaveProperty('done')
      })
      test('includeName/includeGroup/includeFlag=false excludes those fields', () => {
        const [fwc] = repo.getCountries({ includeName: false, includeGroup: false, includeFlag: false })
        expect(fwc).not.toHaveProperty('name')
        expect(fwc).not.toHaveProperty('group')
        expect(fwc).not.toHaveProperty('flag')
        expect(fwc).toMatchObject({ code: 'FWC' })
        expect(fwc.counts).toBeInstanceOf(Map)
      })
      test('a non-default shape is not cached (fresh array each call)', () => {
        const first = repo.getCountries({ includeIcon: true })
        const second = repo.getCountries({ includeIcon: true })
        expect(first).not.toBe(second)
        expect(first).toEqual(second)
      })
      test('combines onlyVisible with includeIcon/includeDone', () => {
        const [fwc] = repo.getCountries({ onlyVisible: true, includeIcon: true, includeDone: true })
        expect(Array.from(fwc.counts.keys())).toHaveLength(20)
        expect(fwc).toHaveProperty('icon')
        expect(fwc).toHaveProperty('done')
      })
    })
  })
})
