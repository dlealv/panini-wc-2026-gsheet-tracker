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
    test('builds the same pending-update key for a numeric-string sticker number as for a numeric one', () => {
      // was previously covered by a direct _buildPendingKey() test; verified here through the public
      // queueStickerChange() call instead, which is the only place the key format actually matters
      const state = { countries: [], pendingUpdates: {} }
      helpers.queueStickerChange(state, 'BRA', '5', 3)
      expect(state.pendingUpdates['BRA|5']).toBe(3)
    })
  })

  /** Tests for getPendingUpdates function */
  describe('getPendingUpdates()', () => {
    test('getPendingUpdates converts state map to array grouped by country', () => {
      // verifies UI pending map → backend payload conversion
      const state = { 'ARG|1': 2, 'BRA|10': 1 }
      const result = helpers.getPendingUpdates(state)
      expect(result).toEqual([
        { code: 'ARG', stickers: [{ number: 1, count: 2 }] },
        { code: 'BRA', stickers: [{ number: 10, count: 1 }] }
      ])
    })
    test('groups multiple pending stickers for the same country', () => {
      const state = { 'ARG|1': 2, 'ARG|5': 0, 'BRA|10': 1 }
      const result = helpers.getPendingUpdates(state)
      expect(result).toEqual([
        { code: 'ARG', stickers: [{ number: 1, count: 2 }, { number: 5, count: 0 }] },
        { code: 'BRA', stickers: [{ number: 10, count: 1 }] }
      ])
    })
    test('handles undefined input safely', () => {
      expect(helpers.getPendingUpdates(undefined)).toEqual([])
    })
    test('correctly parses numeric sticker numbers', () => {
      expect(helpers.getPendingUpdates({ 'ARG|007': 3 })).toEqual([
        { code: 'ARG', stickers: [{ number: 7, count: 3 }] }
      ])
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
    test('counts individual sticker edits, not distinct countries', () => {
      // ARG has 2 pending stickers, BRA has 1 - must report 3, not 2 (the country count)
      const setMessageFn = jest.fn()
      helpers.updatePendingChangesMessage({ pendingUpdates: { 'ARG|1': 2, 'ARG|5': 0, 'BRA|2': 3 } }, setMessageFn)
      expect(setMessageFn).toHaveBeenCalledWith('Pending changes: 3', 'pending')
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

  describe('setMessage()', () => {
    test('setMessage: applies default text and info type', () => {
      const el = {
        textContent: 'old',
        classList: {
          classes: ['success'],
          remove(...names) {
            this.classes = this.classes.filter(c => !names.includes(c))
          },
          add(...names) {
            this.classes.push(...names)
          }
        }
      }
      helpers.setMessage(el, '', undefined)
      expect(el.textContent).toBe('')
      expect(el.classList.classes).toEqual(['message', 'info'])
    })
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
    test('returns filtered visible countries, search by country code', () => {
      const state = {
        countries: [{ code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 1, count: 0 }] }],
        pendingUpdates: {},
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'missing',
        searchText: 'arg'
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('ARG')
    })
    test('returns filtered visible countries search by name', () => {
      const state = {
        countries: [{ code: 'BIH', name: 'Bosnia-Herzegovina', group: 'B', stickers: [{ number: 1, count: 0 }] }],
        pendingUpdates: {},
        selectedGroupFilter: 'B',
        selectedStatusFilter: 'missing',
        searchText: 'bos'
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('BIH')
    })
    test('filters out countries when group does not match', () => {
      const state = {
        countries: [{ code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 1, count: 0 }] }],
        pendingUpdates: {},
        selectedGroupFilter: 'B',
        selectedStatusFilter: 'missing',
        searchText: ''
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('filters out countries when search does not match', () => {
      const state = {
        countries: [{ code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 1, count: 0 }] }],
        pendingUpdates: {},
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'missing',
        searchText: 'zzz'
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('removes countries with no stickers after status filtering', () => {
      const state = {
        countries: [{ code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 1, count: 1 }] }],
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
          { code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 1, count: 0 }, { number: 13, count: 1 }] },
          { code: 'BRA', name: 'Brazil', group: 'A', stickers: [{ number: 13, count: 2 }, { number: 20, count: 0 }] }
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
          { code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 13, count: 0 }] },
          { code: 'BRA', name: 'Brazil', group: 'A', stickers: [{ number: 13, count: 1 }] }
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
        countries: [{ code: 'ARG', name: 'Argentina', group: 'A', stickers: [{ number: 1, count: 1 }] }],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: '999'
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('getVisibleCountries: applies pending updates before pending filter', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: [{ number: 1, count: 0, hasPendingChange: false }]
        }],
        pendingUpdates: { 'ARG|1': 2 },
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'pending',
        searchText: ''
      }
      expect(helpers.getVisibleCountries(state)).toEqual([{
        code: 'ARG',
        name: 'Argentina',
        group: 'A',
        stickers: [{ number: 1, count: 2, hasPendingChange: true }],
        summary: { total: 1, owned: 1, missing: 0, repeated: 1, completionPercent: 100 },
        isCompleted: true
      }])
    })
    test('applies the repeated status filter, keeping only stickers with count greater than one', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: [
            { number: 1, count: 2 },
            { number: 2, count: 1 }
          ]
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'repeated',
        searchText: ''
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].stickers).toEqual([{ number: 1, count: 2, hasPendingChange: false }])
    })
    test('filters out a country with no group property when a specific group filter is selected', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          // no group property
          stickers: [{ number: 1, count: 0 }]
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'A',
        selectedStatusFilter: 'all',
        searchText: ''
      }
      expect(helpers.getVisibleCountries(state)).toEqual([])
    })
    test('returns the country unchanged when searchText is empty', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: [{ number: 1, count: 0 }, { number: 2, count: 1 }]
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: ''
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].stickers).toEqual([
        { number: 1, count: 0, hasPendingChange: false },
        { number: 2, count: 1, hasPendingChange: false }
      ])
    })
    test('filters out stickers without a pending change when other stickers on the same country are pending', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: [
            { number: 1, count: 0, hasPendingChange: false },
            { number: 2, count: 1, hasPendingChange: false }
          ]
        }],
        pendingUpdates: { 'ARG|1': 3 },
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'pending',
        searchText: ''
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].stickers).toEqual([{ number: 1, count: 3, hasPendingChange: true }])
    })
    test('computes a zeroed summary for a country with no stickers', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: []
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: ''
      }
      const result = helpers.getVisibleCountries(state)
      expect(result).toHaveLength(1)
      expect(result[0].summary).toEqual({ total: 0, owned: 0, missing: 0, repeated: 0, completionPercent: 0 })
    })
    test('treats a sticker with an undefined count as neither owned nor missing in the summary', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: [
            { number: 1, count: 1 },
            { number: 2, count: undefined }
          ]
        }],
        pendingUpdates: {},
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: ''
      }
      const result = helpers.getVisibleCountries(state)
      expect(result[0].summary).toEqual({ total: 2, owned: 1, missing: 0, repeated: 0, completionPercent: 50 })
    })
    test('does not throw and reports no pending change when state has no pendingUpdates property at all', () => {
      const state = {
        countries: [{
          code: 'ARG',
          name: 'Argentina',
          group: 'A',
          stickers: [{ number: 1, count: 0 }]
        }],
        selectedGroupFilter: 'all',
        selectedStatusFilter: 'all',
        searchText: ''
        // no pendingUpdates property
      }
      expect(() => helpers.getVisibleCountries(state)).not.toThrow()
      const result = helpers.getVisibleCountries(state)
      expect(result[0].stickers[0].hasPendingChange).toBe(false)
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
          name: 'Argentina',
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
    test('updates sticker count', () => {
      const state = {
        countries: [{
          code: 'MEX',
          stickers: [{ number: 3, count: 3, hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [{ code: 'MEX', stickers: [{ number: 3, count: 2 }] }])
      const sticker = state.countries[0].stickers[0]
      expect(sticker.count).toBe(2)
      expect(sticker.hasPendingChange).toBe(false)
    })
    test('updates multiple stickers for one country', () => {
      const state = {
        countries: [
          {
            code: 'ARG',
            stickers:
              [
                {
                  number: 1,
                  count: 0,
                  hasPendingChange: true
                }, { number: 2, count: 1, hasPendingChange: true }
              ]
          }]
      }
      helpers.commitPendingUpdates(state, [
        { code: 'ARG', stickers: [{ number: 1, count: 2 }, { number: 2, count: 0 }] }
      ])
      expect(state.countries[0].stickers[0].count).toBe(2)
      expect(state.countries[0].stickers[1].count).toBe(0)
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(false)
      expect(state.countries[0].stickers[1].hasPendingChange).toBe(false)
    })
    test('updates stickers across multiple countries', () => {
      const state = {
        countries: [
          { code: 'ARG', stickers: [{ number: 1, count: 0, hasPendingChange: true }] },
          { code: 'BRA', stickers: [{ number: 2, count: 1, hasPendingChange: true }] }
        ]
      }
      helpers.commitPendingUpdates(state, [
        { code: 'ARG', stickers: [{ number: 1, count: 2 }] },
        { code: 'BRA', stickers: [{ number: 2, count: 0 }] }
      ])
      expect(state.countries[0].stickers[0].count).toBe(2)
      expect(state.countries[1].stickers[0].count).toBe(0)
    })
    test('ignores unknown country', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 1, hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [{ code: 'BRA', stickers: [{ number: 1, count: 5 }] }])
      expect(state.countries[0].stickers[0].count).toBe(1)
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(true)
    })
    test('ignores unknown sticker', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 1, hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [{ code: 'ARG', stickers: [{ number: 99, count: 4 }] }])
      expect(state.countries[0].stickers[0].count).toBe(1)
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(true)
    })
    test('handles empty updates', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 1, hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [])
      expect(state.countries[0].stickers[0].count).toBe(1)
      expect(state.countries[0].stickers[0].hasPendingChange).toBe(true)
    })
    test('continues processing after skipping an invalid update', () => {
      const state = {
        countries: [{
          code: 'ARG',
          stickers: [{ number: 1, count: 0, hasPendingChange: true }]
        }]
      }
      helpers.commitPendingUpdates(state, [
        { code: 'XXX', stickers: [{ number: 1, count: 9 }] },
        { code: 'ARG', stickers: [{ number: 1, count: 2 }] }
      ])
      expect(state.countries[0].stickers[0].count).toBe(2)
    })
  })
})
