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
  function initService(ss = null) {
    const deps = initStaticDeps()
    return new TradeService(ss, deps)
  }

  let service

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
      const fakeSs = global.SpreadsheetApp.getActiveSpreadsheet()
      const svc = initService(fakeSs)
      expect(svc.ss).toBe(fakeSs)
    })
    test('initializes lazy dependencies as null', () => {
      expect(service.repo).toBeNull()
      expect(service.tradeInfo).toBeNull()
      expect(service.otherTradeInfo).toBeNull()
      expect(service.exportService).toBeNull()
      expect(service.tradeCalculation).toBeNull()
    })
  })

  /** static previewOtherStickerTradeInfo() */
  describe('static previewOtherStickerTradeInfo()', () => {
    test('delegates to previewOtherTradeInfo()', () => {
      const payload = { missingText: 'MEX,1,5\nFWC,10', repeatsText: 'BRA,15' }
      const tradeInfo = { missing: { MEX: [1, 5], FWC: [10] }, repeats: { BRA: [15] } }
      const expected = { success: true, warnings: { missing: [], repeats: [] }, tradeInfo }
      const previewMock = jest.spyOn(TradeService.prototype, 'previewOtherTradeInfo').mockReturnValue(expected)
      const result = TradeService.previewOtherStickerTradeInfo(payload, null, initStaticDeps())
      expect(previewMock).toHaveBeenCalledWith(payload)
      expect(result).toEqual({
        success: true,
        warnings: { missing: [], repeats: [] },
        tradeInfo: JSON.stringify(tradeInfo)
      })
    })
  })

  /** static generateStickerTradeInfoQr() */
  describe('static generateStickerTradeInfoQr()', () => {
    test('creates service and delegates QR generation', () => {
      const tradeInfo = { missing: {}, repeats: {} }
      jest.spyOn(TradeService.prototype, 'generateTradeInfoQr').mockReturnValue({
        success: true,
        qrData: '{}',
        tradeInfo
      })
      const result = TradeService.generateStickerTradeInfoQr(null, initStaticDeps())
      expect(result).toEqual({
        success: true,
        qrData: '{}',
        tradeInfo: JSON.stringify(tradeInfo)
      })
    })
  })

  /** static previewOtherStickerTradeInfoFromQr() */
  describe('static previewOtherStickerTradeInfoFromQr()', () => {
    test('delegates to previewOtherTradeInfoFromQr()', () => {
      const payload = { imageData: 'data:image/png;base64,test' }
      const tradeInfo = { missing: { MEX: [1, 5] }, repeats: { FWC: [6, 14] } }
      const expected = { success: true, warnings: { missing: [], repeats: [] }, tradeInfo }
      const previewMock = jest.spyOn(TradeService.prototype, 'previewOtherTradeInfoFromQr').mockReturnValue(expected)
      const result = TradeService.previewOtherStickerTradeInfoFromQr(payload, null, initStaticDeps())
      expect(previewMock).toHaveBeenCalledWith(payload)
      expect(result).toEqual({
        success: true,
        warnings: { missing: [], repeats: [] },
        tradeInfo: JSON.stringify(tradeInfo)
      })
    })
  })

  /** static refreshStickerTradeProposal() */
  describe('static refreshStickerTradeProposal()', () => {
    test('delegates to refreshTradeProposal()', () => {
      const expected = { receive: { MEX: [1, 5] }, send: { BRA: [8] } }
      const refreshMock = jest.spyOn(TradeService.prototype, 'refreshTradeProposal').mockReturnValue(expected)
      const result = TradeService.refreshStickerTradeProposal({
        otherTradeInfo: { missing: {}, repeats: {} },
        sortMissing: true,
        maxStickerReceive: 2,
        maxStickerSend: 2
      }, null, initStaticDeps())
      expect(refreshMock).toHaveBeenCalledWith({ sortMissing: true, maxStickerReceive: 2, maxStickerSend: 2 })
      expect(result).toEqual({ receive: JSON.stringify(expected.receive), send: JSON.stringify(expected.send) })
    })
  })

  /** static findStickerTradeMatches() */
  describe('static findStickerTradeMatches()', () => {
    test('creates service and delegates calculateMatches', () => {
      const calculateMock = jest.fn().mockReturnValue({ receive: [], send: [] })
      class MockTradeCalculation {
        calculate() {
          return calculateMock()
        }
      }
      const result = TradeService.findStickerTradeMatches({
        otherTradeInfo: { missing: {}, repeats: { MEX: [1] } }
      }, null, {
        ...initStaticDeps(),
        TradeCalculation: MockTradeCalculation
      })
      expect(result).toEqual({
        receive: JSON.stringify([]),
        send: JSON.stringify([])
      })
      expect(calculateMock).toHaveBeenCalledTimes(1)
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
      const originalCountries = TEST_DATA.countries
      TEST_DATA.countries = [...originalCountries, { code: 'RSA' }]
      try {
        const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'FWC,10\nMEX,5,4\nRSA,1,2,3' })
        expect(result.success).toBe(true)
        expect(result.warnings.repeats).toEqual([])
        expect(JSON.stringify(getTradeInfo(result).repeats)).toBe(JSON.stringify({
          FWC: [10],
          MEX: [5, 4],
          RSA: [1, 2, 3]
        }))
      } finally {
        TEST_DATA.countries = originalCountries
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
      encode.mockReturnValue('{"m":{"MEX":[1,5]},"r":{"FWC":[6,14]}}')
      const svc = new TradeService(null, deps)
      jest.spyOn(svc, 'getTradeInfo').mockReturnValue(mockTradeInfo)
      const result = svc.generateTradeInfoQr()
      expect(encode).toHaveBeenCalledWith(mockTradeInfo)
      expect(result).toEqual({
        success: true,
        qrData: '{"m":{"MEX":[1,5]},"r":{"FWC":[6,14]}}',
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
        decode() {
          return {
            missing: {},
            repeats: {}
          }
        }
      }

      const svc = new TradeService(null, { ...initStaticDeps(), TradeQrHelper: MockTradeQrHelper })
      const result = svc.previewOtherTradeInfoFromQr({ qrData: 'qr-data' })
      expect(result.success).toBe(true)
      expect(result.tradeInfo).toEqual({ missing: {}, repeats: {} })
    })
  })

  /** calculateMatches() */
  describe('findTradeMatches()', () => {
    test('throws when external collector information is missing', () => {
      expect(() => service.findTradeMatches({})).
        toThrow('External collector information is required before calculating trades.')
    })
    test('delegates calculation after external information exists', () => {
      service.setOtherTradeInfo({ countries: [] }, { countries: [{ code: 'MEX', counts: { 1: 1 } }] })
      const calculationMock = jest.
        spyOn(service.getTradeCalculation(), 'calculate').
        mockReturnValue({
          receive: [],
          send: []
        })
      const result = service.findTradeMatches()
      expect(calculationMock).toHaveBeenCalledTimes(1)
      expect(calculationMock).toHaveBeenCalledWith(service.getTradeInfo(), service.getOtherTradeInfo())
      expect(result).toEqual({ receive: [], send: [] })
    })
    test('returns calculation result from TradeCalculation', () => {
      service.setOtherTradeInfo({ countries: [] }, { countries: [{ code: 'MEX', counts: { 1: 1 } }] })
      jest.spyOn(service, 'getTradeInfo').mockReturnValue({
        missing: { BRA: [5] },
        repeats: {}
      })
      jest.spyOn(service.getTradeCalculation(), 'calculate').
        mockReturnValue({
          receive: { BRA: [5] },
          send: {}
        })
      const result = service.findTradeMatches({ countries: ['BRA'] })
      expect(result).toEqual({ receive: { BRA: [5] }, send: {} })
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
      expect(result).toEqual({ receive: { FWC: [10], MEX: [4, 5] }, send: { MEX: [2, 3] } })
    })
    test('returns empty matches when no matches exist', () => {
      service.setOtherTradeInfo({ countries: [] }, { countries: [{ code: 'MEX', counts: { 1: 1 } }] })
      jest.spyOn(service, 'getTradeInfo').mockReturnValue({ missing: { MEX: [1] }, repeats: { BRA: [8] } })
      jest.spyOn(service.getTradeCalculation(), 'calculate').mockReturnValue({ receive: {}, send: {} })
      const result = service.findTradeMatches()
      expect(result).toEqual({ receive: {}, send: {} })
    })
  })

  /** refreshTradeProposal() */
  describe('refreshTradeProposal()', () => {
    test('builds trade proposal using user options', () => {
      const service = initService()
      jest.spyOn(service, 'findTradeMatches').mockReturnValue({ receive: {}, send: {} })
      const result = service.refreshTradeProposal({ sortMissing: true, maxStickerReceive: 2, maxStickerSend: 2 })
      expect(result).toEqual({ receive: {}, send: {} })
    })
    test('keeps sticker preference order from trade matches', () => {
      const service = initService()
      jest.spyOn(service, 'findTradeMatches').mockReturnValue({ receive: { MEX: [15, 1, 5] }, send: {} })
      const result = service.refreshTradeProposal({ sortMissing: false, maxStickerReceive: 2, maxStickerSend: 2 })
      expect(result.receive.MEX).toEqual([15, 1])
    })
    test('restores original match order when missing sort is disabled after refresh', () => {
      const service = initService()
      jest.spyOn(service, 'findTradeMatches').mockReturnValue({
        receive: { BRA: [3, 4], MEX: [15, 1, 5] },
        send: {}
      })
      jest.spyOn(service, '_getCountryDoneMap').mockReturnValue({ MEX: 90, BRA: 50 })
      const sortedProposal = service.refreshTradeProposal({
        sortMissing: true, maxStickerReceive: 5,
        maxStickerSend: 2
      })
      const unsortedProposal = service.refreshTradeProposal({
        sortMissing: false, maxStickerReceive: 5,
        maxStickerSend: 2
      })
      expect(Object.keys(unsortedProposal.receive)).toEqual(['BRA', 'MEX'])
      expect(unsortedProposal.receive.BRA).toEqual([3, 4])
      expect(unsortedProposal.receive.MEX).toEqual([15, 1, 5])
    })
    test('sorts receive matches by album completion when missing sort is enabled', () => {
      const service = initService()
      jest.spyOn(service, 'findTradeMatches').mockReturnValue({
        receive: { FWC: [10], MEX: [4, 5, 6] },
        send: { MEX: [2, 3] }
      })
      jest.spyOn(service, '_getCountryDoneMap').mockReturnValue({ MEX: 95, FWC: 60 })
      const result = service.refreshTradeProposal({ sortMissing: true, maxStickerReceive: 4, maxStickerSend: 2 })
      expect(Object.keys(result.receive)).toEqual(['MEX', 'FWC'])
      expect(result.receive.MEX).toEqual([4, 5, 6])
      expect(result.receive.FWC).toEqual([10])
      expect(result.send).toEqual({ MEX: [2, 3] })
    })
    test('limits receive stickers globally after sorting countries', () => {
      const service = initService()
      jest.spyOn(service, 'findTradeMatches').mockReturnValue({
        receive: { FWC: [10], MEX: [4, 5, 6] },
        send: {}
      })
      jest.spyOn(service, '_getCountryDoneMap').mockReturnValue({ MEX: 95, FWC: 60 })
      const result = service.refreshTradeProposal({ sortMissing: true, maxStickerReceive: 3, maxStickerSend: 2 })
      expect(result.receive).toEqual({ MEX: [4, 5, 6] })
    })
  })

  /** executeTrade() */
  describe('executeTrade()', () => {
    test('builds repository updates and applies confirmed trade', () => {
      const service = initService()
      const confirmation = { receive: { MEX: [18] }, send: { MEX: [17] } }
      const repo = service.getRepo()
      const updateMock = jest.spyOn(repo, 'updateStickerCounts').mockReturnValue(true)
      const result = service.executeTrade(confirmation)
      expect(updateMock).toHaveBeenCalledWith([
        { countryCode: 'MEX', stickerNumber: 18, count: 2 },
        { countryCode: 'MEX', stickerNumber: 17, count: -1 }
      ])
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
    test('encodes trade information into QR payload format', () => {
      const tradeInfo = {
        missing: { MEX: [1, 5, 15], FWC: [2, 8] },
        repeats: { BRA: [8, 10], ARG: [4, 12] }
      }
      const result = helper.encode(tradeInfo)
      expect(result).toBe('{"m":{"MEX":[1,5,15],"FWC":[2,8]},"r":{"BRA":[8,10],"ARG":[4,12]}}')
    })
    test('omits empty missing and repeats collections', () => {
      expect(helper.encode({ missing: {}, repeats: {} })).toBe('{}')
    })
  })

  /** decode() */
  describe('decode()', () => {
    test('decodes QR payload into trade information model', () => {
      const payload = '{"m":{"MEX":[1,5,15],"FWC":[2,8]},"r":{"BRA":[8,10],"ARG":[4,12]}}'
      const result = helper.decode(payload)
      expect(result).toEqual({ missing: { MEX: [1, 5, 15], FWC: [2, 8] }, repeats: { BRA: [8, 10], ARG: [4, 12] } })
    })
    test('returns empty trade information for invalid payload', () => {
      const result = helper.decode('invalid')
      expect(result).toEqual({ missing: {}, repeats: {} })
    })
    test('ignores unknown fields from QR payload', () => {
      const payload = '{"m":{"MEX":[1,5]},"r":{"BRA":[8]},"x":"ignored"}'
      const result = helper.decode(payload)
      expect(result).toEqual({ missing: { MEX: [1, 5] }, repeats: { BRA: [8] } })
    })
    test('handles payload with only missing stickers', () => {
      const result = helper.decode('{"m":{"MEX":[1]}}')
      expect(result).toEqual({ missing: { MEX: [1] }, repeats: {} })
    })
    test('handles payload with only repeat stickers', () => {
      const result = helper.decode('{"r":{"BRA":[8]}}')
      expect(result).toEqual({ missing: {}, repeats: { BRA: [8] } })
    })
  })
})
