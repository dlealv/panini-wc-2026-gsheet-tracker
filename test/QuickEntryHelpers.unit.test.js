// test/QuickEntryHelpers.unit.test.js

/** Unit tests for QuickEntryHelpers. */

const { helpers } = require('../build/QuickEntryHelpers.html.js')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
global.document = {
  createElement: () => ({
    className: '',
    textContent: ''
  }),
  documentElement: {
    style: {
      _store: {},
      setProperty(key, value) {
        this._store[key] = value
      },
      getPropertyValue(key) {
        return this._store[key]
      }
    }
  }
}

/** Tests for QuickEntryHelpers.html. */
describe('QuickEntryHelpers.html', () => {
  /** Test for queueStickerChange function */
  describe('queueStickerChange()', () => {
    test('queueStickerChange stores pending sticker updates', () => {
      // verifies pending updates are tracked with stable keys
      const result = helpers.queueStickerChange({ countries: [], pendingUpdates: {} }, 'ARG', 1, 2)
      expect(result.pendingUpdates['ARG|1']).toBe(2)
    })
    test('stores zero when next value is negative and original is greater than zero', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 2 }]
        }],
        pendingUpdates: {}
      }
      helpers.queueStickerChange(state, 'ARG', 1, -5)
      expect(state.pendingUpdates['ARG|1']).toBe(0)
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
      expect(helpers._buildCountrySummary([])).toEqual({ total: 0, owned: 0, missing: 0, repeated: 0, completionPercent: 0 })
    })
    test('treats undefined counts as neutral (not missing)', () => {
      expect(helpers._buildCountrySummary([{ count: undefined }, { count: 1 }])).
        toEqual({ total: 2, owned: 1, missing: 0, repeated: 0, completionPercent: 50 })
    })
  })

  /** Tests for buildPendingKey() */
  describe('buildPendingKey()', () => {
    test('builds stable country-sticker key', () => {
      // ensures pending updates use deterministic identifiers
      expect(helpers._buildPendingKey('ARG', 12)).toBe('ARG|12')
    })
    test('handles numeric string input consistently', () => {
      expect(helpers._buildPendingKey('BRA', '5')).toBe('BRA|5')
    })
  })

  /** Tests for _filterByStickerStatus() */
  describe('_filterByStickerStatus()', () => {
    test('returns only missing stickers', () => {
      // verifies missing filter logic
      const state = { selectedStatusFilter: 'missing' }
      const country = { stickers: [{ count: 0 }, { count: 1 }, { count: 2 }] }
      expect(helpers._filterByStickerStatus(country, state)).toEqual({
        stickers: [{ count: 0 }]
      })
    })
    test('returns only repeated stickers', () => {
      // verifies repeated filter logic
      const state = { selectedStatusFilter: 'repeated' }
      const country = { stickers: [{ count: 0 }, { count: 2 }, { count: 3 }] }
      expect(helpers._filterByStickerStatus(country, state)).toEqual({
        stickers: [{ count: 2 }, { count: 3 }]
      })
    })
    test('returns null when filtered stickers become empty and filter is not all', () => {
      const state = { selectedStatusFilter: 'missing' }
      const country = { stickers: [{ count: 1 }, { count: 2 }] }
      expect(helpers._filterByStickerStatus(country, state)).toBeNull()
    })
    test('filters pending stickers only', () => {
      const state = { selectedStatusFilter: 'pending' }
      const country = {
        stickers: [
          { number: 1, count: 1, hasPendingChange: true },
          { number: 2, count: 2, hasPendingChange: false }
        ]
      }
      expect(helpers._filterByStickerStatus(country, state)).toEqual({
        stickers: [{ number: 1, count: 1, hasPendingChange: true }]
      })
    })
  })

  /** Tests for matchesGroupFilter() */
  describe('matchesGroupFilter()', () => {
    test('returns true when country matches selected group', () => {
      expect(helpers._matchesGroupFilter({ group: 'B' }, { selectedGroupFilter: 'B' })).toBe(true)
    })
    test('returns false when country group is undefined and filter is specific', () => {
      expect(helpers._matchesGroupFilter({}, { selectedGroupFilter: 'A' })).toBe(false)
    })
  })

  /** Tests for applyPendingStickerUpdate() */
  describe('applyPendingStickerUpdate()', () => {
    test('applies pending count and marks sticker as pending', () => {
      const sticker = { number: 10, count: 1 }
      const state = { pendingUpdates: { 'ARG|10': 3 } }
      expect(
        helpers._applyPendingStickerUpdate('ARG', sticker, state)
      ).toEqual({ number: 10, count: 3, label: '10 (3)', hasPendingChange: true })
    })
    test('keeps original sticker when no pending update exists', () => {
      expect(helpers._applyPendingStickerUpdate('ARG', { number: 5, count: 2 }, { pendingUpdates: {} })).toEqual({ number: 5, count: 2, hasPendingChange: false })
    })
    test('handles missing pendingUpdates safely', () => {
      expect(helpers._applyPendingStickerUpdate('ARG', { number: 5, count: 2 }, {})).
        toEqual({ number: 5, count: 2, hasPendingChange: false })
    })
    test('updates label with pending count when applied', () => {
      expect(helpers._applyPendingStickerUpdate('ARG', { number: 7, count: 1 }, { pendingUpdates: { 'ARG|7': 9 } }).label).toBe('7 (9)')
    })
  })

  /** Tests for _applySearch() */
  describe('_applySearch()', () => {
    test('matches country name case-insensitively', () => {
      expect(helpers._applySearch({
        code: 'ARG',
        countryName: 'Argentina',
        stickers: []
      }, { searchText: 'argen' })).not.toBeNull()
    })
    test('matches country code prefix case-insensitively', () => {
      expect(helpers._applySearch({
        code: 'ARG',
        countryName: 'Argentina',
        stickers: []
      }, { searchText: 'ar' })).not.toBeNull()
    })
    test('returns null when no country text match is found', () => {
      expect(helpers._applySearch({
        code: 'ARG',
        countryName: 'Argentina',
        stickers: []
      }, { searchText: 'zzz' })).toBeNull()
    })
    test('returns only matching sticker for numeric search', () => {
      const result = helpers._applySearch({
        code: 'ARG',
        countryName: 'Argentina',
        stickers: [
          { number: 13, count: 1 },
          { number: 14, count: 2 }
        ]
      }, { searchText: '13' })
      expect(result.stickers).toEqual([{ number: 13, count: 1 }])
    })
    test('returns null when numeric sticker search does not exist', () => {
      expect(helpers._applySearch({
        code: 'ARG',
        countryName: 'Argentina',
        stickers: [
          { number: 13, count: 1 }
        ]
      }, { searchText: '99' })).toBeNull()
    })
    test('returns country unchanged when search is empty', () => {
      const country = { code: 'ARG', countryName: 'Argentina', stickers: [{ number: 13, count: 1 }] }
      expect(helpers._applySearch(country, { searchText: '' })).toEqual(country)
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
    test('returns plain object when document is undefined', () => {
      const doc = global.document
      delete global.document
      const el = helpers.buildEmptyState('Nothing found')
      expect(el).toEqual({
        className: 'empty-state',
        textContent: 'Nothing found'
      })
      global.document = doc
    })
  })

  /** Tests for setMessage() */
  test('updates message element text and class', () => {
    const el = {
      textContent: '',
      classList: {
        classes: [],
        remove(...names) {
          this.classes = this.classes.filter(c => !names.includes(c))
        },
        add(...names) {
          this.classes.push(...names)
        }
      }
    }
    helpers.setMessage(el, 'Updated', 'success')
    expect(el.textContent).toBe('Updated')
    expect(el.classList.classes).toEqual(['message', 'success'])
  })

  /** Tests for applyLayout() */
  describe('applyLayout()', () => {
    test('updates stickers per row css variable', () => {
      helpers.applyLayout(6)
      expect(
        document.documentElement.style.getPropertyValue('--stickers-per-row')
      ).toBe('6')
    })
    test('applyLayout safely skips DOM when document is undefined', () => {
      const doc = global.document
      delete global.document
      expect(() => helpers.applyLayout(5)).not.toThrow()
      global.document = doc
    })
    test('does not fail when document is undefined', () => {
      const oldDocument = global.document
      delete global.document
      expect(() => helpers.applyLayout(5)).not.toThrow()
      global.document = oldDocument
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
        searchText: 'arg'
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
        searchText: ''
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
        searchText: 'zzz'
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
        searchText: ''
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('returns matching sticker number across all countries for numeric search', () => {
      const state = {
        countries: [
          {
            code: 'ARG',
            countryName: 'Argentina',
            group: 'A',
            stickers: [{ number: 1, count: 0 }, { number: 13, count: 1 }]
          },
          {
            code: 'BRA',
            countryName: 'Brazil',
            group: 'A',
            stickers: [{ number: 13, count: 2 }, { number: 20, count: 0 }]
          }
        ],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: '13'
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(2)
      expect(result[0].stickers).toEqual([{ number: 13, count: 1, hasPendingChange: false }])
      expect(result[1].stickers).toEqual([{ number: 13, count: 2, hasPendingChange: false }])
    })
    test('numeric search combines correctly with missing filter', () => {
      const state = {
        countries: [
          {
            code: 'ARG',
            countryName: 'Argentina',
            group: 'A',
            stickers: [{ number: 13, count: 0 }]
          },
          {
            code: 'BRA',
            countryName: 'Brazil',
            group: 'A',
            stickers: [{ number: 13, count: 1 }]
          }
        ],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'missing',
        searchText: '13'
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('ARG')
      expect(result[0].stickers).toEqual([{ number: 13, count: 0, hasPendingChange: false }])
    })
    test('returns no countries when sticker number does not exist', () => {
      const state = {
        countries: [{ code: 'ARG', countryName: 'Argentina', group: 'A', stickers: [{ number: 1, count: 1 }] }],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: '999'
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
  })

  /** Tests for _renderPreview() */
  describe('_renderPreview()', () => {
    test('formats countries into preview lines', () => {
      expect(helpers._renderPreviewData({ countries: [{ code: 'ARG', stickers: [{ number: 1, count: 2 }] }] })).toBe('ARG -> 1:2')
    })
    test('joins multiple countries with newline', () => {
      expect(helpers._renderPreviewData({
        countries: [
          { code: 'ARG', stickers: [{ number: 1, count: 1 }] },
          { code: 'BRA', stickers: [{ number: 2, count: 2 }] }
        ]
      })).toBe('ARG -> 1:1\nBRA -> 2:2')
    })
    test('returns empty string for empty input', () => {
      expect(helpers._renderPreviewData({ countries: [] })).toBe('')
    })
    test('returns empty string for invalid input', () => {
      expect(helpers._renderPreviewData(null)).toBe('')
    })
  })

  /** Test for getPayloadFromState() */
  describe('getPayloadFromState()', () => {
    test('maps full state into payload correctly', () => {
      expect(helpers._getPayloadFromState({ text: 'abc', mode: 'clean', includeFlags: true })).toEqual({ text: 'abc', mode: 'clean', includeFlags: true })
    })
    test('applies default values when state is empty', () => {
      expect(helpers._getPayloadFromState({})).toEqual({ text: '', mode: 'update', includeFlags: false })
    })
    test('handles undefined state safely', () => {
      expect(helpers._getPayloadFromState(undefined)).toEqual({ text: '', mode: 'update', includeFlags: false })
    })
    test('normalizes includeFlags to boolean', () => {
      expect(helpers._getPayloadFromState({ includeFlags: 'yes' }).includeFlags).toBe(true)
      expect(helpers._getPayloadFromState({ includeFlags: 0 }).includeFlags).toBe(false)
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
        searchText: ''
      })).toEqual([])
      expect(helpers.getVisibleCountries(null)).toEqual([])
    })
    test('handles undefined filters safely', () => {
      expect(helpers.getVisibleCountries({
        countries: [],
        pendingUpdates: {},
        selectedGroupFilter: undefined,
        selectedStatusFilter: undefined,
        searchText: undefined
      })).toEqual([])
    })
    test('recalculates summary after applying pending updates', () => {
      const state = {
        countries: [{
          code: 'ARG',
          countryName: 'Argentina',
          group: 'A',
          stickers: [{ number: 1, count: 0 }]
        }],
        pendingUpdates: { 'ARG|1': 1 },
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'all',
        searchText: ''
      }
      const result = helpers.getVisibleCountries(state)
      expect(result[0].summary.owned).toBe(1)
      expect(result[0].summary.missing).toBe(0)
      expect(result[0].isCompleted).toBe(true)
    })
  })
  /** Tests for commitPendingUpdates() */
  describe('commitPendingUpdates()', () => {
    test('updates sticker count and label', () => {
      const state = {
        countries: [{
          code: 'MEX',
          stickers: [{ number: 3, count: 3, label: '3 (3)', hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [{ countryCode: 'MEX', stickerNumber: 3, count: 2 }])
      const sticker = state.countries[0].stickers[0]
      expect(sticker.count).toBe(2)
      expect(sticker.label).toBe('3 (2)')
      expect(sticker.hasPendingChange).toBe(false)
    })
    test('updates multiple stickers', () => {
      const state = {
        countries: [
          {
            code: 'ARG',
            stickers:
              [
                {
                  number: 1,
                  count: 0,
                  label: '1 (0)',
                  hasPendingChange: true
                }, { number: 2, count: 1, label: '2 (1)', hasPendingChange: true }
              ]
          }]
      }
      helpers.commitPendingUpdates(state, [
        { countryCode: 'ARG', stickerNumber: 1, count: 2 },
        { countryCode: 'ARG', stickerNumber: 2, count: 0 }
      ])
      expect(state.countries[0].stickers[0].count).toBe(2)
      expect(state.countries[0].stickers[1].count).toBe(0)
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(false)
      expect(state.countries[0].stickers[1].hasPendingChange).toBe(false)
    })
    test('ignores unknown country', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 1, label: '1 (1)', hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [{ countryCode: 'BRA', stickerNumber: 1, count: 5 }])
      expect(state.countries[0].stickers[0].count).toBe(1)
      expect(state.countries[0].stickers[0].label).toBe('1 (1)')
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(true)
    })
    test('ignores unknown sticker', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 1, label: '1 (1)', hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [{ countryCode: 'ARG', stickerNumber: 99, count: 4 }])
      expect(state.countries[0].stickers[0].count).toBe(1)
      expect(state.countries[0].stickers[0].label).toBe('1 (1)')
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(true)
    })
    test('handles empty updates', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 1, label: '1 (1)', hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [])
      expect(state.countries[0].stickers[0].count).toBe(1)
      expect(state.countries[0].stickers[0].label).toBe('1 (1)')
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(true)
    })
    test('continues processing after skipping an invalid update', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 0, label: '1 (0)', hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [
        { countryCode: 'XXX', stickerNumber: 1, count: 9 },
        { countryCode: 'ARG', stickerNumber: 1, count: 2 }
      ])
      expect(state.countries[0].stickers[0].count).toBe(2)
    })
  })
})
