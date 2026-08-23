// test/util/testKernel.js

/**
 * Global test kernel for GAS unit tests.
 *
 * Responsibilities:
 * - mocks Google Apps Script environment
 * - provides deterministic shared dataset
 * - injects global service dependencies
 * - ensures services from Import or Export services run without SpreadsheetApp
 */

/** Mock for the write range, which is used to update counts in the sheet. */
const writeRangeMock = {
  getValues: jest.fn(() => [Array(21).fill(0)]),
  setValues: jest.fn(),
  clearContent: jest.fn()
}

/**
 * Shared deterministic dataset.
 * Notes:
 * - Don't change the values in this dataset, as it is used across multiple unit tests and services.
 * - If you want to test a different data, then add another country
 * - I think you can add values for CC, since empty counts haven't been tested.
*/
const TEST_DATA = {
  countries: [
    { code: 'FWC', name: 'World Cup', group: 'A', flag: '🏆', counts: { 1: 1, 3: 2 } },
    { code: 'MEX', name: 'Mexico', group: 'B', flag: '🇲🇽', counts: { 18: 1, 20: 2 } },
    { code: 'CC', name: 'Coca-Cola', group: '', flag: '🥤', counts: {} }
  ],
  groupCodes: ['A', 'B', 'C']
}

/** Initializes the mocked spreadsheet with optional test-specific country records. */
function initTestKernel(options = {}) {
  jest.resetModules()
  initializeSpreadsheetAppMock(options.countries || TEST_DATA.countries)
  const { StickerSheetRepository } = require('../../build/Commons.js')
  global.StickerSheetRepository = StickerSheetRepository
  global.__writeRangeMock = writeRangeMock
}

/** Initializes a mock for the SpreadsheetApp environment. */
function initializeSpreadsheetAppMock(countries = TEST_DATA.countries) {
  const MAX_ROWS = 50
  const STICKER_COLS = 21
  const buildCountsRow = country => {
    const row = Array(STICKER_COLS).fill('')
    Object.entries(country.counts || {}).forEach(([sticker, count]) => {
      row[Number(sticker)] = count
    })
    return row
  }
  const countriesValues = [
    ...countries.map(country => [country.code]),
    ...Array.from({ length: MAX_ROWS - countries.length }, () => [''])
  ]
  const countsValues = [
    ...countries.map(buildCountsRow),
    ...Array.from(
      { length: MAX_ROWS - countries.length }, () => Array(STICKER_COLS).fill('')
    )
  ]

  const getRangeMock = jest.fn((row, col, numRows, numCols) => {
    if (row == null || col == null || numRows == null || numCols == null) {
      throw new Error('Invalid getRange arguments')
    }
    return writeRangeMock
  })

  const countriesRange = createNamedRangeMock(countriesValues)
  const countsRange = {
    getValues: jest.fn(() => countsValues),
    getNumRows: jest.fn(() => countsValues.length),
    getNumColumns: jest.fn(() => STICKER_COLS),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 2),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn(() => {
      countsValues.forEach(row => row.fill(''))
    }),
    setValues: jest.fn(values => {
      values.forEach((row, index) => {
        countsValues[index] = row
      })
    })
  }
  const groupsRange = createNamedRangeMock([['A'], ['B'], ...Array.from({ length: MAX_ROWS - 2 }, () => [''])])
  const flagsUrlRange = createNamedRangeMock([
    ['https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_FIFA.svg'],
    ['https://flagcdn.com/w160/mx.png'],
    ...Array.from({ length: MAX_ROWS - 2 }, () => [''])
  ])
  const countryNamesRange = createNamedRangeMock([
    ['World Cup'], ['Mexico'],
    ...Array.from({ length: MAX_ROWS - 2 }, () => [''])
  ])
  const sheetMock = { getRange: getRangeMock }
  const flagIconValues = [['🏆'], ['🇲🇽'], ...Array.from({ length: MAX_ROWS - 2 }, () => [''])]
  const flagIconsRange = {
    getValues: jest.fn(() => flagIconValues),
    getDisplayValues: jest.fn(() => flagIconValues),
    getNumRows: jest.fn(() => flagIconValues.length),
    getNumColumns: jest.fn(() => 1),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 1),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn()
  }
  const doneRange = {
    getValues: jest.fn(() => buildDoneFromCounts(countsRange.getValues())),
    getNumRows: jest.fn(() => countsRange.getValues().length),
    getNumColumns: jest.fn(() => 1),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 1),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn()
  }
  const tradePreferencesRange = createNamedRangeMock([['MEX'], ['1'], ['13'], ['POR11']])
  const spreadsheetMock = {
    getRangeByName: (name) => {
      if (name === 'COUNTRIES') return countriesRange
      if (name === 'COUNTS') return countsRange
      if (name === 'GROUPS') return groupsRange
      if (name === 'FLAGS_URL') return flagsUrlRange
      if (name === 'COUNTRY_NAMES') return countryNamesRange
      if (name === 'FLAG_ICONS') return flagIconsRange
      if (name === 'DONE') return doneRange
      if (name === 'TRADE_PREFERENCES') return tradePreferencesRange
      throw new Error(`Unknown range ${name}`)
    }
  }
  global.SpreadsheetApp = {
    getActiveSpreadsheet: () => spreadsheetMock
  }

  /** Computes the done from an array of count values. */
  const buildDoneFromCounts = (countsValues) => {
    return countsValues.map(row => {
      let done = 0
      for (let i = 0; i < row.length; i++) {
        const v = Number(row[i])
        if (!Number.isNaN(v) && (v >= 1)) done++
      }
      return [done]
    })
  }

  /** SpreadsheetApp mock (GAS runtime) */
  function createNamedRangeMock(values = [['FWC'], ['MEX']]) {
    const normalized = values.map(v => (Array.isArray(v) ? v : [v]))
    return {
      getValues: jest.fn(() => normalized),
      getDisplayValues: jest.fn(() => normalized),
      getNumRows: jest.fn(() => normalized.length),
      getNumColumns: jest.fn(() => 1),
      getRow: jest.fn(() => 1),
      getColumn: jest.fn(() => 1),
      getSheet: jest.fn(() => sheetMock),
      clearContent: jest.fn()
    }
  }

  global.Logger = { log: jest.fn() }
  global.__countsRange = countsRange
  global.__getRangeMock = getRangeMock

  /**
   Mock for LockService, used by Code.gs's _withWriteLock() to guard concurrent writes to COUNTS.
  Defaults to always acquiring the lock immediately, since most tests aren't exercising contention itself;
  individual tests can override global.LockService.getScriptLock to simulate a held/unavailable lock.
  */
  const lockMock = {
    tryLock: jest.fn(() => true),
    releaseLock: jest.fn()
  }
  global.LockService = {
    getScriptLock: jest.fn(() => lockMock)
  }
  global.__lockMock = lockMock
}

module.exports = {
  initTestKernel,
  TEST_DATA
}
