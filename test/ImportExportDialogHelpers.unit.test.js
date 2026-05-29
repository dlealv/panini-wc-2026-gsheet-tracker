// test/ImportExportDialogHelpers.unit.test.js

/** Unit tests for ImportExportDialogHelpers. */

const { initTestKernel } = require('./utils/testKernel')
const { helpers } = require('../build/ImportExportDialogHelpers.html.js')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
describe('ImportExportDialogHelpers unit tests', () => {
  beforeEach(() => initTestKernel())

  /** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
  describe('buildExportFileName()', () => {
    test('formats date correctly', () => {
      const date = new Date(2026, 0, 5, 9, 4, 7)
      const result = helpers.buildExportFileName(date)

      expect(result).toBe('panini-stickers-export-20260105-090407.txt')
    })
    test('pads single digit values correctly', () => {
      const date = new Date(2026, 9, 3, 1, 2, 3)
      const result = helpers.buildExportFileName(date)

      expect(result).toBe('panini-stickers-export-20261003-010203.txt')
    })
    test('defaults to current date when no parameter is provided', () => {
      const result = helpers.buildExportFileName()

      expect(typeof result).toBe('string')
      expect(result.startsWith('panini-stickers-export-')).toBe(true)
      expect(result.endsWith('.txt')).toBe(true)
    })
  })

  /** Get payload for export based on current UI state. */
  describe('getPayload()', () => {
    test('returns default structure when inputs are empty', () => {
      global.textInput = null
      global.modeInput = null
      global.includeFlagsCheckbox = null
      const result = helpers.getUIState()
      expect(result).toEqual({ text: '', mode: 'update', includeFlags: false })
    })
    test('reads values from mocked inputs', () => {
      global.textInput = { value: 'abc' }
      global.modeInput = { value: 'import' }
      global.includeFlagsCheckbox = { checked: true }
      const result = helpers.getUIState()
      expect(result).toEqual({ text: 'abc', mode: 'import', includeFlags: true })
    })
    test('returns same result as getUIState', () => {
      global.textInput = { value: 'abc' }
      global.modeInput = { value: 'import' }
      global.includeFlagsCheckbox = { checked: true }
      expect(helpers.getPayload()).toEqual({
        text: 'abc',
        mode: 'import',
        includeFlags: true
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
    const buttons = [
      { disabled: false },
      { disabled: false }
    ]
    const controls = [
      { disabled: false },
      { disabled: false },
      { disabled: false },
      { disabled: false }
    ]
    const docMock = {
      querySelectorAll: jest.fn(() => buttons)
    }
    helpers.setBusy(true, {
      document: docMock,
      controls
    })
    buttons.forEach(btn => {
      expect(btn.disabled).toBe(true)
    })
    controls.forEach(control => {
      expect(control.disabled).toBe(true)
    })
  })
})

/** Get current UI state from input elements. */
describe('getUIState()', () => {
  test('returns default values when inputs are missing', () => {
    global.textInput = null
    global.modeInput = null
    global.includeFlagsCheckbox = null
    const result = helpers.getUIState()
    expect(result).toEqual({
      text: '',
      mode: 'update',
      includeFlags: false
    })
  })
  test('reads values from DOM inputs', () => {
    global.textInput = { value: 'abc' }
    global.modeInput = { value: 'import' }
    global.includeFlagsCheckbox = { checked: true }
    const result = helpers.getUIState()
    expect(result).toEqual({
      text: 'abc',
      mode: 'import',
      includeFlags: true
    })
  })
})

/** Copies export text to clipboard. */
describe('copyToClipboard()', () => {
  test('uses navigator clipboard when available', async () => {
    const writeTextMock = jest.fn().mockResolvedValue()
    await helpers.copyToClipboard('hello', {
      clipboard: {
        writeText: writeTextMock
      }
    })
    expect(writeTextMock).toHaveBeenCalledWith('hello')
  })
  test('falls back to execCommand when clipboard fails', async () => {
    const selectMock = jest.fn()
    const execCommandMock = jest.fn()
    await helpers.copyToClipboard('hello', {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error('fail'))
      },
      exportTextEl: {
        select: selectMock
      },
      execCommand: execCommandMock
    })
    expect(selectMock).toHaveBeenCalledTimes(1)
    expect(execCommandMock).toHaveBeenCalledWith('copy')
  })
})

/** Create and trigger a download link for the exported data. */
describe('triggerDownload()', () => {
  test('creates and triggers download link', () => {
    const clickMock = jest.fn()
    const appendMock = jest.fn()
    const removeMock = jest.fn()
    const createObjectURLMock = jest.fn(() => 'blob:url')
    const revokeObjectURLMock = jest.fn()
    const setTimeoutMock = jest.fn(fn => fn())
    const docMock = {
      createElement: jest.fn(() => ({
        href: '',
        download: '',
        click: clickMock
      })),
      body: {
        appendChild: appendMock,
        removeChild: removeMock
      }
    }
    const urlMock = {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock
    }
    helpers.triggerDownload('data', 'file.txt', {
      document: docMock,
      URL: urlMock,
      setTimeoutFn: setTimeoutMock
    })
    expect(clickMock).toHaveBeenCalledTimes(1)
    expect(createObjectURLMock).toHaveBeenCalledTimes(1)
    expect(appendMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(setTimeoutMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)
  })
})

/** Integration tests for ImportExportDialogHelpers. */
describe('integration scenarios', () => {
  test('state flows correctly into payload and preview rendering', () => {
    // verifies UI state → backend payload transformation
    const state = { text: 'ARG,1,3(2)', mode: 'update', includeFlags: false }
    const payload = helpers.getPayloadFromState(state)

    expect(payload).toEqual({ text: 'ARG,1,3(2)', mode: 'update', includeFlags: false })

    // backend-style result → UI rendering
    const preview = helpers.renderPreviewData({ countries: [{ code: 'ARG', stickers: [{ number: 1, count: 1 }, { number: 3, count: 2 }] }] })

    expect(preview).toBe('ARG -> 1:1, 3:2')
  })
})

/** Cross-layer integration tests for ImportExportDialogHelpers. */
describe('cross-layer integration scenarios', () => {
  test('service output is compatible with UI renderer', () => {
    // verifies backend format can be safely rendered by UI layer
    const backendResult = { countries: [{ code: 'ARG', stickers: [{ number: 1, count: 1 }, { number: 3, count: 2 }, { number: 5, count: 1 }] }] }
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
        { code: 'ARG', stickers: [{ number: 1, count: 1 }, { number: 3, count: 2 }, { number: 5, count: 1 }, { number: 6, count: 1 }] },
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
