// test/TradeHelpers.unit.test.js

/** Unit tests for TradeHelpers. */

const { helpers } = require('../build/TradeHelpers.html.js')

describe('TradeHelpers unit tests', () => {
  /** Builds backend payload from current trade UI state. */
  describe('getPayload()', () => {
    test('returns trade options from UI state', () => {
      const result = helpers.getPayload({
        sortMissingCheckbox: { checked: true },
        receiveLimitSelect: { value: '3' },
        sendLimitSelect: { value: '2' }
      })
      expect(result).toEqual({ sortMissing: true, maxStickerReceive: 3, maxStickerSend: 2 })
    })
    test('returns false and zero values when controls are unchecked or empty', () => {
      const result = helpers.getPayload({
        sortMissingCheckbox: { checked: false },
        receiveLimitSelect: { value: '0' },
        sendLimitSelect: { value: '0' }
      })
      expect(result).toEqual({ sortMissing: false, maxStickerReceive: 0, maxStickerSend: 0 })
    })
  })

  /** Sets busy state for trade dialog controls. */
  describe('setBusy()', () => {
    test('disables buttons and trade controls when busy', () => {
      const buttons = [{ disabled: false }, { disabled: false }]
      const controls = [{ disabled: false }, { disabled: false }, { disabled: false }]
      const docMock = { querySelectorAll: jest.fn(() => buttons) }
      helpers.setBusy(true, { document: docMock, controls })
      buttons.forEach(button => { expect(button.disabled).toBe(true) })
      controls.forEach(control => {
        expect(control.disabled).toBe(true)
      })
    })
    test('enables buttons and trade controls when not busy', () => {
      const buttons = [{ disabled: true }, { disabled: true }]
      const controls = [{ disabled: true }, { disabled: true }]
      const docMock = { querySelectorAll: jest.fn(() => buttons) }
      helpers.setBusy(false, { document: docMock, controls })
      buttons.forEach(button => {
        expect(button.disabled).toBe(false)
      })
      controls.forEach(control => {
        expect(control.disabled).toBe(false)
      })
    })
    test('ignores null controls while updating busy state', () => {
      const buttons = [{ disabled: false }]
      const docMock = { querySelectorAll: jest.fn(() => buttons) }
      helpers.setBusy(true, { document: docMock, controls: [null, { disabled: false }] })
      expect(buttons[0].disabled).toBe(true)
    })
  })
})
