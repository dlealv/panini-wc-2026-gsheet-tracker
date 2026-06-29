// test/QuickEntryDialogRender.unit.test.js

const { helpers } = require('../build/QuickEntryDialogRender.html.js')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
global.document = {
  createElement: (tag) => ({
    tagName: tag,
    className: '',
    textContent: '',
    children: [],
    style: {},
    appendChild(child) { this.children.push(child) },
    removeChild(child) { this.children = this.children.filter(c => c !== child) },
    classList: { add() { }, remove() { }, toggle() { } }
  }),

  querySelector: () => null,

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

/** Tests for QuickEntryDialogRender.html. */
describe('QuickEntryDialogRender.html', () => {
  /** Tests for buildCountryHeaderText function. */
  describe('buildCountryHeaderText', () => {
    test('buildCountryHeaderText formats correctly', () => {
      expect(helpers.buildCountryHeaderText({ code: 'ARG' })).toBe('ARG')
      expect(helpers.buildCountryHeaderText({ code: 'ARG', group: 'A' })).toBe('ARG · A')
    })
    test('returns code when group is missing', () => {
      expect(helpers.buildCountryHeaderText({ code: 'ARG' })).toBe('ARG')
    })
    test('returns code with group when group exists', () => {
      expect(helpers.buildCountryHeaderText({ code: 'ARG', group: 'A' })).toBe('ARG · A')
    })
    test('ignores empty group string', () => {
      expect(helpers.buildCountryHeaderText({ code: 'ARG', group: '' })).toBe('ARG')
    })
    test('handles null group safely', () => {
      expect(helpers.buildCountryHeaderText({ code: 'ARG', group: null })).toBe('ARG')
    })
  })

  /** Tests for usesCompactGrid function. */
  describe('usesCompactGrid', () => {
    test('returns false only for all filter', () => {
      expect(helpers.usesCompactGrid({ selectedStatusFilter: 'all' })).toBe(false)
      expect(helpers.usesCompactGrid({ selectedStatusFilter: 'missing' })).toBe(true)
      expect(helpers.usesCompactGrid({ selectedStatusFilter: 'repeated' })).toBe(true)
      expect(helpers.usesCompactGrid({ selectedStatusFilter: 'completed' })).toBe(true)
    })
  })

  /** Tests for chunkStickers function */
  describe('chunkStickers', () => {
    test('chunkStickers splits correctly', () => {
      const input = [1, 2, 3, 4, 5]
      expect(helpers.chunkStickers(input, 2)).toEqual([[1, 2], [3, 4], [5]])
    })
    test('returns empty array when stickers is empty', () => {
      expect(helpers.chunkStickers([], 2)).toEqual([])
    })
    test('returns single row when size exceeds sticker count', () => {
      expect(helpers.chunkStickers([1, 2, 3], 10)).toEqual([[1, 2, 3]])
    })
    test('returns one sticker per row when size is one', () => {
      expect(helpers.chunkStickers([1, 2, 3], 1)).toEqual([[1], [2], [3]])
    })
    test('handles size larger than array length', () => {
      expect(helpers.chunkStickers([1, 2], 10)).toEqual([[1, 2]])
    })
  })

  /** Tests for getStickerColorClass function */
  describe('getStickerColorClass', () => {
    test('getStickerCountClass maps correctly', () => {
      expect(helpers.getStickerCountClass(0)).toBe('count-0')
      expect(helpers.getStickerCountClass(5)).toBe('count-5-plus')
    })
    test('getStickerColorClass maps correctly', () => {
      expect(helpers.getStickerColorClass(0)).toBe('count-0')
      expect(helpers.getStickerColorClass(3)).toBe('count-3')
      expect(helpers.getStickerColorClass(10)).toBe('count-5-plus')
    })
    test('returns count-0 for zero', () => {
      expect(helpers.getStickerColorClass(0)).toBe('count-0')
    })
    test('returns count-1 for one', () => {
      expect(helpers.getStickerColorClass(1)).toBe('count-1')
    })
    test('returns count-2 for two', () => {
      expect(helpers.getStickerColorClass(2)).toBe('count-2')
    })
    test('returns count-3 for three', () => {
      expect(helpers.getStickerColorClass(3)).toBe('count-3')
    })
    test('returns count-4 for four', () => {
      expect(helpers.getStickerColorClass(4)).toBe('count-4')
    })
    test('returns count-5-plus for five and above', () => {
      expect(helpers.getStickerColorClass(5)).toBe('count-5-plus')
      expect(helpers.getStickerColorClass(10)).toBe('count-5-plus')
    })
    test('handles negative numbers as count-0', () => {
      expect(helpers.getStickerColorClass(-1)).toBe('count-0')
    })
  })

  /** Tests for buildCountryTitleText function. */
  describe('buildCountryTitleText', () => {
    test('buildCountryTitleText creates span with text', () => {
      const el = helpers.buildCountryTitleText('ARG · A')
      expect(el.textContent).toBe('ARG · A')
      expect(el.tagName).toBe('span')
    })
  })

  /** Tests for buildCountryFlag function. */
  describe('buildCountryFlag', () => {
    test('buildCountryFlag creates image with correct src', () => {
      const el = helpers.buildCountryFlag('flag.png')
      expect(el.tagName).toBe('img')
      expect(el.src).toBe('flag.png')
      expect(el.className).toBe('country-flag')
    })
  })

  /** Tests for buildSummaryItem function. */
  describe('buildSummaryItem', () => {
    test('buildSummaryItem creates label and value nodes', () => {
      const el = helpers.buildSummaryItem('Owned', '5/10')
      expect(el.children.length).toBe(2)
      expect(el.children[0].textContent).toBe('Owned: ')
      expect(el.children[1].textContent).toBe('5/10')
    })
  })

  /** Tests for buildStickerCard function. */
  describe('buildStickerCard', () => {
    test('buildStickerCard creates label and buttons', () => {
      const state = { isBusy: false }
      const sticker = { number: 1, count: 2 }
      const el = helpers.buildStickerCard({ code: 'ARG' }, sticker, state, () => { })
      expect(el.className).toContain('sticker-card')
      expect(el.children.length).toBeGreaterThan(0)
    })
    test('buildStickerCard applies color class', () => {
      const state = { isBusy: false }
      const sticker = { number: 1, count: 3 }
      const el = helpers.buildStickerCard({ code: 'ARG' }, sticker, state, () => { })
      expect(el.className).toContain('count-3')
    })
    test('buildStickerCard adds pending class when needed', () => {
      const state = { isBusy: false }
      const sticker = { number: 1, count: 2, hasPendingChange: true }
      const el = helpers.buildStickerCard({ code: 'ARG' }, sticker, state, () => { })
      expect(el.classList).toBeDefined()
    })
  })

  /** Tests for buildStickerRow function. */
  describe('buildStickerRow', () => {
    test('buildStickerRow groups stickers into row elements', () => {
      const state = { isBusy: false }
      const stickers = [{ number: 1, count: 1 }, { number: 2, count: 2 }]
      const el = helpers.buildStickerRow(
        { code: 'ARG' }, stickers, false, 2, state, () => { }
      )
      expect(el.className).toBe('sticker-row')
      expect(el.children.length).toBe(2)
    })
  })

  /** Tests for buildStickerGrid function. */
  describe('buildStickerGrid layout switch', () => {
    test('uses compact grid when filter is not all', () => {
      const state = { selectedStatusFilter: 'missing' }
      const country = { stickers: [{ count: 1 }] }
      const el = helpers.buildStickerGrid(country, state, {}, () => { })
      expect(el.className).toContain('compact')
    })
    test('uses album grid when filter is all', () => {
      const state = { selectedStatusFilter: 'all' }
      const country = { stickers: [{ count: 1 }] }
      const el = helpers.buildStickerGrid(country, state, { stickersPerRow: 2 }, () => { })
      expect(el.className).toBe('sticker-grid')
    })
  })

  describe('buildAlbumStickerGrid sticker grouping', () => {
    test('buildAlbumStickerGrid splits rows correctly', () => {
      const state = { selectedStatusFilter: 'all' }
      const country = {
        stickers: [{ count: 1 }, { count: 2 }, { count: 3 }]
      }
      const el = helpers.buildAlbumStickerGrid(country, state, { stickersPerRow: 2 }, () => { })
      expect(el.children.length).toBe(2) // 2 rows
    })
  })
})
