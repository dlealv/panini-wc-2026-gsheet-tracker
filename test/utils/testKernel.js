// test/util/testKernel.js

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

/** SpreadsheetApp mock (GAS runtime) */
function initializeSpreadsheetAppMock () {
  global.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: () => ({
        getRange: () => ({
          getValues: () => [[0]],
          setValues: jest.fn()
        })
      })
    })
  }
  global.Logger = {
    log: jest.fn()
  }
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

/** Mock ImportExportService dependency (minimal deterministic behavior for unit tests) */
class MockImportExportService {
  import (input) {
    if (!input || input.trim() === '') {
      throw new Error('Empty input')
    }
    const [rawCountry, ...values] = input.split(',')
    const country = rawCountry. // remove emojis
      replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').
      replace(/^[^\w]*\s*/, '').
      trim()
    if (!/^[A-Z]{3}$/.test(country)) {
      throw new Error('Invalid country code')
    }
    for (const v of values) {
      const cleaned = String(v).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
      if (cleaned === '') continue
      const n = parseInt(cleaned, 10)
      if (isNaN(n)) {
        throw new Error(`Invalid sticker: ${cleaned}`)
      }
      if (n < 0 || n > 24) {
        throw new Error(`Out of bounds sticker: ${n}`)
      }
    }
    return { success: true, message: 'Imported OK' }
  }

  exportData (flagMode = false, opts = {}) {
    if (opts.includeFlags === true) {
      return { success: true, text: 'FLAG_EXPORT', lines: 3 }
    }
    const icon = opts.icon || '🏆'
    const code = opts.code || 'FWC'

    let stickers = opts.stickers
    if (!Array.isArray(stickers)) {
      if (typeof opts.mockText === 'string') {
        const parts = opts.mockText.split(',')
        stickers = parts.slice(1)
      } else {
        stickers = []
      }
    }

    const formatWithIcons = !!opts.formatWithIcons
    const normalize = arr => (arr || []).filter(v => {
      if (code === 'FWC') return true
      return v !== 0 && v !== '0'
    })
    if (formatWithIcons) {
      const list = normalize(stickers)
      return {
        success: true,
        text: `${icon} ${code}${list.length ? ',' + list.join(',') : ''}`,
        lines: 3
      }
    }
    const list = normalize(stickers)
    return {
      success: true,
      text: flagMode ? 'FLAG_EXPORT' : `${code}${list.length ? ',' + list.join(',') : ''}`,
      lines: 3
    }
  }
}

/** Initializes full test environment */
function initTestKernel () {
  jest.resetModules()
  initializeSpreadsheetAppMock()
  // reset shared global state for UI-layer tests
  global.state = {}
  global.StickerSheetRepository = MockStickerSheetRepository
  global.ImportExportService = MockImportExportService
}

module.exports = {
  initTestKernel,
  TEST_DATA
}
