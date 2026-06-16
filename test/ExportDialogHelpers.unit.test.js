// test/ExportDialogHelpers.unit.test.js

/** Unit tests for ExportDialogHelpers. */

const { helpers } = require('../build/ExportDialogHelpers.html.js')

/** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
describe('ExportDialogHelpers unit tests', () => {
  /** DOM mock for Node test environment. Enables testing DOM-related helpers without jsdom. */
  describe('buildExportFileName()', () => {
    test('formats date correctly type=all, now=2026-01-05T09:04:07', () => {
      const date = new Date(2026, 0, 5, 9, 4, 7)
      const result = helpers.buildExportFileName('all', date)
      expect(result).toBe('panini-stickers-all-20260105-090407.txt')
    })
    test('pads single digit values correctly, type=all, now=2026-10-03T01:02:03', () => {
      const date = new Date(2026, 9, 3, 1, 2, 3)
      const result = helpers.buildExportFileName('all', date)
      expect(result).toBe('panini-stickers-all-20261003-010203.txt')
    })
    test('defaults to current date when no parameter is provided, type=all', () => {
      const result = helpers.buildExportFileName('all')
      expect(typeof result).toBe('string')
      expect(result.startsWith('panini-stickers-all')).toBe(true)
      expect(result.endsWith('.txt')).toBe(true)
    })
    test('defaults to current date when no parameter is provided, type=shared', () => {
      const result = helpers.buildExportFileName('shared')
      expect(typeof result).toBe('string')
      expect(result.startsWith('panini-stickers-shared')).toBe(true)
      expect(result.endsWith('.txt')).toBe(true)
    })
  })

  /** Get current UI state from input elements. */
  describe('getUIState()', () => {
    test('returns default values when inputs are missing', () => {
      global.textInput = null
      global.modeInput = null
      global.includeFlagsCheckbox = null
      const result = helpers.getUIState()
      expect(result).toEqual({ includeFlags: false, sortByDone: false, isCompact: false })
    })
    test('reads values from DOM inputs', () => {
      global.includeFlagsCheckbox = { checked: true }
      const result = helpers.getUIState()
      expect(result).toEqual({ includeFlags: true, sortByDone: false, isCompact: false })
    })
  })

  /** Get payload for export based on current UI state. */
  describe('getPayload()', () => {
    test('returns same result as getUIState', () => {
      global.includeFlagsCheckbox = { checked: true }
      expect(helpers.getPayload()).toEqual({ includeFlags: true, sortByDone: false, isCompact: false })
      expect(helpers.getPayload()).toEqual(helpers.getUIState())
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

/** Copies export text to clipboard. */
describe('copyToClipboard()', () => {
  test('uses navigator clipboard when available', async () => {
    const writeTextMock = jest.fn().mockResolvedValue()
    await helpers.copyToClipboard('hello', {
      clipboard: { writeText: writeTextMock }
    })
    expect(writeTextMock).toHaveBeenCalledWith('hello')
  })
  test('falls back to execCommand when clipboard fails', async () => {
    const selectMock = jest.fn()
    const execCommandMock = jest.fn()
    await helpers.copyToClipboard('hello', {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('fail')) },
      exportTextEl: { select: selectMock },
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
      createElement: jest.fn(() => ({ href: '', download: '', click: clickMock })),
      body: { appendChild: appendMock, removeChild: removeMock }
    }
    const urlMock = { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock }
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
