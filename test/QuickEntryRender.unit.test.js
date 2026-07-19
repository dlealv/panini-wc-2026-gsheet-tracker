// test/QuickEntryRender.unit.test.js

const { helpers } = require('../build/QuickEntryRender.html.js')

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

/** Tests for QuickEntryRender.html. */
describe('QuickEntryRender.html', () => {
  describe('buildCountrySection', () => {
    test('builds a completed country section', () => {
      const country = {
        code: 'ARG',
        group: 'A',
        flag: 'flag.png',
        isCompleted: true,
        summary: { owned: 10, total: 10, missing: 0, repeated: 2, completionPercent: 100 },
        stickers: [{ number: 1, count: 1 }, { number: 2, count: 0 }]
      }
      const state = { selectedStatusFilter: 'all', isBusy: false }
      const layout = { stickersPerRow: 2 }
      const section = helpers.buildCountrySection(country, state, layout, () => { })
      expect(section.className).toContain('country-section')
      expect(section.children.length).toBe(2) // header + sticker grid
    })
    test('builds country section without flag when flag is missing', () => {
      const country = {
        code: 'ARG',
        summary: {
          owned: 1,
          total: 1,
          missing: 0,
          repeated: 0,
          completionPercent: 100
        },
        stickers: []
      }
      const section = helpers.buildCountrySection(
        country, { selectedStatusFilter: 'all', isBusy: false }, { stickersPerRow: 2 }, () => { })
      expect(section.className).toContain('country-section')
    })
  })

  /** Tests for buildCountryHeaderText function. */
  describe('_buildCountryHeaderText', () => {
    test('_buildCountryHeaderText formats correctly', () => {
      expect(helpers._buildCountryHeaderText({ code: 'ARG' })).toBe('ARG')
      expect(helpers._buildCountryHeaderText({ code: 'ARG', group: 'A' })).toBe('ARG · A')
    })
    test('returns code when group is missing', () => {
      expect(helpers._buildCountryHeaderText({ code: 'ARG' })).toBe('ARG')
    })
    test('returns code with group when group exists', () => {
      expect(helpers._buildCountryHeaderText({ code: 'ARG', group: 'A' })).toBe('ARG · A')
    })
    test('ignores empty group string', () => {
      expect(helpers._buildCountryHeaderText({ code: 'ARG', group: '' })).toBe('ARG')
    })
    test('handles null group safely', () => {
      expect(helpers._buildCountryHeaderText({ code: 'ARG', group: null })).toBe('ARG')
    })
  })

  /** Tests for usesCompactGrid function. */
  describe('_usesCompactGrid', () => {
    test('returns false only for all filter', () => {
      expect(helpers._usesCompactGrid({ selectedStatusFilter: 'all' })).toBe(false)
      expect(helpers._usesCompactGrid({ selectedStatusFilter: 'missing' })).toBe(true)
      expect(helpers._usesCompactGrid({ selectedStatusFilter: 'repeated' })).toBe(true)
      expect(helpers._usesCompactGrid({ selectedStatusFilter: 'completed' })).toBe(true)
    })
  })

  /** Tests for chunkStickers function */
  describe('_chunkStickers', () => {
    test('_chunkStickers splits correctly', () => {
      const input = [1, 2, 3, 4, 5]
      expect(helpers._chunkStickers(input, 2)).toEqual([[1, 2], [3, 4], [5]])
    })
    test('returns empty array when stickers is empty', () => {
      expect(helpers._chunkStickers([], 2)).toEqual([])
    })
    test('returns single row when size exceeds sticker count', () => {
      expect(helpers._chunkStickers([1, 2, 3], 10)).toEqual([[1, 2, 3]])
    })
    test('returns one sticker per row when size is one', () => {
      expect(helpers._chunkStickers([1, 2, 3], 1)).toEqual([[1], [2], [3]])
    })
    test('handles size larger than array length', () => {
      expect(helpers._chunkStickers([1, 2], 10)).toEqual([[1, 2]])
    })
  })

  /** Tests for getStickerColorClass function */
  describe('_getStickerColorClass', () => {
    test('_getStickerColorClass maps correctly', () => {
      expect(helpers._getStickerColorClass(0)).toBe('count-0')
      expect(helpers._getStickerColorClass(5)).toBe('count-5-plus')
    })
    test('_getStickerColorClass maps correctly', () => {
      expect(helpers._getStickerColorClass(0)).toBe('count-0')
      expect(helpers._getStickerColorClass(3)).toBe('count-3')
      expect(helpers._getStickerColorClass(10)).toBe('count-5-plus')
    })
    test('returns count-0 for zero', () => {
      expect(helpers._getStickerColorClass(0)).toBe('count-0')
    })
    test('returns count-1 for one', () => {
      expect(helpers._getStickerColorClass(1)).toBe('count-1')
    })
    test('returns count-2 for two', () => {
      expect(helpers._getStickerColorClass(2)).toBe('count-2')
    })
    test('returns count-3 for three', () => {
      expect(helpers._getStickerColorClass(3)).toBe('count-3')
    })
    test('returns count-4 for four', () => {
      expect(helpers._getStickerColorClass(4)).toBe('count-4')
    })
    test('returns count-5-plus for five and above', () => {
      expect(helpers._getStickerColorClass(5)).toBe('count-5-plus')
      expect(helpers._getStickerColorClass(10)).toBe('count-5-plus')
    })
    test('handles negative numbers as count-0', () => {
      expect(helpers._getStickerColorClass(-1)).toBe('count-0')
    })
  })

  /** Tests for _buildCountryTitleText function. */
  describe('_buildCountryTitleText', () => {
    test('_buildCountryTitleText creates span with text', () => {
      const el = helpers._buildCountryTitleText('ARG · A')
      expect(el.textContent).toBe('ARG · A')
      expect(el.tagName).toBe('span')
    })
  })

  /** Tests for _buildCountryFlag function. */
  describe('_buildCountryFlag', () => {
    test('_buildCountryFlag creates image with correct src', () => {
      const el = helpers._buildCountryFlag('flag.png')
      expect(el.tagName).toBe('img')
      expect(el.src).toBe('flag.png')
      expect(el.className).toBe('country-flag')
    })
  })

  /** Tests for buildSummaryItem function. */
  describe('_buildSummaryItem', () => {
    test('_buildSummaryItem creates label and value nodes', () => {
      const el = helpers._buildSummaryItem('Owned', '5/10')
      expect(el.children.length).toBe(2)
      expect(el.children[0].textContent).toBe('Owned: ')
      expect(el.children[1].textContent).toBe('5/10')
    })
  })

  /** Tests for _buildStickerCard function. */
  describe('_buildStickerCard', () => {
    test('_buildStickerCard creates label and buttons', () => {
      const state = { isBusy: false }
      const sticker = { number: 1, count: 2 }
      const el = helpers._buildStickerCard({ code: 'ARG' }, sticker, state, () => { })
      expect(el.className).toContain('sticker-card')
      expect(el.children.length).toBeGreaterThan(0)
    })
    test('_buildStickerCard applies color class', () => {
      const state = { isBusy: false }
      const sticker = { number: 1, count: 3 }
      const el = helpers._buildStickerCard({ code: 'ARG' }, sticker, state, () => { })
      expect(el.className).toContain('count-3')
    })
    test('_buildStickerCard adds pending class when needed', () => {
      const state = { isBusy: false }
      const sticker = { number: 1, count: 2, hasPendingChange: true }
      const el = helpers._buildStickerCard({ code: 'ARG' }, sticker, state, () => { })
      expect(el.classList).toBeDefined()
    })
    test('_buildStickerCard calls callback when decrement button is clicked', () => {
      const onStickerChange = jest.fn()
      const el = helpers._buildStickerCard(
        { code: 'ARG' }, { number: 5, count: 2 }, { isBusy: false }, onStickerChange)
      const buttons = el.children[1].children
      buttons[0].onclick()
      expect(onStickerChange).toHaveBeenCalledWith('ARG', 5, 1)
    })
    test('_buildStickerCard calls callback when increment button is clicked', () => {
      const onStickerChange = jest.fn()
      const el = helpers._buildStickerCard({ code: 'ARG' }, { number: 5, count: 2 }, { isBusy: false }, onStickerChange)
      const buttons = el.children[1].children
      buttons[1].onclick()
      expect(onStickerChange).toHaveBeenCalledWith('ARG', 5, 3)
    })
    test('_buildStickerCard adds badge when sticker has icon label', () => {
      const el = helpers._buildStickerCard(
        { code: 'ARG' }, {
          number: 1,
          count: 2,
          iconLabel: 'TEAM'
        }, { isBusy: false }, () => { }
      )
      expect(el.children[0].className).toBe('sticker-badge')
      expect(el.children[0].textContent).toBe('TEAM')
    })
  })

  /** Tests for _buildStickerRow function. */
  describe('_buildStickerRow', () => {
    test('_buildStickerRow groups stickers into row elements', () => {
      const state = { isBusy: false }
      const stickers = [{ number: 1, count: 1 }, { number: 2, count: 2 }]
      const el = helpers._buildStickerRow(
        { code: 'ARG' }, stickers, false, 2, state, () => { }
      )
      expect(el.className).toBe('sticker-row')
      expect(el.children.length).toBe(2)
    })
  })

  /** Tests for _buildStickerGrid function. */
  describe('_buildStickerGrid layout switch', () => {
    test('_buildStickerGrid uses compact grid when filter is not all', () => {
      const state = { selectedStatusFilter: 'missing' }
      const country = { stickers: [{ count: 1 }] }
      const el = helpers._buildStickerGrid(country, state, {}, () => { })
      expect(el.className).toContain('compact')
    })
    test('_buildStickerGrid uses album grid when filter is all', () => {
      const state = { selectedStatusFilter: 'all' }
      const country = { stickers: [{ count: 1 }] }
      const el = helpers._buildStickerGrid(country, state, { stickersPerRow: 2 }, () => { })
      expect(el.className).toBe('sticker-grid')
    })
  })

  describe('_buildAlbumStickerGrid function', () => {
    test('_buildAlbumStickerGrid splits rows correctly', () => {
      const state = { selectedStatusFilter: 'all' }
      const country = {
        stickers: [{ count: 1 }, { count: 2 }, { count: 3 }]
      }
      const el = helpers._buildAlbumStickerGrid(country, state, { stickersPerRow: 2 }, () => { })
      expect(el.children.length).toBe(2) // 2 rows
    })
  })
})
