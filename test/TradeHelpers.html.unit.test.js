// test/TradeHelpers.unit.test.js

/** Unit tests for TradeHelpers. */

const { helpers } = require('../build/TradeHelpers.html.js')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
global.document = {
  createElement: () => ({
    className: '',
    textContent: ''
  }),
  getElementById: () => null
}

describe('TradeHelpers unit tests', () => {
  /** Builds backend payload from current trade UI state. */
  describe('getPayload()', () => {
    test('returns trade options from UI state', () => {
      const result = helpers.getPayload({
        sortModeSelect: { value: 'completion' },
        receiveLimitSelect: { value: '3' },
        sendLimitSelect: { value: '2' }
      })
      expect(result).toEqual({ sortMode: 'completion', maxStickerReceive: 3, maxStickerSend: 2 })
    })
    test('defaults to album mode for empty selector', () => {
      const result = helpers.getPayload({
        sortModeSelect: { value: '' },
        receiveLimitSelect: { value: '0' },
        sendLimitSelect: { value: '0' }
      })
      expect(result).toEqual({ sortMode: 'album', maxStickerReceive: 0, maxStickerSend: 0 })
    })
    test('defaults to album mode for invalid selector value', () => {
      const result = helpers.getPayload({
        sortModeSelect: { value: 'random-mode' },
        receiveLimitSelect: { value: '1' },
        sendLimitSelect: { value: '1' }
      })
      expect(result).toEqual({ sortMode: 'album', maxStickerReceive: 1, maxStickerSend: 1 })
    })
    test('defaults to album mode and zero limits when selectors are missing', () => {
      const result = helpers.getPayload()
      expect(result).toEqual({ sortMode: 'album', maxStickerReceive: 0, maxStickerSend: 0 })
    })
    test('returns preferences mode when selected', () => {
      const result = helpers.getPayload({
        sortModeSelect: { value: 'preferences' },
        receiveLimitSelect: { value: '5' },
        sendLimitSelect: { value: '4' }
      })
      expect(result).toEqual({
        sortMode: 'preferences',
        maxStickerReceive: 5,
        maxStickerSend: 4
      })
    })
  })

  /** Builds validation payload from trade input fields. */
  describe('getValidationPayload()', () => {
    test('returns missing and repeats text separately', () => {
      const result = helpers.getValidationPayload({
        missingText: { value: 'MEX,1,5,12-13' },
        repeatsText: { value: 'FWC,6(2),14(4)' }
      })
      expect(result).toEqual({ missingText: 'MEX,1,5,12-13', repeatsText: 'FWC,6(2),14(4)' })
    })
    test('returns only missing text when repeats is empty', () => {
      const result = helpers.getValidationPayload({
        missingText: { value: 'MEX,1,5' },
        repeatsText: { value: '' }
      })
      expect(result).toEqual({ missingText: 'MEX,1,5', repeatsText: '' })
    })
    test('returns only repeats text when missing is empty', () => {
      const result = helpers.getValidationPayload({
        missingText: { value: '' },
        repeatsText: { value: 'FWC,2(3)' }
      })
      expect(result).toEqual({ missingText: '', repeatsText: 'FWC,2(3)' })
    })
    test('trims empty spaces from input fields', () => {
      const result = helpers.getValidationPayload({
        missingText: { value: '  MEX,1  ' },
        repeatsText: { value: '  FWC,2(2)  ' }
      })
      expect(result).toEqual({ missingText: 'MEX,1', repeatsText: 'FWC,2(2)' })
    })
    test('returns empty payload when both inputs are empty', () => {
      const result = helpers.getValidationPayload({
        missingText: { value: '' },
        repeatsText: { value: '' }
      })
      expect(result).toEqual({ missingText: '', repeatsText: '' })
    })
    test('returns empty string when input elements are missing', () => {
      const result = helpers.getValidationPayload({
        missingText: null,
        repeatsText: null
      })
      expect(result).toEqual({
        missingText: '',
        repeatsText: ''
      })
    })
  })

  /** Renders trade info preview in the trade dialog. */
  describe('renderPreview()', () => {
    test('renders missing and repeats trade info', () => {
      const previewEl = { textContent: '', className: '', style: {} }
      const result = { tradeInfo: { missing: { MEX: [1, 2, 3], BRA: [5] }, repeats: { FWC: [6, 14] } } }
      helpers.renderPreview(result, { previewEl })
      expect(previewEl.className).toBe('preview')
      expect(previewEl.textContent).toBe('Repeats:\nFWC -> 6, 14\nMissing:\nMEX -> 1, 2, 3\nBRA -> 5')
      expect(previewEl.style.display).toBe('block')
    })
    test('renders empty sections when no trade data exists', () => {
      const previewEl = { textContent: 'old content', className: '', style: {} }
      helpers.renderPreview({ tradeInfo: { missing: {}, repeats: {} } }, { previewEl })
      expect(previewEl.textContent).toBe('Repeats:\n(none)\nMissing:\n(none)')
      expect(previewEl.style.display).toBe('block')
    })
    test('renders none for an empty missing section', () => {
      const previewEl = { textContent: '', className: '', style: {} }
      helpers.renderPreview({ tradeInfo: { missing: {}, repeats: { MEX: [7] } } }, { previewEl })
      expect(previewEl.textContent).toBe('Repeats:\nMEX -> 7\nMissing:\n(none)')
    })
    test('renders none for an empty repeats section', () => {
      const previewEl = { textContent: '', className: '', style: {} }
      helpers.renderPreview({ tradeInfo: { missing: { MEX: [1] }, repeats: {} } }, { previewEl })
      expect(previewEl.textContent).toBe('Repeats:\n(none)\nMissing:\nMEX -> 1')
    })
    test('does nothing when preview element is missing', () => {
      expect(() => {
        helpers.renderPreview({ tradeInfo: { missing: { MEX: [1] }, repeats: {} } })
      }).not.toThrow()
    })
    test('renders empty sections when trade info is missing', () => {
      const previewEl = { textContent: 'old content', className: '', style: {} }
      helpers.renderPreview({}, { previewEl })
      expect(previewEl.className).toBe('preview')
      expect(previewEl.textContent).toBe('Repeats:\n(none)\nMissing:\n(none)')
      expect(previewEl.style.display).toBe('block')
    })
  })

  /** Tests for clearPreview() and renderPreview() */
  describe('clearPreview()', () => {
    test('clears and hides existing preview', () => {
      const previewEl = { style: { display: 'block' }, textContent: 'old preview' }
      helpers.clearPreview({ previewEl })
      expect(previewEl.textContent).toBe('')
      expect(previewEl.style.display).toBe('none')
    })
    test('does nothing when preview element is missing', () => {
      expect(() => { helpers.clearPreview({}) }).not.toThrow()
    })
  })

  /** Sets message content and style in the trade dialog. */
  describe('setMessage()', () => {
    test('sets message text and type', () => {
      const messageEl = { className: '', textContent: '' }
      helpers.setMessage('Validation warning', 'warning', { messageEl })
      expect(messageEl.className).toBe('message warning')
      expect(messageEl.textContent).toBe('Validation warning')
    })
    test('clears message content when empty values are provided', () => {
      const messageEl = { className: '', textContent: '' }
      helpers.setMessage('', 'info', { messageEl })
      expect(messageEl.className).toBe('message info')
      expect(messageEl.textContent).toBe('')
    })
  })

  /** Shows or hides the trade message section. */
  describe('showMessage()', () => {
    test('shows message section', () => {
      const messageSectionEl = { style: { display: 'none' } }
      helpers.showMessage(true, { messageSectionEl })
      expect(messageSectionEl.style.display).toBe('')
    })
    test('hides message section', () => {
      const messageSectionEl = { style: { display: '' } }
      helpers.showMessage(false, { messageSectionEl })
      expect(messageSectionEl.style.display).toBe('none')
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

  /** Renders QR preview and trade information in the trade dialog. */
  describe('renderQrPreview()', () => {
    test('renders QR preview with trade information', () => {
      const result = {
        qrData: '{"m":{"MEX":[1,5]},"r":{"FWC":[6,14]}}',
        tradeInfo: { missing: { MEX: [1, 5] }, repeats: { FWC: [6, 14] } }
      }
      const qrEl = { src: '', style: {} }
      const hintEl = { style: {} }
      const infoEl = { textContent: '', className: '', style: {} }
      helpers.renderQrPreview(result, { qrEl, hintEl, infoEl })
      expect(qrEl.src).toBe(`https://quickchart.io/qr?size=800&ecLevel=H&text=${encodeURIComponent(result.qrData)}`)
      expect(infoEl.className).toBe('preview')
      expect(infoEl.style.display).toBe('block')
      expect(infoEl.textContent).toBe('Repeats:\nFWC -> 6, 14\nMissing:\nMEX -> 1, 5')
      qrEl.onload()
      expect(qrEl.style.display).toBe('block')
      expect(hintEl.style.display).toBe('block')
    })
    test('renders empty trade information', () => {
      const result = { qrData: '{}', tradeInfo: { missing: {}, repeats: {} } }
      const qrEl = { src: '', style: {} }
      const hintEl = { style: {} }
      const infoEl = { textContent: '', className: '', style: {} }
      helpers.renderQrPreview(result, { qrEl, hintEl, infoEl })
      expect(qrEl.src).toBe(`https://quickchart.io/qr?size=800&ecLevel=H&text=${encodeURIComponent('{}')}`)
      expect(infoEl.textContent).toBe('Repeats:\n(none)\nMissing:\n(none)')
      qrEl.onload()
      expect(qrEl.style.display).toBe('block')
      expect(hintEl.style.display).toBe('block')
    })
    test('does nothing when qr element is missing', () => {
      const messageEl = { textContent: '', className: '', style: {} }
      expect(() => {
        helpers.renderQrPreview({ success: true, qrData: '{}', tradeInfo: { missing: {}, repeats: {} } }, { messageEl })
      }).not.toThrow()
    })
    test('does nothing when message element is missing', () => {
      const qrEl = { src: '', style: {} }
      expect(() => {
        helpers.renderQrPreview({ success: true, qrData: '{}', tradeInfo: { missing: {}, repeats: {} } }, { qrEl })
      }).not.toThrow()
    })
    test('hides QR image when loading fails', () => {
      const qrEl = { src: 'old', style: { display: 'block' } }
      const hintEl = { style: { display: 'block' } }
      helpers.renderQrPreview({ qrData: 'data', tradeInfo: { missing: {}, repeats: {} } }, { qrEl, hintEl })
      expect(qrEl.style.display).toBe('none')
      qrEl.onerror()
      expect(qrEl.style.display).toBe('none')
    })
    test('uses src fallback when removeAttribute is unavailable', () => {
      const qrEl = { src: 'old', style: {} }
      helpers.renderQrPreview({ qrData: 'data', tradeInfo: { missing: {}, repeats: {} } }, { qrEl })
      expect(qrEl.src).toBe(`https://quickchart.io/qr?size=800&ecLevel=H&text=${encodeURIComponent('data')}`)
    })
    test('renders QR preview without optional hint and info elements', () => {
      const qrEl = { src: '', style: {} }
      helpers.renderQrPreview({ qrData: 'data', tradeInfo: { missing: {}, repeats: {} } }, { qrEl })
      expect(qrEl.style.display).toBe('none')
      qrEl.onload()
      expect(qrEl.style.display).toBe('block')
    })
  })

  /** Clears QR preview display. */
  describe('clearQrPreview()', () => {
    test('clears QR image and message elements', () => {
      const qrEl = { src: 'https://quickchart.io/qr?text=data', style: { display: 'block' } }
      const messageEl = { textContent: 'Repeats:\nFWC -> 6, 14', className: 'preview', style: { display: 'block' } }
      helpers.clearQrPreview({ qrEl, messageEl })
      expect(qrEl.src).toBe('')
      expect(qrEl.style.display).toBe('none')
      expect(messageEl.textContent).toBe('')
      expect(messageEl.className).toBe('')
      expect(messageEl.style.display).toBe('none')
    })
    test('does nothing when QR element is missing', () => {
      const messageEl = { textContent: 'message', className: 'preview', style: { display: 'block' } }
      expect(() => {
        helpers.clearQrPreview({ messageEl })
      }).not.toThrow()
    })
    test('does nothing when message element is missing', () => {
      const qrEl = { src: 'data', style: { display: 'block' } }
      expect(() => {
        helpers.clearQrPreview({ qrEl })
      }).not.toThrow()
    })
  })

  /** Formats trade information into textarea input format. */
  describe('formatTradeInput()', () => {
    test('formats trade information into textarea input format', () => {
      const data = { MEX: [1, 5, 12], FWC: [2, 8] }
      const result = helpers.formatTradeInput(data)
      expect(result).toBe('MEX,1,5,12\nFWC,2,8')
    })
    test('returns empty string for empty data', () => {
      expect(helpers.formatTradeInput({})).toBe('')
    })
    test('returns empty string for missing data', () => {
      expect(helpers.formatTradeInput()).toBe('')
    })
  })

  /** Renders receive and send trade match previews. */
  describe('renderMatches()', () => {
    test('renders receive and send matches', () => {
      const receivePreviewEl = { innerHTML: '', className: '', style: {} }
      const sendPreviewEl = { innerHTML: '', className: '', style: {} }
      const previewClass = 'preview proposal-preview'
      helpers.renderMatches(
        { receive: { MEX: [1, 5] }, send: { FWC: [2, 8] } }, { receivePreviewEl, sendPreviewEl, previewClass }
      )
      expect(receivePreviewEl.className).toBe(previewClass)
      expect(receivePreviewEl.innerHTML).toBe('MEX, 1, 5')
      expect(receivePreviewEl.style.display).toBe('block')
      expect(sendPreviewEl.className).toBe(previewClass)
      expect(sendPreviewEl.innerHTML).toBe('FWC, 2, 8')
      expect(sendPreviewEl.style.display).toBe('block')
    })
    test('does nothing when matches are missing', () => {
      expect(() => {
        helpers.renderMatches(null, {})
      }).not.toThrow()
    })
    test('highlights proposed stickers', () => {
      const receivePreviewEl = { innerHTML: '', className: '', style: {} }
      helpers.renderMatches(
        { receive: { MEX: [1, 2] }, send: {} }, { receivePreviewEl, highlightProposal: { receive: { MEX: [2] } } }
      )
      expect(receivePreviewEl.innerHTML).
        toBe('MEX, 1, <span class="trade-highlight">2</span>')
    })
    test('highlights proposed send stickers', () => {
      const sendPreviewEl = { innerHTML: '', className: '', style: {} }
      helpers.renderMatches(
        { receive: {}, send: { FWC: [2, 8] } }, { sendPreviewEl, highlightProposal: { send: { FWC: [8] } } }
      )
      expect(sendPreviewEl.innerHTML).toBe('FWC, 2, <span class="trade-highlight">8</span>')
    })
    test('renders only receive preview when send element is missing', () => {
      const receivePreviewEl = { innerHTML: '', className: '', style: {} }
      helpers.renderMatches(
        { receive: { MEX: [1, 5] }, send: { FWC: [2, 8] } }, { receivePreviewEl }
      )
      expect(receivePreviewEl.className).toBe('preview')
      expect(receivePreviewEl.innerHTML).toBe('MEX, 1, 5')
      expect(receivePreviewEl.style.display).toBe('block')
    })
    test('renders only send preview when receive element is missing', () => {
      const sendPreviewEl = { innerHTML: '', className: '', style: {} }
      helpers.renderMatches(
        { receive: { MEX: [1, 5] }, send: { FWC: [2, 8] } }, { sendPreviewEl }
      )
      expect(sendPreviewEl.className).toBe('preview')
      expect(sendPreviewEl.innerHTML).toBe('FWC, 2, 8')
      expect(sendPreviewEl.style.display).toBe('block')
    })
    test('uses default preview class when no preview class is provided', () => {
      const receivePreviewEl = { innerHTML: '', className: '', style: {} }
      helpers.renderMatches(
        { receive: { MEX: [1, 5] }, send: {} }, { receivePreviewEl }
      )
      expect(receivePreviewEl.className).toBe('preview')
    })
  })

  /** Formats sticker map data for display. */
  describe('formatStickerMap()', () => {
    test('formats sticker map into readable text', () => {
      const result = helpers.formatStickerMap({ MEX: [1, 5], FWC: [2, 8] })
      expect(result).toBe('MEX -> 1, 5\nFWC -> 2, 8')
    })
    test('returns none for empty sticker map', () => {
      expect(helpers.formatStickerMap({})).toBe('(none)')
    })
    test('returns none for missing sticker map', () => {
      expect(helpers.formatStickerMap()).toBe('(none)')
    })
  })

  /** Counts trade matches. */
  describe('countMatches()', () => {
    test('counts stickers across countries', () => {
      expect(helpers.countMatches({ MEX: [1, 5], FWC: [2, 8, 10] })).toBe(5)
    })
    test('returns zero for empty matches', () => {
      expect(helpers.countMatches({})).toBe(0)
    })
    test('returns zero for missing matches', () => {
      expect(helpers.countMatches()).toBe(0)
    })
    test('ignores missing country arrays safely', () => {
      expect(helpers.countMatches({ MEX: undefined })).toBe(0)
    })
  })

  /** Applies user-selected limits to trade matches. */
  describe('prepareTradeSelection()', () => {
    const tradePreferences = ['ESP', 'CC', '1', '13', 'FRA20', 'POR15', 'ARG17']

    test('sortby album: limits receive and send stickers independently', () => {
      const matches = { receive: { FWC: [4, 5], MEX: [10] }, send: { FWC: [2, 3], MEX: [7] } }
      const result = helpers.prepareTradeSelection(matches, { maxStickerReceive: 2, maxStickerSend: 1 })
      expect(result).toEqual({ receive: { FWC: [4, 5] }, send: { FWC: [2] } })
    })
    test('sortby album: preserves album country order while applying the total limit', () => {
      const matches = { receive: { FWC: [4], MEX: [10, 11], RSA: [20] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, { maxStickerReceive: 3, maxStickerSend: 0 })
      expect(result).toEqual({ receive: { FWC: [4], MEX: [10, 11] }, send: {} })
    })
    test('sortby album: returns all stickers when limits exceed available stickers', () => {
      const matches = { receive: { FWC: [4, 5], MEX: [10] }, send: { FWC: [2, 3] } }
      const result = helpers.prepareTradeSelection(matches, { maxStickerReceive: 10, maxStickerSend: 10 })
      expect(result).not.toBe(matches)
      expect(result.receive).not.toBe(matches.receive)
    })
    test('sortby album: returns empty groups when limits are zero', () => {
      const matches = { receive: { FWC: [4, 5] }, send: { FWC: [2, 3] } }
      const result = helpers.prepareTradeSelection(matches, { maxStickerReceive: 0, maxStickerSend: 0 })
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('sortby album: returns empty groups when matches are empty', () => {
      const result = helpers.prepareTradeSelection({ receive: {}, send: {} }, { maxStickerReceive: 3, maxStickerSend: 3 })
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('sortby album: keeps album order when sort mode is album', () => {
      const matches = { receive: { FWC: [3, 1], MEX: [2] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, { maxStickerReceive: 3, maxStickerSend: 0, sortMode: 'album' })
      expect(result.receive).toEqual({ FWC: [3, 1], MEX: [2] })
    })
    test('sortby album: handles missing matches safely', () => {
      const result = helpers.prepareTradeSelection(undefined, { maxStickerReceive: 3, maxStickerSend: 3 })
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('sortby album: handles missing options safely', () => {
      const result = helpers.prepareTradeSelection({ receive: { FWC: [1, 2] }, send: { MEX: [3] } })
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('sortby album: handles missing receive matches', () => {
      const result = helpers.prepareTradeSelection({ send: { MEX: [3, 4] } }, { maxStickerReceive: 2, maxStickerSend: 1 })
      expect(result).toEqual({ receive: {}, send: { MEX: [3] } })
    })
    test('sortby album: handles missing send matches', () => {
      const result = helpers.prepareTradeSelection({ receive: { FWC: [1, 2] } }, { maxStickerReceive: 1, maxStickerSend: 2 })
      expect(result).toEqual({ receive: { FWC: [1] }, send: {} })
    })
    test('sortby album: keeps album order when sort mode is album', () => {
      const matches = { receive: { BRA: [10], ARG: [10] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        sortMode: 'album',
        tradePreferences: ['ARG'],
        maxStickerReceive: 10,
        maxStickerSend: 10
      })
      expect(Object.keys(result.receive)).toEqual(['BRA', 'ARG'])
    })
    test('sortby album: preserves send album order when sort mode is album', () => {
      const matches = {
        receive: { ARG: [1], BRA: [2] },
        send: { BRA: [10], ARG: [20] }
      }
      const result = helpers.prepareTradeSelection(matches, {
        sortMode: 'album',
        maxStickerReceive: 10,
        maxStickerSend: 10
      })
      expect(Object.keys(result.send)).toEqual(['BRA', 'ARG'])
    })
    test('sortby: completion: sorts matches by completion before applying limits', () => {
      const matches = { receive: { FWC: [2], MEX: [1], BRA: [3] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 2,
        maxStickerSend: 0,
        sortMode: 'completion',
        doneMap: { FWC: 20, MEX: 90, BRA: 50 }
      })
      expect(result.receive).toEqual({ MEX: [1], BRA: [3] })
    })
    test('sortby completion: falls back to album order when completion map is missing', () => {
      const matches = { receive: { FWC: [2], MEX: [1] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, { maxStickerReceive: 2, maxStickerSend: 0, sortMode: 'completion' })
      expect(result.receive).toEqual({ FWC: [2], MEX: [1] })
    })
    test('sortby completion: keeps album order when completion values are equal', () => {
      const matches = { receive: { FWC: [2], MEX: [1], RSA: [3] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 3,
        maxStickerSend: 0,
        sortMode: 'completion',
        doneMap: { FWC: 50, MEX: 50, RSA: 50 }
      })
      expect(result.receive).toEqual({ FWC: [2], MEX: [1], RSA: [3] })
    })
    test('sortby completion: sorts receive by completion while preserving send album order', () => {
      const matches = {
        receive: { FWC: [2], MEX: [1], BRA: [3] },
        send: { BRA: [10], ARG: [20] }
      }
      const result = helpers.prepareTradeSelection(matches, {
        sortMode: 'completion',
        doneMap: { FWC: 20, MEX: 80, BRA: 50 },
        maxStickerReceive: 10,
        maxStickerSend: 10
      })
      expect(Object.keys(result.receive)).toEqual(['MEX', 'BRA', 'FWC'])
      expect(Object.keys(result.send)).toEqual(['BRA', 'ARG'])
    })
    test('sortby preferences: prioritizes preferred country', () => {
      const matches = { receive: { MEX: [2], RSA: [3], BRA: [5], CC: [7] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10, maxStickerSend: 0, sortMode: 'preferences', tradePreferences
      })
      expect(result.receive).toEqual({ CC: [7], MEX: [2], RSA: [3], BRA: [5] })
    })
    test('sortby preferences: orders multiple preferred countries by preference', () => {
      const matches = { receive: { MEX: [2], RSA: [3], BRA: [5], ESP: [7], CC: [8] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10, maxStickerSend: 0, sortMode: 'preferences', tradePreferences
      })
      expect(result.receive).toEqual({ ESP: [7], CC: [8], MEX: [2], RSA: [3], BRA: [5] })
    })
    test('sortby preferences: prioritizes countries containing a global sticker preference', () => {
      const matches = { receive: { FWC: [2], MEX: [1, 5], RSA: [3], CZE: [1, 9], BRA: [7] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10,
        maxStickerSend: 0,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ MEX: [1, 5], CZE: [1, 9], FWC: [2], RSA: [3], BRA: [7] })
    })
    test('sortby preferences: prioritizes global sticker 13 and preserves higher priority sticker 1', () => {
      const matches = { receive: { FWC: [2], MEX: [5, 13, 1], RSA: [3], CZE: [9, 13], BRA: [7] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10,
        maxStickerSend: 0,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ MEX: [1, 13, 5], CZE: [13, 9], FWC: [2], RSA: [3], BRA: [7] })
    })
    test('sortby preferences: prioritizes country-specific sticker preference', () => {
      const matches = { receive: { FWC: [2], MEX: [20, 5], BRA: [7, 20], FRA: [10, 20] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10,
        maxStickerSend: 0,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ FRA: [20, 10], FWC: [2], MEX: [20, 5], BRA: [7, 20] })
    })
    test('sortby preferences: country-specific sticker preference competes with global sticker preference', () => {
      const matches = { receive: { MEX: [1], BRA: [5], FRA: [10, 20] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10,
        maxStickerSend: 0,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ MEX: [1], FRA: [20, 10], BRA: [5] })
    })
    test('sortby preferences: orders countries and stickers by multiple preferences', () => {
      const matches = { receive: { MEX: [1, 13, 20], BRA: [5], FRA: [10, 20], CC: [2, 12] }, send: {} }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 10,
        maxStickerSend: 0,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ CC: [2, 12], MEX: [1, 13, 20], FRA: [20, 10], BRA: [5] })
    })
    test('sortby preferences: resolves multiple competing country and sticker preferences', () => {
      const matches = {
        receive: { MEX: [1, 2, 13], RSA: [2, 3], KOR: [5, 13], FRA: [10, 20], POR: [2, 15], CC: [2, 12], ESP: [5, 6], BRA: [7, 8] },
        send: {}
      }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 20,
        maxStickerSend: 0,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ ESP: [5, 6], CC: [2, 12], MEX: [1, 13, 2], KOR: [13, 5], FRA: [20, 10], POR: [15, 2], RSA: [2, 3], BRA: [7, 8] })
    })
    test('sortby preferences: applies receive and send limits after sorting receive and send order is respected', () => {
      const matches = {
        receive: { MEX: [1, 2, 13], RSA: [2, 3], KOR: [5, 13], FRA: [10, 20], POR: [2, 15], CC: [2, 12], ESP: [5, 6], BRA: [7, 8] },
        send: { MEX: [1, 2, 3], FWC: [4, 5], BRA: [6, 7] }
      }
      const result = helpers.prepareTradeSelection(matches, {
        maxStickerReceive: 5,
        maxStickerSend: 4,
        sortMode: 'preferences',
        tradePreferences
      })
      expect(result.receive).toEqual({ ESP: [5, 6], CC: [2, 12], MEX: [1] })
      expect(result.send).toEqual({ MEX: [1, 2, 3], FWC: [4] })
    })
    test('sortby preferences: uses album order when countries have the same preference priority', () => {
      const matches = {
        receive: { BRA: [10], ARG: [10] },
        send: {}
      }
      const result = helpers.prepareTradeSelection(matches, {
        sortMode: 'preferences',
        tradePreferences: ['10'],
        maxStickerReceive: 10,
        maxStickerSend: 10
      })
      expect(Object.keys(result.receive)).toEqual(['BRA', 'ARG'])
    })
  })
})
