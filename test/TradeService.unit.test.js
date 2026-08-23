// test/TradeService.unit.test.js

/**
 * Unit tests for TradeService.
 *
 * Focus:
 * - public application methods
 * - lazy initialization behavior
 * - trade information preparation
 * - external collector parsing workflow
 * - trade calculation delegation
 *
 * Google Apps Script dependencies are mocked via:
 * test/utils/testKernel.js
 */

const { TradeService, TradeCalculation, TradeQrHelper } = require('../build/TradeService.js')

describe('TradeService (unit)', () => {
  const { initTestKernel, TEST_DATA } = require('./utils/testKernel.js')
  const { ExportService, ExportStickers } = require('../build/ExportService.js')
  const { ImportStickers } = require('../build/ImportService.js')
  /** Expected trade preferences from test kernel mock range. */
  const EXPECTED_TRADE_PREFERENCES = ['MEX', '1', '13', 'POR11']

  /**
   * A spreadsheet double distinct from testKernel's mocked getActiveSpreadsheet() result,
   *  used to verify explicit ss forwarding rather than an accidental fallback to the active spreadsheet.
   */
  const OTHER_SS = { marker: 'explicit-ss-fixture' }

  let service

  /** Initializes a TradeService instance with optional spreadsheet and dependencies. */
  function initStaticDeps() {
    return {
      ExportService,
      ExportStickers,
      ImportStickers,
      TradeCalculation,
      TradeQrHelper
    }
  }
  /** Initializes a TradeService instance with optional spreadsheet and dependencies. */
  function initService(ss = null) {
    const deps = initStaticDeps()
    return new TradeService(ss, deps)
  }

  beforeEach(() => {
    jest.restoreAllMocks()
    initTestKernel()
    service = initService()
  })

  /** constructor(ss) */
  describe('constructor(ss)', () => {
    test('stores null as ss when no spreadsheet is provided', () => {
      const svc = initService()
      expect(svc.ss).toBeNull()
    })
    test('stores provided ss instance', () => {
      const svc = initService(OTHER_SS)
      expect(svc.ss).toBe(OTHER_SS)
    })
    test('initializes lazy dependencies as null', () => {
      expect(service.repo).toBeNull()
      expect(service.tradeInfo).toBeNull()
      expect(service.otherTradeInfo).toBeNull()
      expect(service.exportService).toBeNull()
      expect(service.tradeCalculation).toBeNull()
    })
  })

  /** getRepo() */
  describe('getRepo()', () => {
    test('returns repository instance', () => {
      expect(service.getRepo()).toBeDefined()
    })
    test('returns same repository instance on subsequent calls', () => {
      const repo1 = service.getRepo()
      const repo2 = service.getRepo()
      expect(repo1).toBe(repo2)
    })
    test('forwards the constructor ss into the repository instead of falling back to the active spreadsheet', () => {
      const svc = initService(OTHER_SS)
      const repo = svc.getRepo()
      expect(repo.ss).toBe(OTHER_SS)
      expect(repo.ss).not.toBe(global.SpreadsheetApp.getActiveSpreadsheet())
    })
  })

  /** getExportService() */
  describe('getExportService()', () => {
    test('lazy initializes ExportService', () => {
      const exporter = service.getExportService()
      expect(exporter).toBeDefined()
      expect(service.exportService).toBe(exporter)
    })
    test('returns same ExportService instance', () => {
      const first = service.getExportService()
      const second = service.getExportService()
      expect(first).toBe(second)
    })
  })

  /** getTradeInfo() */
  describe('getTradeInfo()', () => {
    test('returns trade information object', () => {
      const result = service.getTradeInfo()
      expect(result).toHaveProperty('missing')
      expect(result).toHaveProperty('repeats')
    })
    test('returns cached trade information instance', () => {
      const first = service.getTradeInfo()
      const second = service.getTradeInfo()
      expect(first).toBe(second)
    })
    test('returns repeat sticker numbers as numeric arrays', () => {
      const result = service.getTradeInfo()
      Object.values(result.repeats).forEach(stickers => {
        expect(Array.isArray(stickers)).toBe(true)
        stickers.forEach(sticker => {
          expect(typeof sticker).toBe('number')
          expect(Number.isFinite(sticker)).toBe(true)
        })
      })
    })
    test('does not contain null repeat stickers', () => {
      const result = service.getTradeInfo()
      Object.values(result.repeats).forEach(stickers => {
        expect(stickers).not.toContain(null)
      })
    })
    test('returns expected missing and repeated stickers', () => {
      // Using the TEST_DATA defined in testKernel.js, we expect the following trade information:
      const result = service.getTradeInfo()
      expect(result.missing.FWC).toContain(2)
      expect(result.missing.FWC).not.toContain(1)
      expect(result.repeats.FWC).toEqual([3])
      expect(result.missing.MEX).not.toContain(18)
      expect(result.repeats.MEX).toEqual([20])
      expect(result.missing.CC).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    })
  })

  /** getOtherTradeInfo() */
  describe('getOtherTradeInfo()', () => {
    test('returns null before external trade information is set', () => {
      expect(service.getOtherTradeInfo()).toBeNull()
    })
    test('returns stored external trade information', () => {
      service.setOtherTradeInfo({ missing: { MEX: [1] }, repeats: { MEX: [2] } })
      expect(service.getOtherTradeInfo()).toEqual({ missing: { MEX: [1] }, repeats: { MEX: [2] } })
    })
  })

  /** getTradeProposal() */
  describe('getTradeProposal()', () => {
    test('returns null before proposal is generated', () => {
      expect(service.getTradeProposal()).toBeNull()
    })
    test('returns stored trade proposal', () => {
      const proposal = { receive: { MEX: [1] }, send: {} }
      service.setTradeProposal(proposal)
      expect(service.getTradeProposal()).toBe(proposal)
    })
  })

  /** setTradeProposal() */
  describe('setTradeProposal()', () => {
    test('stores trade proposal', () => {
      const proposal = { receive: {}, send: {} }
      service.setTradeProposal(proposal)
      expect(service.tradeProposal).toBe(proposal)
    })
  })

  /** getTradeQrHelper() */
  describe('getTradeQrHelper()', () => {
    test('lazy initializes TradeQrHelper', () => {
      const helper = service.getTradeQrHelper()
      expect(helper).toBeDefined()
      expect(service.tradeQrHelper).toBe(helper)
    })
    test('returns same TradeQrHelper instance', () => {
      const first = service.getTradeQrHelper()
      const second = service.getTradeQrHelper()
      expect(first).toBe(second)
    })
  })

  /** getTradeCalculation() */
  describe('getTradeCalculation()', () => {
    test('lazy initializes TradeCalculation', () => {
      const calculator = service.getTradeCalculation()
      expect(calculator).toBeDefined()
      expect(service.tradeCalculation).toBe(calculator)
    })
    test('returns same TradeCalculation instance', () => {
      const first = service.getTradeCalculation()
      const second = service.getTradeCalculation()
      expect(first).toBe(second)
    })
  })

  /** setOtherTradeInfo() */
  describe('setOtherTradeInfo()', () => {
    test('builds trade information from parsed input', () => {
      service.setOtherTradeInfo({ missing: { MEX: [1] }, repeats: { MEX: [2, 3] } })
      expect(service.getOtherTradeInfo()).toEqual({ missing: { MEX: [1] }, repeats: { MEX: [2, 3] } })
    })
    test('handles empty countries list', () => {
      service.setOtherTradeInfo({ missing: {}, repeats: {} })
      expect(service.getOtherTradeInfo()).toEqual({ missing: {}, repeats: {} })
    })
    test('preserves country order from external trade information', () => {
      service.setOtherTradeInfo({
        missing: { MEX: [1], FWC: [2], CC: [3] }, repeats: { MEX: [10], FWC: [20], CC: [30] }
      })
      expect(Object.keys(service.getOtherTradeInfo().repeats)).toEqual(['MEX', 'FWC', 'CC'])
    })
  })

  /** previewOtherTradeInfo() */
  describe('previewOtherTradeInfo()', () => {
    function getTradeInfo(result) {
      return result.tradeInfo
    }
    test('parses external collector input and stores trade information', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2(2),3' })
      expect(result.success).toBe(true)
      expect(result.warnings).toEqual({ missing: [], repeats: [] })
      expect(getTradeInfo(result)).toEqual({ missing: {}, repeats: { MEX: [1, 2, 3] } })
    })
    test('parses external collector information and returns trade data', () => {
      const result = service.previewOtherTradeInfo({ missingText: 'MEX,1,5\nFWC,10', repeatsText: 'MEX,15' })
      expect(result.success).toBe(true)
      expect(result.warnings).toEqual({ missing: [], repeats: [] })
      expect(getTradeInfo(result)).toEqual({
        missing: { MEX: [1, 5], FWC: [10] },
        repeats: { MEX: [15] }
      })
    })
    test('returns parser warnings', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'XXX,1' })
      expect(result.success).toBe(true)
      expect(result.warnings.missing).toEqual([])
      expect(result.warnings.repeats.length).toBeGreaterThan(0)
    })
    test('returns independent warnings for invalid missing and repeats input', () => {
      const result = service.previewOtherTradeInfo({
        missingText: 'MEX,1,999\nXXX,2',
        repeatsText: 'MEX,15(2)\nXXX,5'
      })
      expect(result.success).toBe(true)
      expect(result.warnings.missing.some(w => w.includes('999'))).toBe(true)
      expect(result.warnings.missing.some(w => w.includes('XXX'))).toBe(true)
      expect(result.warnings.repeats.some(w => w.includes('XXX'))).toBe(true)
      expect(getTradeInfo(result)).toEqual({ missing: { MEX: [1] }, repeats: { MEX: [15] } })
    })
    test('handles valid and invalid countries in external input', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2\nXXX,5\nCC,3' })
      const tradeInfo = getTradeInfo(result)
      expect(result.success).toBe(true)
      expect(tradeInfo.repeats).toHaveProperty('MEX')
      expect(tradeInfo.repeats).toHaveProperty('CC')
      expect(result.warnings.repeats.length).toBeGreaterThan(0)
      expect(result.warnings.repeats.some(w => w.includes('XXX'))).toBe(true)
    })
    test('preserves valid stickers and reports skipped stickers', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2,22,99' })
      expect(result.success).toBe(true)
      expect(getTradeInfo(result).repeats.MEX).toEqual([1, 2])
      expect(result.warnings.repeats.some(w => w.includes('22'))).toBe(true)
      expect(result.warnings.repeats.some(w => w.includes('99'))).toBe(true)
    })
    test('returns all warnings while keeping valid trade data', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,1,25\nXXX,3\nCC,2' })
      const tradeInfo = getTradeInfo(result)
      expect(result.success).toBe(true)
      expect(tradeInfo.repeats).toHaveProperty('MEX')
      expect(tradeInfo.repeats).toHaveProperty('CC')
      expect(result.warnings.repeats.length).toBeGreaterThan(1)
    })
    test('skips duplicate country lines and keeps first valid country data only', () => {
      const input = ['MEX,1,2', 'XXX,5', 'CC,3', 'MEX,3,4'].join('\n')
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: input })
      const tradeInfo = getTradeInfo(result)
      expect(result.success).toBe(true)
      expect(tradeInfo.repeats).toEqual({ MEX: [1, 2], CC: [3] })
      expect(tradeInfo.repeats.MEX).not.toContain(3)
      expect(tradeInfo.repeats.MEX).not.toContain(4)
      expect(result.warnings.repeats.some(w => w.includes('XXX'))).toBe(true)
    })
    test('returns warnings independently for missing and repeats', () => {
      const result = service.previewOtherTradeInfo({ missingText: 'XXX,1', repeatsText: 'MEX,99' })
      expect(result.success).toBe(true)
      expect(result.warnings.missing.length).toBeGreaterThan(0)
      expect(result.warnings.repeats.length).toBeGreaterThan(0)
      expect(result.warnings.missing.some(w => w.includes('XXX'))).toBe(true)
      expect(result.warnings.repeats.some(w => w.includes('99'))).toBe(true)
    })
    test('accepts empty missing or repeats sections', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2' })
      expect(result.success).toBe(true)
      expect(result.warnings).toEqual({ missing: [], repeats: [] })
      expect(getTradeInfo(result)).toEqual({ missing: {}, repeats: { MEX: [1, 2] } })
    })
    test('rejects invalid missing stickers while preserving warnings', () => {
      const result = service.previewOtherTradeInfo({ missingText: 'MEX,99', repeatsText: '' })
      expect(result.success).toBe(true)
      expect(result.warnings.missing.length).toBeGreaterThan(0)
      expect(result.warnings.missing.some(w => w.includes('99'))).toBe(true)
      expect(getTradeInfo(result).missing).toEqual({})
    })
    test('preserves country order from external trade input', () => {
      const result = service.previewOtherTradeInfo({
        missingText: '',
        repeatsText: 'CC,5\nMEX,15\nFWC,10'
      })
      expect(result.success).toBe(true)
      expect(Object.keys(getTradeInfo(result).repeats)).toEqual(['CC', 'MEX', 'FWC'])
    })
    test('preserves country order from external trade information', () => {
      const countries = [
        ...TEST_DATA.countries,
        { code: 'RSA', name: 'South Africa', group: '', flag: '', counts: {} }
      ]
      initTestKernel({ countries })
      service = initService()
      const result = service.previewOtherTradeInfo({
        missingText: '',
        repeatsText: 'FWC,10\nMEX,5,4\nRSA,1,2,3'
      })
      expect(result.success).toBe(true)
      expect(result.warnings.repeats).toEqual([])
    })
    test('returns empty trade information when both sections are empty', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: '' })
      expect(result).toEqual({
        success: true,
        warnings: { missing: [], repeats: [] },
        tradeInfo: { missing: {}, repeats: {} }
      })
    })
    test('rejects a sticker that is both missing and repeated', () => {
      try {
        service.previewOtherTradeInfo({
          missingText: 'MEX,15',
          repeatsText: 'MEX,15'
        })
        throw new Error('Expected previewOtherTradeInfo() to throw')
      } catch (error) {
        expect(error.message).toContain('cannot be both missing and repeated')
        expect(error.message).toContain('MEX,15')
      }
    })
  })

  /** generateTradeInfoQr() */
  describe('generateTradeInfoQr()', () => {
    let deps, encode
    beforeEach(() => {
      encode = jest.fn()
      deps = {
        ...initStaticDeps(),
        TradeQrHelper: class {
          encode(tradeInfo) {
            return encode(tradeInfo)
          }
        }
      }
    })
    test('generates QR trade information from current trade data', () => {
      const mockTradeInfo = { missing: { MEX: [1, 5] }, repeats: { FWC: [6, 14] } }
      encode.mockReturnValue('{"m":{"MEX":16402},"r":{"FWC":8320}}')
      const svc = new TradeService(null, deps)
      jest.spyOn(svc, 'getTradeInfo').mockReturnValue(mockTradeInfo)
      const result = svc.generateTradeInfoQr()
      expect(encode).toHaveBeenCalledWith(mockTradeInfo)
      expect(result).toEqual({
        success: true,
        qrData: '{"m":{"MEX":16402},"r":{"FWC":8320}}',
        tradeInfo: mockTradeInfo
      })
    })
    test('generates QR trade information using empty trade data', () => {
      const mockTradeInfo = { missing: {}, repeats: {} }
      encode.mockReturnValue('{}')
      const svc = new TradeService(null, deps)
      jest.spyOn(svc, 'getTradeInfo').mockReturnValue(mockTradeInfo)
      const result = svc.generateTradeInfoQr()
      expect(encode).toHaveBeenCalledWith(mockTradeInfo)
      expect(result).toEqual({ success: true, qrData: '{}', tradeInfo: mockTradeInfo })
    })
  })

  /** previewOtherTradeInfoFromQr() */
  describe('previewOtherTradeInfoFromQr()', () => {
    test('decodes QR payload and stores external trade information', () => {
      const tradeInfo = { missing: { MEX: [1, 5] }, repeats: { BRA: [8] } }
      class MockTradeQrHelper {
        decode(qrData) {
          expect(qrData).toBe('qr-data')
          return tradeInfo
        }
      }
      const svc = new TradeService(null, { ...initStaticDeps(), TradeQrHelper: MockTradeQrHelper })
      const result = svc.previewOtherTradeInfoFromQr({ qrData: 'qr-data' })
      expect(result).toEqual({ success: true, warnings: { missing: [], repeats: [] }, tradeInfo })
      expect(svc.getOtherTradeInfo()).toEqual(tradeInfo)
    })
    test('uses decoded QR payload to create trade information', () => {
      class MockTradeQrHelper {
        decode() { return { missing: {}, repeats: {} } }
      }

      const svc = new TradeService(null, { ...initStaticDeps(), TradeQrHelper: MockTradeQrHelper })
      const result = svc.previewOtherTradeInfoFromQr({ qrData: 'qr-data' })
      expect(result.success).toBe(true)
      expect(result.tradeInfo).toEqual({ missing: {}, repeats: {} })
    })
    test('returns empty trade information for invalid QR payload', () => {
      const result = service.previewOtherTradeInfoFromQr({ qrData: 'invalid' })
      expect(result).toEqual({
        success: true,
        warnings: { missing: [], repeats: [] },
        tradeInfo: { missing: {}, repeats: {} }
      })
    })
  })

  /** findTradeMatches() */
  describe('findTradeMatches()', () => {
    test('throws when external collector information is missing', () => {
      expect(() => service.findTradeMatches({})).
        toThrow('External collector information is required before calculating trades.')
    })
    test('delegates calculation after external information exists', () => {
      service.setOtherTradeInfo({ countries: [] }, { countries: [{ code: 'MEX', counts: { 1: 1 } }] })
      const calculationMock = jest.
        spyOn(service.getTradeCalculation(), 'calculate').
        mockReturnValue({ receive: [], send: [] })
      const result = service.findTradeMatches()
      expect(calculationMock).toHaveBeenCalledTimes(1)
      expect(calculationMock).toHaveBeenCalledWith(service.getTradeInfo(), service.getOtherTradeInfo())
      expect(result).toEqual({
        receive: [],
        send: [],
        doneMap: {},
        tradePreferences: EXPECTED_TRADE_PREFERENCES
      })
    })
    test('returns calculation result from TradeCalculation', () => {
      service.setOtherTradeInfo({ countries: [] }, { countries: [{ code: 'MEX', counts: { 1: 1 } }] })
      jest.spyOn(service, 'getTradeInfo').mockReturnValue({ missing: { BRA: [5] }, repeats: {} })
      jest.spyOn(service.getTradeCalculation(), 'calculate').
        mockReturnValue({ receive: { BRA: [5] }, send: {} })
      const result = service.findTradeMatches({ countries: ['BRA'] })
      expect(result).toEqual({ receive: { BRA: [5] }, send: {}, doneMap: {}, tradePreferences: EXPECTED_TRADE_PREFERENCES })
    })
    test('returns matches preserving trade info country order', () => {
      service.setOtherTradeInfo({
        missing: { MEX: [3, 2, 1] },
        repeats: { FWC: [10], MEX: [5, 4], RSA: [1, 2, 3] }
      }, {})
      jest.spyOn(service, 'getTradeInfo').mockReturnValue({
        missing: { FWC: [10], MEX: [4, 5] },
        repeats: { MEX: [2, 3] }
      })
      const result = service.findTradeMatches()
      expect(result).toEqual({
        receive: { FWC: [10], MEX: [4, 5] },
        send: { MEX: [2, 3] },
        doneMap: { FWC: 2, MEX: 2 },
        tradePreferences: EXPECTED_TRADE_PREFERENCES
      })
    })
    test('returns empty matches when no matches exist', () => {
      service.setOtherTradeInfo({ countries: [] }, { countries: [{ code: 'MEX', counts: { 1: 1 } }] })
      jest.spyOn(service, 'getTradeInfo').mockReturnValue({ missing: { MEX: [1] }, repeats: { BRA: [8] } })
      jest.spyOn(service.getTradeCalculation(), 'calculate').mockReturnValue({ receive: {}, send: {} })
      const result = service.findTradeMatches()
      expect(result).toEqual({ receive: {}, send: {}, doneMap: {}, tradePreferences: EXPECTED_TRADE_PREFERENCES })
    })
    test('uses stored external trade information when no payload is provided', () => {
      const otherTradeInfo = { missing: { MEX: [1] }, repeats: { FWC: [3] } }
      service.setOtherTradeInfo(otherTradeInfo)
      const calculateMock = jest.spyOn(service.getTradeCalculation(), 'calculate').mockReturnValue({ receive: {}, send: {} })
      service.findTradeMatches()
      expect(calculateMock).toHaveBeenCalledWith(service.getTradeInfo(), otherTradeInfo)
    })
  })

  /** executeTrade() */
  describe('executeTrade()', () => {
    test('applies confirmed trade through repository update contract', () => {
      const service = initService()
      const result = service.executeTrade({ receive: { MEX: [18] }, send: { MEX: [20] } })
      expect(result).toBeUndefined()
      const counts = service.getRepo().getCountsRange().getValues()
      expect(counts[1][18]).toBe(2)
      expect(counts[1][20]).toBe(1)
    })
    test('handles empty trade confirmation without creating updates', () => {
      const service = initService()
      const repo = service.getRepo()
      const updateMock = jest.spyOn(repo, 'updateStickerCounts').mockReturnValue(true)
      const result = service.executeTrade({ receive: {}, send: {} })
      expect(updateMock).toHaveBeenCalledWith({ countries: [] }, 'update')
      expect(result).toBe(true)
    })
    test('rejects outgoing trade when sticker count would become negative', () => {
      const service = initService()
      const repo = service.getRepo()
      const updateSpy = jest.spyOn(repo, 'updateStickerCounts')
      const countsBefore = repo.getCountsRange().getValues()
      let error
      try {
        service.executeTrade({ receive: {}, send: { MEX: [17] } })
      } catch (e) {
        error = e
      }
      // Expected message: "Cannot send sticker 17 from MEX. Current count is 0."
      expect(error).toBeDefined()
      expect(error.message).toContain('MEX')
      expect(error.message).toContain('17')
      expect(error.message).toContain('0')
      expect(updateSpy).not.toHaveBeenCalled()
      expect(repo.getCountsRange().getValues()).toEqual(countsBefore)
    })
    test('applies incoming and outgoing stickers across different countries', () => {
      const service = initService()
      service.executeTrade({ receive: { FWC: [3] }, send: { MEX: [20] } })
      const counts = service.getRepo().getCountsRange().getValues()
      expect(counts[0][3]).toBe(3)
      expect(counts[1][20]).toBe(1)
    })
    test('throws when trade confirmation is missing', () => {
      let error
      try {
        const service = initService()
        service.executeTrade()
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error.message).toMatch(/trade confirmation|required/i)
    })
    test('throws when trade confirmation has no receive or send data', () => {
      let error
      try {
        const service = initService()
        service.executeTrade({})
      } catch (e) {
        error = e
      }
      expect(error).toBeDefined()
      expect(error.message).toMatch(/trade confirmation|required/i)
    })
    test('returns doneMap information for receive countries', () => {
      service.setOtherTradeInfo({
        missing: { MEX: [1], FWC: [2] },
        repeats: {}
      }, {})
      jest.spyOn(service, 'getTradeInfo').mockReturnValue({
        missing: { MEX: [1], FWC: [2] },
        repeats: {}
      })
      jest.spyOn(service.getTradeCalculation(), 'calculate').mockReturnValue({
        receive: { MEX: [1], FWC: [2] },
        send: {}
      })
      const result = service.findTradeMatches()
      expect(result.doneMap).toEqual({ MEX: expect.any(Number), FWC: expect.any(Number) })
    })
    test('rejects missing trade confirmation', () => {
      expect(() => service.executeTrade()).toThrow(expect.objectContaining({
        message: expect.stringContaining('Trade confirmation')
      }))
    })
    test('applies receive-only trade confirmation', () => {
      const repo = service.getRepo()
      const updateMock = jest.spyOn(repo, 'updateStickerCounts').mockReturnValue(true)
      const result = service.executeTrade({ receive: { MEX: [18] } })
      expect(updateMock).toHaveBeenCalledWith({ countries: [{ code: 'MEX', counts: new Map([[18, 2]]) }] }, 'update')
      expect(result).toBe(true)
    })
    test('applies send-only trade confirmation', () => {
      const repo = service.getRepo()
      const updateMock = jest.spyOn(repo, 'updateStickerCounts').mockReturnValue(true)
      const result = service.executeTrade({ send: { MEX: [20] } })
      expect(updateMock).toHaveBeenCalledWith({ countries: [{ code: 'MEX', counts: new Map([[20, 1]]) }] }, 'update')
      expect(result).toBe(true)
    })
    test('keeps the current count when the same sticker is received and sent', () => {
      const repo = service.getRepo()
      jest.spyOn(repo, 'getStickerCount').mockReturnValue(1)
      const updateMock = jest.spyOn(repo, 'updateStickerCounts').mockReturnValue(true)
      const result = service.executeTrade({ receive: { MEX: [18] }, send: { MEX: [18] } })
      expect(updateMock).toHaveBeenCalledWith({ countries: [{ code: 'MEX', counts: new Map([[18, 1]]) }] }, 'update')
      expect(result).toBe(true)
    })
    test('applies trade confirmation for multiple countries', () => {
      const repo = service.getRepo()
      const updateMock = jest.spyOn(repo, 'updateStickerCounts').mockReturnValue(true)
      const result = service.executeTrade({ receive: { MEX: [18], FWC: [2] }, send: { MEX: [20] } })
      // TEST_DATA: FWC,1,3(2), MEX,18,20(2)
      expect(updateMock).toHaveBeenCalledWith({
        countries: [
          { code: 'MEX', counts: new Map([[18, 2], [20, 1]]) },
          { code: 'FWC', counts: new Map([[2, 1]]) }
        ]
      }, 'update')
      expect(result).toBe(true)
    })
  })
})

