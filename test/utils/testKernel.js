// test/util/testKernel.js

const { ImportExportService, InputLineNormalize, StickerInputParser } = require('../../build/ImportExportService.js')

/**
 * Global test kernel for GAS unit tests.
 *
 * Responsibilities:
 * - mocks Google Apps Script environment
 * - provides deterministic shared dataset
 * - resets Jest module cache
 * - injects global service dependencies
 * - ensures all services run without SpreadsheetApp
 */

let countriesRange
let countsRange
let flagIconsRange

/** Mock for a range object, providing getValues, setValues, and clearContent methods. */

/** Mock for the write range, which is used to update counts in the sheet. */
const writeRangeMock = {
  getValues: jest.fn(() => [Array(21).fill(0)]),
  setValues: jest.fn(),
  clearContent: jest.fn()
}

/** Mock for the sheet, providing getRange method to return the write range mock. */
const sheetMock = {
  getRange: jest.fn(() => writeRangeMock)
}

/** Shared deterministic dataset used across ALL tests */
const TEST_DATA = {
  countries: [
    {
      code: 'FWC',
      countryName: 'World Cup',
      group: 'A',
      flag: '🏆',
      counts: { 1: 1, 2: 0, 3: 2 }
    }
  ],
  groupCodes: ['A', 'B', 'C']
}

/** Mock repository used across services */
class MockStickerSheetRepository {
  getCountries () {
    return TEST_DATA.countries
  }

  getGroupCodes () {
    return TEST_DATA.groupCodes
  }

  updateStickerCounts () {
    return true
  }
}

/** Initializes full test environment */
function initTestKernel () {
  jest.resetModules()
  initializeSpreadsheetAppMock()
  // reset shared global state for UI-layer tests
  global.state = {}
  global.StickerSheetRepository = MockStickerSheetRepository
  global.InputLineNormalize = InputLineNormalize
  global.StickerInputParser = StickerInputParser
  global.ImportExportService = ImportExportService
  global.__writeRangeMock = writeRangeMock
  global.__sheetMock = sheetMock
  global.__countsRange = countsRange
}

/** Initializes a mock for the SpreadsheetApp environment. */
function initializeSpreadsheetAppMock () {
  countriesRange = createNamedRangeMock([['FWC'], ['MEX']])
  const fwcCounts = Array(21).fill('')
  fwcCounts[1] = 1
  fwcCounts[3] = 2
  const mexCounts = Array(21).fill('')
  countsRange = {
    getValues: jest.fn(() => [fwcCounts, mexCounts]),
    getNumRows: jest.fn(() => 2),
    getNumColumns: jest.fn(() => 21),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 2),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn()
  }
  flagIconsRange = {
    getValues: jest.fn(() => [['🏆'], ['🇲🇽']]),
    getDisplayValues: jest.fn(() => [['🏆'], ['🇲🇽']]),
    getNumRows: jest.fn(() => 2),
    getNumColumns: jest.fn(() => 1),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 1),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn()
  }
  global.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getRangeByName: (name) => { if (name === 'COUNTRIES') return countriesRange; if (name === 'COUNTS') return countsRange; if (name === 'FLAG_ICONS') return flagIconsRange; throw new Error(`Unknown range ${name}`) } }) }
  global.Logger = { log: jest.fn() }
}

/** SpreadsheetApp mock (GAS runtime) */
function createNamedRangeMock (values = [['FWC'], ['MEX']]) {
  return {
    getValues: jest.fn(() => values),
    getDisplayValues: jest.fn(() => values),
    getNumRows: jest.fn(() => values.length),
    getNumColumns: jest.fn(() => 1),
    getRow: jest.fn(() => 1),
    getColumn: jest.fn(() => 1),
    getSheet: jest.fn(() => sheetMock),
    clearContent: jest.fn()
  }
}

module.exports = {
  initTestKernel,
  TEST_DATA
}
