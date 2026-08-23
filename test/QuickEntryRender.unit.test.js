// test/QuickEntryRender.unit.test.js

const { helpers } = require('../build/QuickEntryRender.html.js')
const { initTestKernel } = require('./utils/testKernel.js')
const { QuickEntryService } = require('../build/QuickEntryService.js')

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

/**
 * Tests for QuickEntryRender.html.
 * Every function in this file - including the private (underscore-prefixed) rendering helpers - is exercised
 * exclusively through the public buildCountrySection() entry point below, never called directly. The
 * findByClass()/findAllByClass()/getTitleText() helpers navigate its rendered DOM-mock output instead of
 * hardcoding child indices, so a test doesn't depend on which private function happens to build which part
 * of the tree - only on what buildCountrySection() actually renders, which is its real contract.
 */

/**
 * Recursively finds descendant nodes (via the DOM mock's children arrays) whose className includes the given
 * class, depth-first in document order. Used instead of hardcoded child indices, which would silently break
 * (or worse, silently drift to asserting the wrong node) if the rendering functions ever restructure the tree.
 */
function findAllByClass(root, className) {
  const matches = []
  const visit = (node) => {
    if (!node) return
    if ((node.className || '').split(' ').includes(className)) matches.push(node)
    ; (node.children || []).forEach(visit)
  }
  visit(root)
  return matches
}

/** Returns the first descendant with the given class, or undefined if none exists. */
function findByClass(root, className) {
  return findAllByClass(root, className)[0]
}

/**
 * The country title's full rendered text. The flag image (when present) has no textContent, so joining every
 * child's textContent reads as just the header text regardless of whether a flag is rendered alongside it.
 */
function getTitleText(section) {
  return findByClass(section, 'country-title').children.map(c => c.textContent).join('')
}

/**
 * Minimal country fixture - buildCountrySection() reads country.summary unconditionally, so every test needs
 * one even when the summary values themselves aren't under test.
 */
