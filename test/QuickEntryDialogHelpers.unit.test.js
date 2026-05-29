// test/QuickEntryDialogHelpers.unit.test.js

/** Unit tests for QuickEntryDialogHelpers. */

const { helpers } = require('../build/QuickEntryDialogHelpers.html.js')
const { initTestKernel } = require('./utils/testKernel')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
global.document = {
  createElement: () => ({
    className: '',
    textContent: ''
  }),
  documentElement: {
    style: {
      _store: {},
      setProperty (key, value) {
        this._store[key] = value
      },
      getPropertyValue (key) {
        return this._store[key]
      }
    }
  }
}
/**
 * Each test gets a fresh isolated environment with fully mocked Google Apps Script services and DOM,
 * ensuring no side effects or reliance on actual spreadsheet data.
 */
beforeEach(() => {
  initTestKernel()
})

/** Pure function tests for QuickEntryDialogHelpers. Focus on data transformations and logic without side effects. */
describe('QuickEntryDialogHelpers', () => {
  test('getPendingUpdates converts state map to array', () => {
    // verifies UI pending map → backend payload conversion
    const state = { 'ARG|1': 2, 'BRA|10': 1 }
    const result = helpers.getPendingUpdates(state)

    expect(result).toEqual([
      { countryCode: 'ARG', stickerNumber: 1, count: 2 },
      { countryCode: 'BRA', stickerNumber: 10, count: 1 }
    ])
  })
  test('queueStickerChange stores pending sticker updates', () => {
    // verifies pending updates are tracked with stable keys
    const result = helpers.queueStickerChange({ countries: [], pendingUpdates: {} }, 'ARG', 1, 2)

    expect(result.pendingUpdates['ARG|1']).toBe(2)
  })
})

/** Tests for functions that calculate sticker status and summaries based on sticker counts. */
describe('buildCountrySummary()', () => {
  test('calculates owned, missing and repeated totals', () => {
    // verifies summary counters derived from sticker counts
    const stickers = [{ count: 0 }, { count: 1 }, { count: 2 }, { count: 3 }]

    expect(helpers.buildCountrySummary(stickers)).toEqual({ total: 4, owned: 3, missing: 1, repeated: 2, completionPercent: 75 })
  })
  test('returns zero completion for empty sticker list', () => {
    // prevents division edge cases for empty countries
    expect(helpers.buildCountrySummary([])).toEqual({ total: 0, owned: 0, missing: 0, repeated: 0, completionPercent: 0 })
  })
  test('handles all zero counts', () => {
    expect(
      helpers.buildCountrySummary([{ count: 0 }, { count: 0 }])
    ).toEqual({
      total: 2,
      owned: 0,
      missing: 2,
      repeated: 0,
      completionPercent: 0
    })
  })
})

/** Tests for functions that build keys, filter stickers, and apply pending updates based on state. */
describe('buildPendingKey()', () => {
  test('builds stable country-sticker key', () => {
    // ensures pending updates use deterministic identifiers
    expect(helpers.buildPendingKey('ARG', 12)).toBe('ARG|12')
  })
})

/** Tests for functions that filter stickers based on selected status (missing, repeated, all). */
describe('filterCountryStickers()', () => {
  test('returns only missing stickers', () => {
    // verifies missing filter logic
    const state = { selectedStatusFilter: 'missing' }
    const country = { stickers: [{ count: 0 }, { count: 1 }, { count: 2 }] }

    expect(helpers.filterCountryStickers(country, state)).toEqual({
      stickers: [{ count: 0 }]
    })
  })
  test('returns only repeated stickers', () => {
    // verifies repeated filter logic
    const state = { selectedStatusFilter: 'repeated' }
    const country = { stickers: [{ count: 0 }, { count: 2 }, { count: 3 }] }

    expect(helpers.filterCountryStickers(country, state)).toEqual({
      stickers: [{ count: 2 }, { count: 3 }]
    })
  })
  test('returns original country for all filter', () => {
    // verifies default filter path
    const state = { selectedStatusFilter: 'all' }
    const country = { stickers: [{ count: 0 }, { count: 1 }] }

    expect(helpers.filterCountryStickers(country, state)).toEqual(country)
  })
})

/** Tests for functions that determine if a country matches the selected group filter. */
describe('matchesGroupFilter()', () => {
  test('returns true for all groups filter', () => {
    expect(
      helpers.matchesGroupFilter(
        { group: 'A' }, { selectedGroupFilter: 'all' }
      )
    ).toBe(true)
  })
  test('returns true when country matches selected group', () => {
    expect(
      helpers.matchesGroupFilter(
        { group: 'B' }, { selectedGroupFilter: 'B' }
      )
    ).toBe(true)
  })
  test('returns false for non matching group', () => {
    expect(
      helpers.matchesGroupFilter(
        { group: 'C' }, { selectedGroupFilter: 'A' }
      )
    ).toBe(false)
  })
})

