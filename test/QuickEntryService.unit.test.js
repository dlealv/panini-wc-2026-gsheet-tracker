// test/QuickEntryService.unit.test.js

/**
 * QuickEntryService unit tests.
 *
 * Responsibilities:
 * - validates UI view model generation
 * - validates sticker status logic
 * - validates normalization behavior
 * - validates summary calculations
 * - validates pending update rules
 *
 * IMPORTANT:
 * The shared test kernel MUST initialize BEFORE loading
 * any compiled GAS build modules.
 */
/* global __countsRange */

const { initTestKernel } = require('./utils/testKernel.js')

const { QuickEntryService } = require('../build/QuickEntryService.js')

/** QuickEntryService (unit) */
describe('QuickEntryService (unit)', () => {
  /**
   * A spreadsheet double distinct from testKernel's mocked getActiveSpreadsheet() result,
   *  used to verify explicit ss forwarding rather than an accidental fallback to the active spreadsheet.
   */
  const OTHER_SS = { marker: 'explicit-ss-fixture' }
  let service

  /** Create a fresh service before each test. */
  beforeEach(() => {
    /* Initializes the test environment with mocked Google Apps Script services and global variables,
    ensuring that each test runs in a clean, isolated context without side effects from previous tests
    or reliance on actual spreadsheet data. */
    initTestKernel()
    service = new QuickEntryService()
  })

  /** constructor(ss) — unlike the other services, QuickEntryService builds its repository eagerly in the
  constructor rather than lazily via a getRepo() method, so the forwarding check reads service.repo.ss directly. */
  describe('constructor(ss)', () => {
    test('falls back to the active spreadsheet when no ss is provided', () => {
      expect(service.repo.ss).toBe(global.SpreadsheetApp.getActiveSpreadsheet())
    })
    test('forwards the constructor ss into the repository instead of falling back to the active spreadsheet', () => {
      const svc = new QuickEntryService(OTHER_SS)
      expect(svc.repo.ss).toBe(OTHER_SS)
      expect(svc.repo.ss).not.toBe(global.SpreadsheetApp.getActiveSpreadsheet())
    })
  })

  /** Tests for initial data retrieval. */
  describe('getInitialData()', () => {
    test('returns structured payload', () => {
      const result = service.getInitialData()

      expect(result).toHaveProperty('countries')
      expect(result).toHaveProperty('groupCodes')
      expect(result.selectedStatusFilter).toBe('all')
      expect(result.selectedGroupFilter).toBe('all')
    })
    test('builds full country view model shape', () => {
      const mex = service.getInitialData().countries.find(country => country.code === 'MEX')
      expect(mex.name).toBe('Mexico')
      expect(mex.group).toBe('B')
      expect(mex.flag).toBe('https://flagcdn.com/w160/mx.png')
      expect(mex.stickers[0]).toEqual({ number: 1, count: 0 })
    })
    test('computes visible sticker ranges per country type (FWC/CC/TEAM bounds)', () => {
      const countries = service.getInitialData().countries
      const byCode = code => countries.find(country => country.code === code)

      const fwc = byCode('FWC').stickers
      expect(fwc[0].number).toBe(0)
      expect(fwc[fwc.length - 1].number).toBe(19)
      expect(fwc).toHaveLength(20)

      const cc = byCode('CC').stickers
      expect(cc[0].number).toBe(1)
      expect(cc[cc.length - 1].number).toBe(12)
      expect(cc).toHaveLength(12)

      const mex = byCode('MEX').stickers
      expect(mex[0].number).toBe(1)
      expect(mex[mex.length - 1].number).toBe(20)
      expect(mex).toHaveLength(20)
    })
    test('computes summary and completion values per country', () => {
      const countries = service.getInitialData().countries
      const byCode = code => countries.find(country => country.code === code)

      // FWC counts {1:1, 3:2} over 20 visible stickers (0-19).
      expect(byCode('FWC').summary).toEqual({ owned: 2, missing: 18, repeated: 1, total: 20, completionPercent: 10 })
      expect(byCode('FWC').isCompleted).toBe(false)
      // CC has no counts at all.
      expect(byCode('CC').summary).toEqual({ owned: 0, missing: 12, repeated: 0, total: 12, completionPercent: 0 })
    })
    test('returns sparse icon labels only for team countries (never FWC/CC)', () => {
      const countries = service.getInitialData().countries
      const byCode = code => countries.find(country => country.code === code)

      expect(byCode('MEX').iconLabels).toEqual({ 1: 'CREST', 13: 'TEAM' })
      expect(byCode('FWC').iconLabels).toEqual({})
      expect(byCode('CC').iconLabels).toEqual({})
    })
  })

  /** Tests for applyPendingUpdates(). */
  describe('applyPendingUpdates()', () => {
    test('applies normalized updates and returns refreshed countries', () => {
      const result = service.applyPendingUpdates([{ code: 'mex', stickers: [{ number: 4, count: 0 }] }])
      const written = __countsRange.setValues.mock.calls[0][0]
      expect(written[1][4]).toBe('')
      expect(result).toEqual({ success: true, message: 'Updated 1 sticker value(s).', countries: expect.any(Array) })
    })
    test('normalizes country code casing and groups multiple countries', () => {
      const spy = jest.spyOn(service.repo, 'updateStickerCounts')
      service.applyPendingUpdates([
        { code: 'mex', stickers: [{ number: 4, count: 2 }, { number: 5, count: 1 }] },
        { code: 'fwc', stickers: [{ number: 1, count: 3 }] }
      ])
      expect(spy).toHaveBeenCalledWith({
        countries: [
          { code: 'MEX', counts: new Map([[4, 2], [5, 1]]) },
          { code: 'FWC', counts: new Map([[1, 3]]) }
        ]
      })
    })
    test('counts individual sticker updates across countries, not country entries', () => {
      const result = service.applyPendingUpdates([
        { code: 'mex', stickers: [{ number: 4, count: 2 }, { number: 5, count: 1 }] },
        { code: 'fwc', stickers: [{ number: 1, count: 3 }] }
      ])
      expect(result.message).toBe('Updated 3 sticker value(s).')
    })
    test('throws when no updates are provided', () => {
      expect(() => service.applyPendingUpdates([])).toThrow('There are no pending updates to apply.')
    })
    test('rejects an empty country code', () => {
      expect(() =>
        service.applyPendingUpdates([{ code: '', stickers: [{ number: 1, count: 1 }] }])
      ).toThrow('Country code is required.')
    })
    test('rejects a country entry with no sticker updates', () => {
      expect(() =>
        service.applyPendingUpdates([{ code: 'mex', stickers: [] }])
      ).toThrow('No sticker updates provided for MEX.')
    })
    test('rejects invalid sticker number', () => {
      expect(() =>
        service.applyPendingUpdates([{ code: 'MEX', stickers: [{ number: 99, count: 1 }] }])
      ).toThrow('Sticker 99 is not valid for country code "MEX".')
    })
    test('rejects negative counts', () => {
      expect(() =>
        service.applyPendingUpdates([{ code: 'MEX', stickers: [{ number: 1, count: -1 }] }])
      ).toThrow('Invalid count "-1" for MEX sticker 1.')
    })
  })
})