function baseCountry(overrides = {}) {
  return {
    code: 'ARG',
    summary: { owned: 0, total: 0, missing: 0, repeated: 0, completionPercent: 0 },
    stickers: [],
    ...overrides
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
        summary: { owned: 1, total: 1, missing: 0, repeated: 0, completionPercent: 100 },
        stickers: []
      }
      const section = helpers.buildCountrySection(
        country, { selectedStatusFilter: 'all', isBusy: false }, { stickersPerRow: 2 }, () => { })
      expect(section.className).toContain('country-section')
      expect(findByClass(section, 'country-flag')).toBeUndefined()
    })
    test('renders the flag image when the country has a flag', () => {
      const section = helpers.buildCountrySection(
        baseCountry({ flag: 'flag.png' }), { selectedStatusFilter: 'all' }, {}, () => { })
      const flag = findByClass(section, 'country-flag')
      expect(flag.tagName).toBe('img')
      expect(flag.src).toBe('flag.png')
    })

    /** Covers _buildCountryHeaderText() and _buildCountryTitleText(), only observable through the title text. */
    describe('country title text', () => {
      test('renders just the country code when no group is set', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ code: 'ARG' }), { selectedStatusFilter: 'all' }, {}, () => { })
        expect(getTitleText(section)).toBe('ARG')
      })
      test('renders code and group separated by · when group is set', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ code: 'ARG', group: 'A' }), { selectedStatusFilter: 'all' }, {}, () => { })
        expect(getTitleText(section)).toBe('ARG · A')
      })
      test('ignores an empty group string and renders just the code', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ code: 'ARG', group: '' }), { selectedStatusFilter: 'all' }, {}, () => { })
        expect(getTitleText(section)).toBe('ARG')
      })
      test('handles a null group safely and renders just the code', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ code: 'ARG', group: null }), { selectedStatusFilter: 'all' }, {}, () => { })
        expect(getTitleText(section)).toBe('ARG')
      })
    })

    /** Covers _buildSummaryItem(), called once per summary metric. */
    describe('summary section', () => {
      test('renders owned, missing, repeated, and completion percent', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ summary: { owned: 5, total: 10, missing: 3, repeated: 2, completionPercent: 50 } }), { selectedStatusFilter: 'all' }, {}, () => { }
        )
        const summaryEl = findByClass(section, 'country-summary')
        expect(summaryEl.children).toHaveLength(4)
        const [owned, missing, repeated, complete] = summaryEl.children
        expect(owned.children[0].textContent).toBe('Owned: ')
        expect(owned.children[1].textContent).toBe('5/10')
        expect(missing.children[0].textContent).toBe('Missing: ')
        expect(missing.children[1].textContent).toBe('3')
        expect(repeated.children[0].textContent).toBe('Repeated: ')
        expect(repeated.children[1].textContent).toBe('2')
        expect(complete.children[0].textContent).toBe('Complete: ')
        expect(complete.children[1].textContent).toBe('50%')
      })
    })

    /** Covers _buildStickerGrid() and _usesCompactGrid() - the compact-vs-album dispatch. */
    describe('sticker grid layout', () => {
      test('renders the standard album grid when the status filter is "all"', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ stickers: [{ number: 1, count: 1 }] }), { selectedStatusFilter: 'all' }, { stickersPerRow: 2 }, () => { })
        expect(section.children[1].className).toBe('sticker-grid')
      })
      test('renders a compact grid when the status filter is "missing"', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ stickers: [{ number: 1, count: 1 }] }), { selectedStatusFilter: 'missing' }, {}, () => { })
        expect(section.children[1].className).toBe('sticker-grid compact')
      })
      test('renders a compact grid for any non-"all" status filter', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ stickers: [{ number: 1, count: 1 }] }), { selectedStatusFilter: 'repeated' }, {}, () => { })
        expect(section.children[1].className).toBe('sticker-grid compact')
      })
    })

    /** Covers _buildAlbumStickerGrid(), _buildStickerRow(), and _chunkStickers() - the album row layout. */
    describe('album grid rows', () => {
      function rowSizes(section) {
        return section.children[1].children.map(row => row.children.length)
      }
      test('splits stickers into full rows with a smaller last row', () => {
        const stickers = [1, 2, 3, 4, 5].map(n => ({ number: n, count: 1 }))
        const section = helpers.buildCountrySection(
          baseCountry({ stickers }), { selectedStatusFilter: 'all' }, { stickersPerRow: 2 }, () => { })
        expect(rowSizes(section)).toEqual([2, 2, 1])
      })
      test('returns no rows when the country has no stickers', () => {
        const section = helpers.buildCountrySection(
          baseCountry({ stickers: [] }), { selectedStatusFilter: 'all' }, { stickersPerRow: 2 }, () => { })
        expect(section.children[1].children).toHaveLength(0)
      })
      test('puts all stickers in one row when stickersPerRow exceeds the sticker count', () => {
        const stickers = [1, 2, 3].map(n => ({ number: n, count: 1 }))
        const section = helpers.buildCountrySection(
          baseCountry({ stickers }), { selectedStatusFilter: 'all' }, { stickersPerRow: 10 }, () => { })
        expect(rowSizes(section)).toEqual([3])
      })
      test('puts one sticker per row when stickersPerRow is one', () => {
        const stickers = [1, 2, 3].map(n => ({ number: n, count: 1 }))
        const section = helpers.buildCountrySection(
          baseCountry({ stickers }), { selectedStatusFilter: 'all' }, { stickersPerRow: 1 }, () => { })
        expect(rowSizes(section)).toEqual([1, 1, 1])
      })
      test('defaults to 8 stickers per row when layout does not specify stickersPerRow', () => {
        const stickers = Array.from({ length: 9 }, (_, i) => ({ number: i + 1, count: 1 }))
        const section = helpers.buildCountrySection(
          baseCountry({ stickers }), { selectedStatusFilter: 'all' }, {}, () => { })
        expect(rowSizes(section)).toEqual([8, 1])
      })
    })

    /**
     * Covers _buildStickerCard() and _getStickerColorClass() - a single sticker keeps the card unambiguous
     * to find regardless of which grid layout builds it.
     */
    describe('sticker cards', () => {
      function buildCardSection(sticker, countryOverrides = {}, state = { selectedStatusFilter: 'all', isBusy: false }, onStickerChange = () => { }) {
        return helpers.buildCountrySection(
          baseCountry({ stickers: [sticker], ...countryOverrides }), state, { stickersPerRow: 8 }, onStickerChange
        )
      }
      test('applies the count-0 color class for zero stickers', () => {
        const section = buildCardSection({ number: 1, count: 0 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-0')
      })
      test('applies the count-1 color class for one sticker', () => {
        const section = buildCardSection({ number: 1, count: 1 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-1')
      })
      test('applies the count-2 color class for two stickers', () => {
        const section = buildCardSection({ number: 1, count: 2 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-2')
      })
      test('applies the count-3 color class for three stickers', () => {
        const section = buildCardSection({ number: 1, count: 3 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-3')
      })
      test('applies the count-4 color class for four stickers', () => {
        const section = buildCardSection({ number: 1, count: 4 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-4')
      })
      test('applies the count-5-plus color class for five stickers', () => {
        const section = buildCardSection({ number: 1, count: 5 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-5-plus')
      })
      test('applies the count-5-plus color class for counts above five', () => {
        const section = buildCardSection({ number: 1, count: 10 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-5-plus')
      })
      test('treats a negative count as count-0', () => {
        const section = buildCardSection({ number: 1, count: -1 })
        expect(findByClass(section, 'sticker-card').className).toContain('count-0')
      })
      test('renders a badge with the country icon label when one exists for this sticker', () => {
        const section = buildCardSection({ number: 1, count: 2 }, { iconLabels: { 1: 'TEAM' } })
        const badge = findByClass(findByClass(section, 'sticker-card'), 'sticker-badge')
        expect(badge.textContent).toBe('TEAM')
      })
      test('omits the badge when no icon label exists for this sticker', () => {
        const section = buildCardSection({ number: 5, count: 2 }, { iconLabels: { 1: 'CREST' } })
        expect(findByClass(findByClass(section, 'sticker-card'), 'sticker-badge')).toBeUndefined()
      })
      test('builds the sticker label text from its number and count', () => {
        const section = buildCardSection({ number: 5, count: 2 })
        const card = findByClass(section, 'sticker-card')
        expect(findByClass(card, 'sticker-label').textContent).toBe('5 (2)')
      })
      test('calls the change callback with count-1 when the decrement button is clicked', () => {
        const onStickerChange = jest.fn()
        const section = buildCardSection({ number: 5, count: 2 }, {}, { selectedStatusFilter: 'all', isBusy: false }, onStickerChange)
        const [decrementButton] = findAllByClass(findByClass(section, 'sticker-card'), 'btn-sticker')
        decrementButton.onclick()
        expect(onStickerChange).toHaveBeenCalledWith('ARG', 5, 1)
      })
      test('calls the change callback with count+1 when the increment button is clicked', () => {
        const onStickerChange = jest.fn()
        const section = buildCardSection({ number: 5, count: 2 }, {}, { selectedStatusFilter: 'all', isBusy: false }, onStickerChange)
        const [, incrementButton] = findAllByClass(findByClass(section, 'sticker-card'), 'btn-sticker')
        incrementButton.onclick()
        expect(onStickerChange).toHaveBeenCalledWith('ARG', 5, 3)
      })
      test('disables the decrement button when count is zero', () => {
        const section = buildCardSection({ number: 5, count: 0 })
        const [decrementButton, incrementButton] = findAllByClass(findByClass(section, 'sticker-card'), 'btn-sticker')
        expect(decrementButton.disabled).toBe(true)
        expect(incrementButton.disabled).toBe(false)
      })
    })
  })
})

/**
 * Cross-layer integration scenarios: feeds a real country view model produced by
 * QuickEntryService.getInitialData() (backend) into QuickEntryRender.buildCountrySection() (UI), end-to-end.
 * Isolated unit tests on each side independently assert against the *documented* view-model shape
 * ({code, name, stickers:[{number,count}], iconLabels, summary, isCompleted}), but neither one calls the other -
 * this is the one test that would catch the two layers silently drifting apart (e.g. a field renamed on one side
 * only, or a shape change like the {number,count}/iconLabels split not being carried through to the renderer).
 */
describe('QuickEntryService/QuickEntryRender integration scenarios', () => {
  let service

  beforeEach(() => {
    initTestKernel()
    service = new QuickEntryService()
  })

  test('backend country view model renders correctly in the UI', () => {
    const data = service.getInitialData()
    const mexCountry = data.countries.find(c => c.code === 'MEX')
    const state = { selectedStatusFilter: 'all', isBusy: false }
    const layout = { stickersPerRow: 5 }

    const section = helpers.buildCountrySection(mexCountry, state, layout, () => { })

    expect(section.className).toContain('country-section')
    // MEX is a team country - _buildIconLabels() always includes sticker 1 (CREST), regardless of counts,
    // and _buildStickerCard() must find it via country.iconLabels[sticker.number], not a per-sticker field.
    const grid = section.children[1]
    const stickerOneCard = grid.children[0].children ? grid.children[0].children[0] : grid.children[0]
    expect(stickerOneCard.children[0].className).toBe('sticker-badge')
    expect(stickerOneCard.children[0].textContent).toBe('CREST')
  })
})
