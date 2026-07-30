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
/*
const TEST_DATA = {
  countries: [
    { code: 'FWC', countryName: 'World Cup', group: 'A', flag: '🏆', counts: { 1: 1, 2: 0, 3: 2 } },
    { code: 'MEX', countryName: 'Mexico', group: 'B', flag: '🇲🇽', counts: { 17: 1, 18: 0, 20: 2 } },
    { code: 'CC', countryName: 'Coca-Cola', group: '', flag: '🥤', counts: {} }
  ],
  groupCodes: ['A', 'B', 'C']
}
*/
const TEST_DATA = {
  countries: [
    { code: 'FWC', countryName: 'World Cup', group: 'A', flag: '🏆', counts: { 1: 1, 3: 2 } },
    { code: 'MEX', countryName: 'Mexico', group: 'B', flag: '🇲🇽', counts: { 18: 1, 20: 2 } },
    { code: 'CC', countryName: 'Coca-Cola', group: '', flag: '🥤', counts: {} }
  ],
  groupCodes: ['A', 'B', 'C']
}

/** Mock repository used across services */
class MockStickerSheetRepository {
  // instance constants for sticker number ranges and country bounds
  constructor(ss) {
    this.ss = ss || global.SpreadsheetApp.getActiveSpreadsheet()
    this.COUNTRIES_RANGE_NAME = 'COUNTRIES'
    this.COUNTS_RANGE_NAME = 'COUNTS'
    this.GROUPS_RANGE_NAME = 'GROUPS'
    this.DONE_RANGE_NAME = 'DONE'
    this.FLAGS_URL_RANGE_NAME = 'FLAGS_URL'
    this.FLAG_ICONS_RANGE_NAME = 'FLAG_ICONS'
    this.COUNTRY_NAMES_RANGE_NAME = 'COUNTRY_NAMES'

    this.startCol = 1
    this.numStickerCols = 21

    this.sheet = this.ss.getRangeByName(this.COUNTRIES_RANGE_NAME).getSheet()

    this.countriesRange = this.ss.getRangeByName(this.COUNTRIES_RANGE_NAME)
    this.countsRange = this.ss.getRangeByName(this.COUNTS_RANGE_NAME)
    this.groupsRange = this.ss.getRangeByName(this.GROUPS_RANGE_NAME)
    this.doneRange = this.ss.getRangeByName(this.DONE_RANGE_NAME)
    this.flagsUrlRange = this.ss.getRangeByName(this.FLAGS_URL_RANGE_NAME)
    this.flagIconsRange = this.ss.getRangeByName(this.FLAG_ICONS_RANGE_NAME)
    this.countryNamesRange = this.ss.getRangeByName(this.COUNTRY_NAMES_RANGE_NAME)

    const baseCountries = TEST_DATA.countries
    this.countryMap =
      Object.fromEntries(
        baseCountries.map((c, index) => [
          c.code.toUpperCase(),
          { row: 1 + index, index }
        ])
      )
  }

  // static methods
  static getCountryBounds() {
    return new Map(
      [
        ['FWC', [0, 19]],
        ['CC', [1, 12]],
        ['TEAM', [1, 20]]
      ])
  }

  static getStickerMin() { return 0 }

  static getStickerMax() { return 20 }

  static getMaxRows() { return 50 }

  static getExpectedStickerColumns() {
    return MockStickerSheetRepository.getStickerMax() -
      MockStickerSheetRepository.getStickerMin() + 1
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

  getStickerCount(countryCode, stickerNumber) {
    const country = TEST_DATA.countries.find(
      item => item.code === countryCode
    )
    if (!country) {
      throw new Error(`Country ${countryCode} not found`)
    }
    return Number(country.counts[stickerNumber] || 0)
  }

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
  const MAX_ROWS = 50
  const STICKER_COLS = 21
  const buildCountsRow = (country) => {
    const row = Array(STICKER_COLS).fill('')
    Object.entries(country.counts).forEach(([sticker, count]) => {
      row[Number(sticker)] = count
    })
    return row
  }
  const countriesValues = [
    ...TEST_DATA.countries.map(country => [country.code]),
    ...Array.from({ length: MAX_ROWS - TEST_DATA.countries.length }, () => [''])
  ]
  const countsValues = [
    ...TEST_DATA.countries.map(buildCountsRow),
    ...Array.from(
      { length: MAX_ROWS - TEST_DATA.countries.length }, () => Array(STICKER_COLS).fill('')
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