/** Unit tests for TradeCalculation class */
describe('TradeCalculation (unit)', () => {
  let calculation
  beforeEach(() => {
    calculation = new TradeCalculation()
  })

  describe('calculate()', () => {
    test('finds receive and send matches between collectors', () => {
      const tradeInfo = { missing: { MEX: [1, 5] }, repeats: { BRA: [8] } }
      const otherTradeInfo = { missing: { BRA: [8] }, repeats: { MEX: [1] } }
      const result = calculation.calculate(tradeInfo, otherTradeInfo)
      expect(result).toEqual({ receive: { MEX: [1] }, send: { BRA: [8] } })
    })
    test('returns empty matches when stickers are not compatible', () => {
      const tradeInfo = { missing: { MEX: [1] }, repeats: { BRA: [8] } }
      const otherTradeInfo = { missing: { BRA: [3] }, repeats: { MEX: [5] } }
      const result = calculation.calculate(tradeInfo, otherTradeInfo)
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('keeps multiple matches in source order', () => {
      const tradeInfo = { missing: { MEX: [5, 1, 8] }, repeats: {} }
      const otherTradeInfo = { missing: {}, repeats: { MEX: [1, 5] } }
      const result = calculation.calculate(tradeInfo, otherTradeInfo)
      expect(result.receive).toEqual({ MEX: [5, 1] })
    })
    test('does not create duplicate matches for repeated target stickers', () => {
      const tradeInfo = { missing: { MEX: [5] }, repeats: {} }
      const otherTradeInfo = { missing: {}, repeats: { MEX: [5, 5] } }
      const result = calculation.calculate(tradeInfo, otherTradeInfo)
      expect(result.receive).toEqual({ MEX: [5] })
    })
    test('keeps multiple country matches in album order', () => {
      const tradeInfo = { missing: { MEX: [4, 5], FWC: [10] }, repeats: { MEX: [2, 3] } }
      const otherTradeInfo = { missing: { MEX: [3, 2, 1] }, repeats: { FWC: [10], MEX: [5, 4], RSA: [1, 2, 3] } }
      const result = calculation.calculate(tradeInfo, otherTradeInfo)
      expect(result).toEqual({ receive: { FWC: [10], MEX: [4, 5] }, send: { MEX: [2, 3] } })
    })
    test('keeps multiple country matches in album order (RSA case)', () => {
      const tradeInfo = { missing: { MEX: [4, 5], FWC: [10] }, repeats: { MEX: [2, 3] } }
      const otherTradeInfo = { missing: { MEX: [3, 2, 1] }, repeats: { FWC: [10], MEX: [5, 4], RSA: [1, 2, 3] } }
      const result = calculation.calculate(tradeInfo, otherTradeInfo)
      expect(result).toEqual({ receive: { FWC: [10], MEX: [4, 5] }, send: { MEX: [2, 3] } })
    })
    test('returns empty matches when current collector has no trade information', () => {
      const result = calculation.calculate({ missing: {}, repeats: {} }, { missing: { MEX: [1] }, repeats: { MEX: [2] } })
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('returns empty matches when other collector has no trade information', () => {
      const result = calculation.calculate({ missing: { MEX: [1] }, repeats: { MEX: [2] } }, { missing: {}, repeats: {} })
      expect(result).toEqual({ receive: {}, send: {} })
    })
  })
})

/** Unit tests for TradeQrHelper class */
describe('TradeQrHelper (unit)', () => {
  let helper
  beforeEach(() => {
    helper = new TradeQrHelper()
  })

  /** encode() */
  describe('encode()', () => {
    test('encodes trade information into QR payload format using bit masks', () => {
      const tradeInfo = {
        missing: { MEX: [1, 4, 14], FWC: [0, 7] },
        repeats: { BRA: [7, 9], ARG: [3, 11] }
      }
      const result = helper.encode(tradeInfo)
      expect(result).toBe('{"m":{"MEX":16402,"FWC":129},"r":{"BRA":640,"ARG":2056}}')
    })
    test('omits empty missing and repeats collections', () => {
      expect(helper.encode({ missing: {}, repeats: {} })).toBe('{}')
    })
    test('encodes trade information with only missing stickers', () => {
      const result = helper.encode({ missing: { MEX: [1, 4] }, repeats: {} })
      expect(result).toBe('{"m":{"MEX":18}}')
    })
    test('encodes trade information with only repeat stickers', () => {
      const result = helper.encode({ missing: {}, repeats: { MEX: [1, 4] } })
      expect(result).toBe('{"r":{"MEX":18}}')
    })
  })

  /** decode() */
  describe('decode()', () => {
    test('decodes QR payload into trade information model', () => {
      const payload = '{"m":{"MEX":16402,"FWC":129},"r":{"BRA":640,"ARG":2056}}'
      const result = helper.decode(payload)
      expect(result).toEqual({ repeats: { BRA: [7, 9], ARG: [3, 11] }, missing: { MEX: [1, 4, 14], FWC: [0, 7] } })
    })
    test('returns empty trade information for invalid payload', () => {
      const result = helper.decode('invalid')
      expect(result).toEqual({ repeats: {}, missing: {} })
    })
    test('ignores unknown fields from QR payload', () => {
      const payload = '{"m":{"MEX":16400},"r":{"BRA":128},"x":"ignored"}'
      const result = helper.decode(payload)
      expect(result).toEqual({ repeats: { BRA: [7] }, missing: { MEX: [4, 14] } })
    })
    test('handles payload with only missing stickers', () => {
      const result = helper.decode('{"m":{"MEX":1}}')
      expect(result).toEqual({ repeats: {}, missing: { MEX: [0] } })
    })
    test('handles payload with only repeat stickers', () => {
      const result = helper.decode('{"r":{"BRA":128}}')
      expect(result).toEqual({ repeats: { BRA: [7] }, missing: {} })
    })
    test('preserves all stickers in a full 21 sticker mask', () => {
      const payload = '{"m":{"FWC":2097151}}'
      const result = helper.decode(payload)
      expect(result.missing.FWC).toEqual(Array.from({ length: 21 }, (_, i) => i))
    })
    test('decodes empty masks into empty trade information', () => {
      const result = helper.decode('{"m":{},"r":{}}')
      expect(result).toEqual({ repeats: {}, missing: {} })
    })
  })
})
