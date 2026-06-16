// test/QuickEntryDialogHelpers.unit.test.js

/** Unit tests for QuickEntryDialogHelpers. */

const { helpers } = require('../build/QuickEntryDialogHelpers.html.js')

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

/** Tests for QuickEntryDialogHelpers.html. */
describe('QuickEntryDialogHelpers.html', () => {
  /** Test for queueStickerChange function */
  describe('queueStickerChange()', () => {
    test('queueStickerChange stores pending sticker updates', () => {
      // verifies pending updates are tracked with stable keys
      const result = helpers.queueStickerChange({ countries: [], pendingUpdates: {} }, 'ARG', 1, 2)

      expect(result.pendingUpdates['ARG|1']).toBe(2)
    })
  })

  /** Tests for getPendingUpdates function */
  describe('getPendingUpdates()', () => {
    test('getPendingUpdates converts state map to array', () => {
      // verifies UI pending map → backend payload conversion
      const state = { 'ARG|1': 2, 'BRA|10': 1 }
      const result = helpers.getPendingUpdates(state)
      expect(result).toEqual([
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'BRA', stickerNumber: 10, count: 1 }
      ])
    })
    test('handles undefined input safely', () => {
      expect(helpers.getPendingUpdates(undefined)).toEqual([])
    })
    test('correctly parses numeric sticker numbers', () => {
      expect(helpers.getPendingUpdates({ 'ARG|007': 3 })).toEqual([
        { countryCode: 'ARG', stickerNumber: 7, count: 3 }
      ])
    })
  })

  /** Test for buildCountrySummary() */
  describe('buildCountrySummary()', () => {
    test('returns zero completion for empty sticker list', () => {
      // prevents division edge cases for empty countries
      expect(helpers.buildCountrySummary([])).toEqual({ total: 0, owned: 0, missing: 0, repeated: 0, completionPercent: 0 })
    })
    test('treats undefined counts as neutral (not missing)', () => {
      expect(helpers.buildCountrySummary([{ count: undefined }, { count: 1 }])).
        toEqual({ total: 2, owned: 1, missing: 0, repeated: 0, completionPercent: 50 })
    })
  })

  /** Tests for buildPendingKey() */
  describe('buildPendingKey()', () => {
    test('builds stable country-sticker key', () => {
      // ensures pending updates use deterministic identifiers
      expect(helpers.buildPendingKey('ARG', 12)).toBe('ARG|12')
    })
    test('handles numeric string input consistently', () => {
      expect(helpers.buildPendingKey('BRA', '5')).toBe('BRA|5')
    })
  })

  /** Tests for filterCountryStickers() */
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
    test('returns null when filtered stickers become empty and filter is not all', () => {
      const state = { selectedStatusFilter: 'missing' }
      const country = { stickers: [{ count: 1 }, { count: 2 }] }
      expect(helpers.filterCountryStickers(country, state)).toBeNull()
    })
    test('filters pending stickers only', () => {
      const state = { selectedStatusFilter: 'pending' }
      const country = {
        stickers: [
          { number: 1, count: 1, hasPendingChange: true },
          { number: 2, count: 2, hasPendingChange: false }
        ]
      }
      expect(helpers.filterCountryStickers(country, state)).toEqual({
        stickers: [{ number: 1, count: 1, hasPendingChange: true }]
      })
    })
  })

  /** Tests for matchesGroupFilter() */
  describe('matchesGroupFilter()', () => {
    test('returns true when country matches selected group', () => {
      expect(helpers.matchesGroupFilter({ group: 'B' }, { selectedGroupFilter: 'B' })).toBe(true)
    })
    test('returns false when country group is undefined and filter is specific', () => {
      expect(helpers.matchesGroupFilter({}, { selectedGroupFilter: 'A' })).toBe(false)
    })
  })

  /** Tests for applyPendingStickerUpdate() */
  describe('applyPendingStickerUpdate()', () => {
    test('applies pending count and marks sticker as pending', () => {
      const sticker = { number: 10, count: 1 }
      const state = { pendingUpdates: { 'ARG|10': 3 } }
      expect(
        helpers.applyPendingStickerUpdate('ARG', sticker, state)
      ).toEqual({ number: 10, count: 3, label: '10 (3)', hasPendingChange: true })
    })
    test('keeps original sticker when no pending update exists', () => {
      expect(helpers.applyPendingStickerUpdate('ARG', { number: 5, count: 2 }, { pendingUpdates: {} })).toEqual({ number: 5, count: 2, hasPendingChange: false })
    })
    test('handles missing pendingUpdates safely', () => {
      expect(helpers.applyPendingStickerUpdate('ARG', { number: 5, count: 2 }, {})).
        toEqual({ number: 5, count: 2, hasPendingChange: false })
    })
    test('updates label with pending count when applied', () => {
      expect(helpers.applyPendingStickerUpdate('ARG', { number: 7, count: 1 }, { pendingUpdates: { 'ARG|7': 9 } }).label).toBe('7 (9)')
    })
  })

  /** Tests for matchesTeamSearch() */
  describe('matchesTeamSearch()', () => {
    test('matches country name case-insensitively', () => {
      expect(helpers.matchesTeamSearch({ code: 'ARG', countryName: 'Argentina' }, { teamSearchText: 'argen' })).toBe(true)
    })
    test('matches country code prefix case-insensitively', () => {
      expect(helpers.matchesTeamSearch({ code: 'ARG', countryName: 'Argentina' }, { teamSearchText: 'ar' })).toBe(true)
    })
    test('matches country name prefix case-insensitively', () => {
      expect(helpers.matchesTeamSearch({ code: 'ARG', countryName: 'Argentina' }, { teamSearchText: 'arg' })).toBe(true)
    })
    test('returns false when no match is found', () => {
      expect(helpers.matchesTeamSearch({ code: 'ARG', countryName: 'Argentina' }, { teamSearchText: 'zzz' })).toBe(false)
    })
  })

  /** Tests for queueStickerChange() */
  describe('queueStickerChange()', () => {
    test('removes pending update when value returns to original', () => {
      const state = { countries: [{ code: 'ARG', stickers: [{ number: 1, count: 2 }] }], pendingUpdates: { 'ARG|1': 3 } }
      helpers.queueStickerChange(state, 'ARG', 1, 2)
      expect(state.pendingUpdates['ARG|1']).toBeUndefined()
    })
    test('prevents negative sticker counts', () => {
      const state = { countries: [], pendingUpdates: {} }
      helpers.queueStickerChange(state, 'ARG', 1, -5)
      expect(state.pendingUpdates['ARG|1']).toBeUndefined()
    })
  })

  /** Test for updatePendingChangesMessage() */
  describe('updatePendingChangesMessage()', () => {
    test('shows ready message when no pending changes exist', () => {
      const setMessage = jest.fn()
      helpers.updatePendingChangesMessage({ pendingUpdates: {} }, setMessage)
      expect(setMessage).toHaveBeenCalledWith('Ready.', 'success')
    })
    test('shows pending changes with correct count', () => {
      const setMessageFn = jest.fn()
      helpers.updatePendingChangesMessage({ pendingUpdates: { 'ARG|1': 2, 'BRA|2': 3 } }, setMessageFn)
      expect(setMessageFn).toHaveBeenCalledWith('Pending changes: 2', 'pending')
    })
    test('handles undefined pendingUpdates safely', () => {
      const setMessageFn = jest.fn()
      helpers.updatePendingChangesMessage({}, setMessageFn)
      expect(setMessageFn).toHaveBeenCalledWith('Ready.', 'success')
    })
  })

  /** Tests for buildEmptyState() */
  describe('buildEmptyState()', () => {
    test('creates empty state element with message', () => {
      const el = helpers.buildEmptyState('Nothing found')

      expect(el.className).toBe('empty-state')
      expect(el.textContent).toBe('Nothing found')
    })
  })

  /** Tests for setMessage() */
  describe('setMessage()', () => {
    test('updates message element text and class', () => {
      const el = { className: '', textContent: '' }

      helpers.setMessage(el, 'Updated', 'success')
      expect(el.textContent).toBe('Updated')
      expect(el.className).toBe('message success')
    })
  })

  /** Tests for applyLayout() */
  describe('applyLayout()', () => {
    test('updates stickers per row css variable', () => {
      helpers.applyLayout(6)
      expect(
        document.documentElement.style.getPropertyValue('--stickers-per-row')
      ).toBe('6')
    })
  })

  /** Test for getVisibleCountries() */
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
    test('filters out countries when group does not match', () => {
      const state = {
        countries: [{
          code: 'ARG',
          countryName: 'Argentina',
          group: 'A',
          stickers: [{ number: 1, count: 0 }]
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'B',
        selectedStatusFilter: 'missing',
        teamSearchText: ''
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('filters out countries when search does not match', () => {
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
        teamSearchText: 'zzz'
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('removes countries with no stickers after status filtering', () => {
      const state = {
        countries: [{
          code: 'ARG',
          countryName: 'Argentina',
          group: 'A',
          stickers: [{ number: 1, count: 1 }]
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'missing',
        teamSearchText: ''
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
  })

  /** Tests for renderPreviewData() */
  describe('renderPreviewData()', () => {
    test('formats countries into preview lines', () => {
      expect(helpers.renderPreviewData({ countries: [{ code: 'ARG', stickers: [{ number: 1, count: 2 }] }] })).toBe('ARG -> 1:2')
    })
    test('joins multiple countries with newline', () => {
      expect(helpers.renderPreviewData({
        countries: [
          { code: 'ARG', stickers: [{ number: 1, count: 1 }] },
          { code: 'BRA', stickers: [{ number: 2, count: 2 }] }
        ]
      })).toBe('ARG -> 1:1\nBRA -> 2:2')
    })
    test('returns empty string for empty input', () => {
      expect(helpers.renderPreviewData({ countries: [] })).toBe('')
    })
    test('returns empty string for invalid input', () => {
      expect(helpers.renderPreviewData(null)).toBe('')
    })
  })

  /** Test for getPayloadFromState() */
  describe('getPayloadFromState()', () => {
    test('maps full state into payload correctly', () => {
      expect(helpers.getPayloadFromState({ text: 'abc', mode: 'clean', includeFlags: true })).toEqual({ text: 'abc', mode: 'clean', includeFlags: true })
    })
    test('applies default values when state is empty', () => {
      expect(helpers.getPayloadFromState({})).toEqual({ text: '', mode: 'update', includeFlags: false })
    })
    test('handles undefined state safely', () => {
      expect(helpers.getPayloadFromState(undefined)).toEqual({ text: '', mode: 'update', includeFlags: false })
    })
    test('normalizes includeFlags to boolean', () => {
      expect(helpers.getPayloadFromState({ includeFlags: 'yes' }).includeFlags).toBe(true)
      expect(helpers.getPayloadFromState({ includeFlags: 0 }).includeFlags).toBe(false)
    })
  })

  /** Tests for getVisibleCountries() */
  describe('getVisibleCountries edge cases', () => {
    test('handles null state safely', () => {
      expect(helpers.getVisibleCountries({
        countries: null,
        pendingUpdates: {},
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'missing',
        teamSearchText: ''
      })).toEqual([])
      expect(helpers.getVisibleCountries(null)).toEqual([])
    })
    test('handles undefined filters safely', () => {
      expect(helpers.getVisibleCountries({
        countries: [],
        pendingUpdates: {},
        selectedGroupFilter: undefined,
        selectedStatusFilter: undefined,
        teamSearchText: undefined
      })).toEqual([])
    })
  })
})
