// test/QuickEntryDialogHelpers.unit.test.js

const { helpers } = require('../build/QuickEntryDialogRender.html.js')

const {
  getStickerCountClass,
  getStickerColorClass,
  chunkStickers,
  buildCountryHeaderText
} = helpers

describe('Render helpers', () => {
  test('getStickerCountClass maps correctly', () => {
    expect(getStickerCountClass(0)).toBe('count-0')
    expect(getStickerCountClass(5)).toBe('count-5-plus')
  })
  test('getStickerColorClass maps correctly', () => {
    expect(getStickerColorClass(0)).toBe('count-0')
    expect(getStickerColorClass(3)).toBe('count-3')
    expect(getStickerColorClass(10)).toBe('count-5-plus')
  })
  test('chunkStickers splits correctly', () => {
    const input = [1, 2, 3, 4, 5]
    expect(chunkStickers(input, 2)).toEqual([[1, 2], [3, 4], [5]])
  })
  test('buildCountryHeaderText formats correctly', () => {
    expect(buildCountryHeaderText({ code: 'ARG' })).toBe('ARG')
    expect(buildCountryHeaderText({ code: 'ARG', group: 'A' })).toBe('ARG · A')
  })
})
