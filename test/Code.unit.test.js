// test/Code.unit.test.js

/**
 * Unit tests for Code.gs.
 *
 * Focus:
 * - _withWriteLock() - the LockService guard around COUNTS write entry points (PL-05)
 *
 * Code.gs's actual entry points (importStickerData, applyQuickEntryUpdates, executeTrade, etc.) are thin
 * wrappers with no independent logic of their own - they resolve a spreadsheet, construct a service, and
 * delegate. _withWriteLock() is the one piece of real, independently testable logic in this file today.
 *
 * All Google Apps Script dependencies are mocked via: initTestKernel in test/utils/testKernel.js.
 */

const { initTestKernel } = require('./utils/testKernel.js')
const { _withWriteLock } = require('../build/Code.js')

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
})
