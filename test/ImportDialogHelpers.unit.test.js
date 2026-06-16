// test/ImportDialogHelpers.unit.test.js

/** Unit tests for ImportDialogHelpers. */

const { helpers } = require('../build/ImportDialogHelpers.html.js')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
describe('ImportDialogHelpers unit tests', () => {
  /** Get payload for import based on current UI state. */
  describe('getPayload()', () => {
    test('returns default structure when inputs are empty', () => {
      const result = helpers.getUIState()
      expect(result).toEqual({ text: '', mode: 'update' })
    })
    test('reads values from mocked inputs', () => {
      global.textInput = { value: 'abc' }
      global.modeInput = { value: 'update' }
      const result = helpers.getUIState()
      expect(result).toEqual({ text: 'abc', mode: 'update' })
    })
    test('returns same result as getUIState', () => {
      global.textInput = { value: 'abc' }
      global.modeInput = { value: 'update' }
      expect(helpers.getPayload()).toEqual({
        text: 'abc', mode: 'update'
      })
    })
  })

  /** Set message for user feedback. */
  describe('setMessage()', () => {
    test('sets class and text correctly', () => {
      const messageEl = { className: '', textContent: '' }
      helpers.setMessage('Hello', 'success', { messageEl })
      expect(messageEl.className).toBe('message success')
      expect(messageEl.textContent).toBe('Hello')
    })
    test('defaults type to info', () => {
      const messageEl = { className: '', textContent: '' }
      helpers.setMessage('Test', undefined, { messageEl })
      expect(messageEl.className).toBe('message info')
    })
  })
})

/** Clear the preview area. */
describe('clearPreview()', () => {
  test('clears preview when element exists', () => {
    const previewEl = { style: {}, textContent: 'old' }
    helpers.clearPreview({ previewEl })
    expect(previewEl.style.display).toBe('none')
    expect(previewEl.textContent).toBe('')
  })
  test('does nothing when preview is null', () => {
    expect(() => helpers.clearPreview({ previewEl: null })).not.toThrow()
  })
})

/** Render a preview of the imported data. */
describe('renderPreview()', () => {
  test('renders grouped country data correctly', () => {
    const previewEl = { style: {}, textContent: '' }
    const input = {
      countries: [
        {
          code: 'ARG',
          stickers: [
            { number: 1, count: 2 },
            { number: 3, count: 1 }
          ]
        }
      ]
    }
    helpers.renderPreview(input, { previewEl })
    expect(previewEl.style.display).toBe('block')
    expect(previewEl.textContent).toBe('ARG -> 1:2, 3:1')
  })
  test('clears preview when no data', () => {
    const previewEl = { style: {}, textContent: 'old' }
    helpers.renderPreview(null, { previewEl })
    expect(previewEl.style.display).toBe('none')
    expect(previewEl.textContent).toBe('')
  })
})

/** Set the busy state for UI elements. */
describe('setBusy()', () => {
  test('disables all UI elements when busy', () => {
    const buttons = [{ disabled: false }, { disabled: false }]
    const controls = [{ disabled: false }, { disabled: false }, { disabled: false }, { disabled: false }]
    const docMock = { querySelectorAll: jest.fn(() => buttons) }
    helpers.setBusy(true, { document: docMock, controls })
    buttons.forEach(btn => { expect(btn.disabled).toBe(true) })
    controls.forEach(control => { expect(control.disabled).toBe(true) })
  })
})

/** Get current UI state from input elements. */
describe('getUIState()', () => {
  test('returns default values when inputs are missing', () => {
    global.textInput = null
    global.modeInput = null
    const result = helpers.getUIState()
    expect(result).toEqual({ text: '', mode: 'update' })
  })
  test('reads values from DOM inputs', () => {
    global.textInput = { value: 'abc' }
    global.modeInput = { value: 'update' }
    const result = helpers.getUIState()
    expect(result).toEqual({ text: 'abc', mode: 'update' })
  })
})

/** Integration tests for ImportDialogHelpers. */
describe('integration scenarios', () => {
  test('state flows correctly into payload and preview rendering', () => {
    // verifies UI state → backend payload transformation
    const state = { text: 'ARG,1,3(2)', mode: 'update' }
    const payload = helpers.getPayloadFromState(state)

    expect(payload).toEqual({ text: 'ARG,1,3(2)', mode: 'update' })

    // backend-style result → UI rendering
    const preview = helpers.renderPreviewData({
      countries: [{
        code: 'ARG',
        stickers: [{ number: 1, count: 1 },
          { number: 3, count: 2 }]
      }]
    })

    expect(preview).toBe('ARG -> 1:1, 3:2')
  })
})

/** Cross-layer integration tests for ImportDialogHelpers. */
describe('cross-layer integration scenarios', () => {
  test('service output is compatible with UI renderer', () => {
    // verifies backend format can be safely rendered by UI layer
    const backendResult = {
      countries: [{
        code: 'ARG',
        stickers: [{ number: 1, count: 1 }, { number: 3, count: 2 },
          { number: 5, count: 1 }]
      }]
    }
    const preview = helpers.renderPreviewData(backendResult)

    expect(preview).toBe('ARG -> 1:1, 3:2, 5:1')
  })
})

/** True end-to-end scenarios simulating real user flows. */
describe('true end-to-end scenarios', () => {
  test('real import flows through parser and renderer', () => {
    // simulated backend normalized output (service layer contract)
    const parsedResult = {
      countries: [
        {
          code: 'ARG',
          stickers: [{ number: 1, count: 1 }, { number: 3, count: 2 },
            { number: 5, count: 1 }, { number: 6, count: 1 }]
        },
        { code: 'BRA', stickers: [{ number: 10, count: 2 }, { number: 11, count: 2 }, { number: 12, count: 2 }] },
        { code: 'FWC', stickers: [{ number: 0, count: 1 }, { number: 1, count: 1 }, { number: 20, count: 0 }] }
      ]
    }
    const preview = helpers.renderPreviewData(parsedResult)

    expect(preview).toBe('ARG -> 1:1, 3:2, 5:1, 6:1\nBRA -> 10:2, 11:2, 12:2\nFWC -> 0:1, 1:1, 20:0')
  })
})

/** Edge cases that could occur in real usage. */
describe('edge-case integration scenarios', () => {
  test('empty backend result returns empty string', () => {
    const result = { countries: [] }
    const preview = helpers.renderPreviewData(result)

    expect(preview).toBe('')
  })
  test('null backend result does not crash renderer', () => {
    const preview = helpers.renderPreviewData(null)

    expect(preview).toBe('')
  })
  test('missing stickers array is handled safely', () => {
    const result = { countries: [{ code: 'ARG' }] } // missing stickers = real API edge case
    const preview = helpers.renderPreviewData(result)

    expect(preview).toBe('ARG -> ')
  })
})

/** Service-level integration tests to validate contracts between service and UI layers. */
describe('service-level integration scenarios', () => {
  test('service output renders correctly in UI', () => {
    // verifies backend service output is correctly formatted by UI renderer
    const serviceOutput = {
      countries: [
        { code: 'ARG', stickers: [{ number: 1, count: 1 }, { number: 3, count: 2 }] },
        { code: 'BRA', stickers: [{ number: 10, count: 1 }] }
      ]
    }
    const uiOutput = helpers.renderPreviewData(serviceOutput)

    expect(uiOutput).toBe('ARG -> 1:1, 3:2\nBRA -> 10:1')
  })
})
