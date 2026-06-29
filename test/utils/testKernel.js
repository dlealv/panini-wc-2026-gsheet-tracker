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

/** Shared deterministic dataset. */
const TEST_DATA = {
  countries: [
    { code: 'FWC', countryName: 'World Cup', group: 'A', flag: '🏆', counts: { 1: 1, 2: 0, 3: 2 } },
    { code: 'MEX', countryName: 'Mexico', group: 'B', flag: '🇲🇽', counts: { 17: 1, 18: 0, 20: 2 } }
  ],
  groupCodes: ['A', 'B', 'C']
}

/** Mock repository used across services */
class MockStickerSheetRepository {
  constructor() {
    this.ss = global.SpreadsheetApp.getActiveSpreadsheet()
    this.sheet = this.ss.getRangeByName('COUNTS').getSheet()

    this.countriesRange = this.ss.getRangeByName('COUNTRIES')
    this.countsRange = this.ss.getRangeByName('COUNTS')
    this.groupsRange = this.ss.getRangeByName('GROUPS')
    this.doneRange = this.ss.getRangeByName('DONE')
    this.flagsUrlRange = this.ss.getRangeByName('FLAGS_URL')
    this.flagIconsRange = this.ss.getRangeByName('FLAG_ICONS')
    this.countryNamesRange = this.ss.getRangeByName('COUNTRY_NAMES')

    this.startCol = 1
    this.numStickerCols = 21
    this.STICKER_MIN = 0
    this.STICKER_MAX = 20
    this.EXPECTED_STICKER_COLUMNS = this.STICKER_MAX - this.STICKER_MIN + 1

    const baseCountries = TEST_DATA.countries

    this.countryMap =
      Object.fromEntries(
        baseCountries.map((c, index) => [
          c.code.toUpperCase(),
          { row: 1 + index, index }
        ])
      )
  }

  getCountriesRange() { return this.countriesRange }
  getCountsRange() { return this.countsRange }
  getDoneRange() { return this.doneRange }
  getFlagIconsRange() { return this.flagIconsRange }
  getFlagsUrlRange() { return this.flagsUrlRange }
  getCountryNamesRange() { return this.countryNamesRange }
  getCountries() { return TEST_DATA.countries }
  getCountryMap() { return this.countryMap }
  getGroupCodes() { return TEST_DATA.groupCodes }
  getSheet() { return this.sheet }
  getStartCol() { return this.startCol }
  getNumRows() { return this.numRows }
  getNumStickerCols() { return this.numStickerCols }
  updateStickerCounts(updates) { // extending it to record the last updates for testing purposes
    this.lastUpdates = updates
    return true
  }
}

/** Initializes full test environment */
function initTestKernel() {
  jest.resetModules()
  initializeSpreadsheetAppMock()

  global.StickerSheetRepository = MockStickerSheetRepository
  global.__writeRangeMock = writeRangeMock
}

/** Initializes a mock for the SpreadsheetApp environment. */
function initializeSpreadsheetAppMock() {
  const MAX_ROWS = 49
  const fwcCounts = Array(21).fill(''); fwcCounts[1] = 1; fwcCounts[3] = 2
  const mexCounts = Array(21).fill('')
  const countriesValues = [['FWC'], ['MEX'], ...Array.from({ length: MAX_ROWS - 2 }, () => [''])]
  const countsValues = [fwcCounts,
    mexCounts, ...Array.from({ length: MAX_ROWS - 2 }, () => Array(21).fill(''))]

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
    getNumColumns: jest.fn(() => 21),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 2),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn()
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
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
  const spreadsheetMock = {
    getRangeByName: (name) => {
      if (name === 'COUNTRIES') return countriesRange
      if (name === 'COUNTS') return countsRange
      if (name === 'GROUPS') return groupsRange
      if (name === 'FLAGS_URL') return flagsUrlRange
      if (name === 'COUNTRY_NAMES') return countryNamesRange
      if (name === 'FLAG_ICONS') return flagIconsRange
      if (name === 'DONE') return doneRange
      throw new Error(`Unknown range ${name}`)
    }
  }
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
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
}

module.exports = {
  initTestKernel
}
