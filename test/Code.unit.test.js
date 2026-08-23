// test/Code.unit.test.js

/**
 * Unit tests for Code.gs.
 *
 * Focus:
 * - _withWriteLock() - the LockService guard around COUNTS write entry points
 * - _getSpreadsheet() - the active-spreadsheet/mobile-fallback resolution used by every shared entry point
 * - _getMobileSpreadsheet() - the ID-based lookup _getSpreadsheet() falls back to, and doGet()'s own path
 *
 * All three are private (underscore-prefixed) functions tested directly, as an intentional exception to this
 * project's usual private/public test convention: Code.gs's actual entry points (importStickerData,
 * applyQuickEntryUpdates, executeTrade, doGet, etc.) are thin wrappers with no independent logic of their own,
 * and none of them are exported/tested - so there is no tested public caller to route a test through. These
 * three are the real, independently testable logic in this file today.
 *
 * All Google Apps Script dependencies are mocked via: initTestKernel in test/utils/testKernel.js.
 */

const { initTestKernel } = require('./utils/testKernel.js')
const { _withWriteLock, _getSpreadsheet, _getMobileSpreadsheet } = require('../build/Code.js')

describe('Code.gs (unit)', () => {
  beforeEach(() => {
    initTestKernel()
  })

  /** _withWriteLock(fn) */
  describe('_withWriteLock()', () => {
    test('acquires the script lock, runs fn(), and returns its result', () => {
      const fn = jest.fn(() => 'result')
      const result = _withWriteLock(fn)
      expect(global.LockService.getScriptLock).toHaveBeenCalledTimes(1)
      expect(global.__lockMock.tryLock).toHaveBeenCalledWith(10000)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(result).toBe('result')
    })
    test('releases the lock after fn() succeeds', () => {
      _withWriteLock(() => 'result')
      expect(global.__lockMock.releaseLock).toHaveBeenCalledTimes(1)
    })
    test('releases the lock even when fn() throws, and re-throws the original error', () => {
      const boom = new Error('write failed')
      expect(() => _withWriteLock(() => { throw boom })).toThrow(boom)
      expect(global.__lockMock.releaseLock).toHaveBeenCalledTimes(1)
    })
    test('throws a clear error and never calls fn() when the lock cannot be acquired', () => {
      global.__lockMock.tryLock.mockReturnValueOnce(false)
      const fn = jest.fn()
      expect(() => _withWriteLock(fn)).
        toThrow('Another update is in progress on this spreadsheet. Please try again in a moment.')
      expect(fn).not.toHaveBeenCalled()
    })
    test('does not release a lock it never acquired', () => {
      global.__lockMock.tryLock.mockReturnValueOnce(false)
      expect(() => _withWriteLock(() => 'result')).toThrow()
      expect(global.__lockMock.releaseLock).not.toHaveBeenCalled()
    })
  })

  /** _getMobileSpreadsheet() */
  describe('_getMobileSpreadsheet()', () => {
    test('returns null when SPREADSHEET_ID has not been seeded yet', () => {
      expect(_getMobileSpreadsheet()).toBeNull()
      expect(global.SpreadsheetApp.openById).not.toHaveBeenCalled()
    })
    test('opens and returns the spreadsheet by its saved SPREADSHEET_ID', () => {
      global.__scriptProperties.setProperty('SPREADSHEET_ID', 'abc123')
      const result = _getMobileSpreadsheet()
      expect(global.SpreadsheetApp.openById).toHaveBeenCalledWith('abc123')
      expect(result).toBe(global.SpreadsheetApp.getActiveSpreadsheet())
    })
    test('logs and re-throws the original error when openById() fails, instead of swallowing it', () => {
      global.__scriptProperties.setProperty('SPREADSHEET_ID', 'abc123')
      const boom = new Error('boom')
      global.SpreadsheetApp.openById.mockImplementationOnce(() => { throw boom })
      expect(() => _getMobileSpreadsheet()).toThrow(boom)
      expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('OPEN by ID FAILED'))
    })
  })

  /** _getSpreadsheet() */
  describe('_getSpreadsheet()', () => {
    test('returns the active spreadsheet when getActiveSpreadsheet() succeeds', () => {
      expect(_getSpreadsheet()).toBe(global.SpreadsheetApp.getActiveSpreadsheet())
      expect(global.SpreadsheetApp.openById).not.toHaveBeenCalled()
    })
    test('falls back to the mobile spreadsheet lookup when getActiveSpreadsheet() throws', () => {
      global.SpreadsheetApp.getActiveSpreadsheet.mockImplementationOnce(() => {
        throw new Error('getActiveSpreadsheet() is not available when running as a web app')
      })
      global.__scriptProperties.setProperty('SPREADSHEET_ID', 'abc123')
      const result = _getSpreadsheet()
      expect(global.SpreadsheetApp.openById).toHaveBeenCalledWith('abc123')
      expect(result).toBe(global.SpreadsheetApp.getActiveSpreadsheet())
    })
    test('falls back to the mobile spreadsheet lookup when getActiveSpreadsheet() returns a falsy value', () => {
      global.SpreadsheetApp.getActiveSpreadsheet.mockReturnValueOnce(null)
      global.__scriptProperties.setProperty('SPREADSHEET_ID', 'abc123')
      const result = _getSpreadsheet()
      expect(global.SpreadsheetApp.openById).toHaveBeenCalledWith('abc123')
      expect(result).toBe(global.SpreadsheetApp.getActiveSpreadsheet())
    })
    test('returns null when neither the active spreadsheet nor the mobile lookup can resolve one', () => {
      global.SpreadsheetApp.getActiveSpreadsheet.mockReturnValueOnce(null)
      expect(_getSpreadsheet()).toBeNull()
    })
  })
})