/** Tests for functions that apply pending sticker count updates and mark stickers with pending changes. */
describe('applyPendingStickerUpdate()', () => {
  test('applies pending count and marks sticker as pending', () => {
    const sticker = { number: 10, count: 1 }
    const state = { pendingUpdates: { 'ARG|10': 3 } }

    expect(
      helpers.applyPendingStickerUpdate('ARG', sticker, state)
    ).toEqual({
      number: 10,
      count: 3,
      label: '10 (3)',
      hasPendingChange: true
    })
  })
})

/** Tests for functions that determine if a country matches the team search text based on country name. */
describe('matchesTeamSearch()', () => {
  test('returns true when search text is empty', () => {
    expect(
      helpers.matchesTeamSearch(
        { code: 'ARG', countryName: 'Argentina' }, { teamSearchText: '' }
      )
    ).toBe(true)
  })
  test('matches country name case-insensitively', () => {
    expect(
      helpers.matchesTeamSearch(
        { code: 'ARG', countryName: 'Argentina' }, { teamSearchText: 'argen' }
      )
    ).toBe(true)
  })
})

/** Tests for functions that queue sticker count changes and manage pending updates based on user interactions. */
describe('queueStickerChange()', () => {
  test('removes pending update when value returns to original', () => {
    const state = {
      countries: [{
        code: 'ARG',
        stickers: [{ number: 1, count: 2 }]
      }],
      pendingUpdates: { 'ARG|1': 3 }
    }

    helpers.queueStickerChange(state, 'ARG', 1, 2)
    expect(state.pendingUpdates['ARG|1']).toBeUndefined()
  })
  test('prevents negative sticker counts', () => {
    const state = {
      countries: [],
      pendingUpdates: {}
    }

    helpers.queueStickerChange(state, 'ARG', 1, -5)
    expect(state.pendingUpdates['ARG|1']).toBeUndefined()
  })
})

/** Tests for functions that update user feedback messages based on pending changes in the state. */
describe('updatePendingChangesMessage()', () => {
  test('shows ready message when no pending changes exist', () => {
    const setMessage = jest.fn()

    helpers.updatePendingChangesMessage(
      { pendingUpdates: {} }, setMessage
    )
    expect(setMessage).toHaveBeenCalledWith('Ready.', 'success')
  })
  test('shows pending message with count', () => {
    const setMessage = jest.fn()

    helpers.updatePendingChangesMessage(
      { pendingUpdates: { 'ARG|1': 2, 'BRA|3': 1 } }, setMessage
    )
    expect(setMessage).toHaveBeenCalledWith('Pending changes: 2', 'pending')
  })
})

/** Tests for functions that build DOM elements for empty states and manage message element classes and text. */
describe('buildEmptyState()', () => {
  test('creates empty state element with message', () => {
    const el = helpers.buildEmptyState('Nothing found')

    expect(el.className).toBe('empty-state')
    expect(el.textContent).toBe('Nothing found')
  })
})

/** Tests for functions that set user feedback messages with appropriate classes based on message type. */
describe('setMessage()', () => {
  test('updates message element text and class', () => {
    const el = { className: '', textContent: '' }

    helpers.setMessage(el, 'Updated', 'success')
    expect(el.textContent).toBe('Updated')
    expect(el.className).toBe('message success')
  })
})
/*
test('updates message element text and class', () => {
  const el = { className: '', textContent: '' }
  console.log('BEFORE:', el)
  helpers.setMessage(el, 'Updated', 'success')
  console.log('AFTER:', el)
  expect(el.textContent).toBe('Updated')
  expect(el.className).toBe('message success')
})
  */

/** Tests for functions that update CSS variables to adjust layout based on user-selected options. */
describe('applyLayout()', () => {
  test('updates stickers per row css variable', () => {
    helpers.applyLayout(6)
    expect(
      document.documentElement.style.getPropertyValue('--stickers-per-row')
    ).toBe('6')
  })
})

/** Tests for functions that filter the list of visible countries based on selected group, status, and team search text. */
describe('getVisibleCountries()', () => {
  test('returns filtered visible countries', () => {
    const state = {
      countries: [{
        code: 'ARG',
        countryName: 'Argentina',
        group: 'A',
        stickers: [{ number: 1, count: 0 }]
      }],
      pendingUpdates: {},
      selectedGroupFilter: 'A',
      selectedStatusFilter: 'missing',
      teamSearchText: 'arg'
    }
    const result = helpers.getVisibleCountries(state)
    expect(result).toHaveLength(1)
  })
  test('returns empty array when no countries match filters', () => {
    const state = {
      countries: [],
      pendingUpdates: {},
      selectedGroupFilter: 'A',
      selectedStatusFilter: 'missing',
      teamSearchText: 'zzz'
    }
    const result = helpers.getVisibleCountries(state)
    expect(result).toEqual([])
  })
})