/**
 * Cross-layer integration scenarios: feeds the actual payload produced by
 * QuickEntryHelpers.getPendingUpdates() (client) into the real
 * QuickEntryService.applyPendingUpdates() (backend), end-to-end. Isolated unit tests on
 * each side independently assert against the *documented* wire shape, but neither one
 * calls the other - this is the one test that would catch the two layers silently
 * drifting apart (e.g. one side re-flattening the payload, or miscounting sticker
 * edits per country the way applyPendingUpdates()/updatePendingChangesMessage() both
 * once did before being fixed).
 */
describe('QuickEntryService/QuickEntryHelpers integration scenarios', () => {
  const { helpers } = require('../build/QuickEntryHelpers.html.js')
  let service

  beforeEach(() => {
    initTestKernel()
    service = new QuickEntryService()
  })

  test('client pending-update payload is accepted end-to-end by the backend', () => {
    // Simulates the UI state after two edits on MEX and one on FWC.
    const clientState = { 'MEX|18': 2, 'MEX|20': 0, 'FWC|1': 3 }
    const payload = helpers.getPendingUpdates(clientState)

    const spy = jest.spyOn(service.repo, 'updateStickerCounts')
    const result = service.applyPendingUpdates(payload)

    expect(spy).toHaveBeenCalledWith({
      countries: [
        { code: 'MEX', counts: new Map([[18, 2], [20, 0]]) },
        { code: 'FWC', counts: new Map([[1, 3]]) }
      ]
    })
    expect(result.success).toBe(true)
    // 3 individual sticker edits across 2 countries - would read "Updated 2 sticker value(s)."
    // if the message were (incorrectly) counting grouped country entries instead.
    expect(result.message).toBe('Updated 3 sticker value(s).')
  })
})
