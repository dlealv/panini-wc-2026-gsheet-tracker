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
  const { initTestKernel } = require('./utils/testKernel.js')
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
    test('parses external collector information and returns trade data', () => {
      const payload = { missingText: 'MEX,1,5\nFWC,10', repeatsText: 'BRA,15' }
      const expected = { success: true, warnings: { missing: [], repeats: [] }, tradeInfo: { missing: { MEX: [1, 5], FWC: [10] }, repeats: { BRA: [15] } } }
      jest.spyOn(TradeService.prototype, 'previewOtherTradeInfo').mockReturnValue(expected)
      const result = TradeService.previewOtherStickerTradeInfo(payload, null, initStaticDeps())
      expect(result).toEqual(expected)
    })
    test('returns independent warnings for invalid missing and repeats input', () => {
      const payload = { missingText: 'MEX,1,999\nINVALID', repeatsText: 'BRA,15(2)\nUNKNOWN,5' }
      const expected = { success: true, warnings: { missing: ['Invalid sticker 999 for MEX', 'Invalid country INVALID'], repeats: ['Invalid country UNKNOWN'] }, tradeInfo: { missing: { MEX: [1] }, repeats: { BRA: [15] } } }
      jest.spyOn(TradeService.prototype, 'previewOtherTradeInfo').mockReturnValue(expected)
      const result = TradeService.previewOtherStickerTradeInfo(payload, null, initStaticDeps())
      expect(result).toEqual(expected)
    })
    test('handles empty collector information', () => {
      const payload = { missingText: '', repeatsText: '' }
      const expected = { success: true, warnings: { missing: [], repeats: [] }, tradeInfo: { missing: {}, repeats: {} } }
      jest.spyOn(TradeService.prototype, 'previewOtherTradeInfo').mockReturnValue(expected)
      const result = TradeService.previewOtherStickerTradeInfo(payload, null, initStaticDeps())
      expect(result).toEqual(expected)
    })
  })

  /** generateStickerTradeQr() */
  describe('static generateStickerTradeQr()', () => {
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
      jest.spyOn(TradeService.prototype, 'getTradeInfo').mockReturnValue(mockTradeInfo)
      const result = TradeService.generateStickerTradeQr(null, deps)
      expect(encode).toHaveBeenCalledWith(mockTradeInfo)
      expect(result).toEqual({
        success: true,
        qrData: '{"m":{"MEX":[1,5]},"r":{"FWC":[6,14]}}',
        tradeInfo: JSON.stringify(mockTradeInfo)
      })
    })
    test('generates QR trade information using empty trade data', () => {
      const mockTradeInfo = { missing: {}, repeats: {} }
      encode.mockReturnValue('{}')
      jest.spyOn(TradeService.prototype, 'getTradeInfo').mockReturnValue(mockTradeInfo)
      const result = TradeService.generateStickerTradeQr(null, deps)
      expect(result).toEqual({
        success: true,
        qrData: '{}',
        tradeInfo: JSON.stringify(mockTradeInfo)
      })
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
  })

  /** previewOtherTradeInfo() */
  describe('previewOtherTradeInfo()', () => {
    test('parses external collector input and stores trade information', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2(2),3' })
      expect(result.success).toBe(true)
      expect(result.warnings).toEqual({ missing: [], repeats: [] })
      expect(result.tradeInfo).toEqual({ missing: {}, repeats: { MEX: [1, 2, 3] } })
    })
    test('returns parser warnings', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'XXX,1' })
      expect(result.success).toBe(true)
      expect(result.warnings.missing).toEqual([])
      expect(result.warnings.repeats.length).toBeGreaterThan(0)
    })
    test('handles valid and invalid countries in external input', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2\nXXX,5\nCC,3' })
      expect(result.success).toBe(true)
      expect(result.tradeInfo.repeats).toHaveProperty('MEX')
      expect(result.tradeInfo.repeats).toHaveProperty('CC')
      expect(result.warnings.repeats.length).toBeGreaterThan(0)
      expect(result.warnings.repeats.some(w => w.includes('XXX'))).toBe(true)
    })
    test('preserves valid stickers and reports skipped stickers', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,2,22,99' })
      expect(result.success).toBe(true)
      expect(result.tradeInfo.repeats.MEX).toEqual([1, 2])
      expect(result.warnings.repeats.some(w => w.includes('22'))).toBe(true)
      expect(result.warnings.repeats.some(w => w.includes('99'))).toBe(true)
    })
    test('returns all warnings while keeping valid trade data', () => {
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: 'MEX,1,1,25\nXXX,3\nCC,2' })
      expect(result.success).toBe(true)
      expect(result.tradeInfo.repeats).toHaveProperty('MEX')
      expect(result.tradeInfo.repeats).toHaveProperty('CC')
      expect(result.warnings.repeats.length).toBeGreaterThan(1)
    })
    test('skips duplicate country lines and keeps first valid country data only', () => {
      const input = ['MEX,1,2', 'XXX,5', 'CC,3', 'MEX,3,4'].join('\n')
      const result = service.previewOtherTradeInfo({ missingText: '', repeatsText: input })
      expect(result.success).toBe(true)
      expect(result.tradeInfo.repeats).toEqual({ MEX: [1, 2], CC: [3] })
      expect(result.tradeInfo.repeats.MEX).not.toContain(3)
      expect(result.tradeInfo.repeats.MEX).not.toContain(4)
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
      expect(result.tradeInfo).toEqual({ missing: {}, repeats: { MEX: [1, 2] } })
    })
    test('rejects invalid missing stickers while preserving warnings', () => {
      const result = service.previewOtherTradeInfo({ missingText: 'MEX,99', repeatsText: '' })
      expect(result.success).toBe(true)
      expect(result.warnings.missing.length).toBeGreaterThan(0)
      expect(result.warnings.missing.some(w => w.includes('99'))).toBe(true)
      expect(result.tradeInfo.missing).toEqual({})
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
        mockReturnValue({ proposals: [{ give: 'MEX-1', receive: 'BRA-5' }], warnings: [] })
      const result = service.findTradeMatches({ countries: ['BRA'] })
      expect(result).toEqual({ proposals: [{ give: 'MEX-1', receive: 'BRA-5' }], warnings: [] })
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
        ExportService,
        ExportStickers,
        ImportStickers,
        TradeCalculation: MockTradeCalculation
      })
      expect(result).toEqual({ receive: [], send: [] })
      expect(calculateMock).toHaveBeenCalledTimes(1)
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

  /** refreshStickerTradeProposal() */
  describe('static refreshStickerTradeProposal()', () => {
    test('builds trade proposal using user options', () => {
      class MockTradeCalculation {
        calculate() {
          return { receive: {}, send: {} }
        }
      }
      const proposal = TradeService.refreshStickerTradeProposal({
        otherTradeInfo: { countries: [] },
        sortMissing: true,
        maxStickerReceive: 2,
        maxStickerSend: 2
      }, null, { ExportService, ExportStickers, ImportStickers, TradeCalculation: MockTradeCalculation })
      expect(proposal).toEqual({ receive: expect.any(Object), send: expect.any(Object) })
    })
    test('keeps sticker preference order from trade matches', () => {
      class MockTradeCalculation {
        calculate() {
          return {
            receive: { MEX: [15, 1, 5] },
            send: {}
          }
        }
      }
      const service = new TradeService(null, {
        ExportService,
        ExportStickers,
        ImportStickers,
        TradeCalculation: MockTradeCalculation
      })
      service.setOtherTradeInfo({ countries: [] })
      const result = service.refreshTradeProposal({ sortMissing: false, maxStickerReceive: 2, maxStickerSend: 2 })
      expect(result.receive.MEX).toEqual([15, 1])
    })
    test('restores original match order when missing sort is disabled after refresh', () => {
      const service = initService()
      jest.spyOn(service, 'findTradeMatches').
        mockReturnValue({ receive: { BRA: [3, 4], MEX: [15, 1, 5] }, send: {} })
      jest.spyOn(service, '_getCountryDoneMap').
        mockReturnValue({
          MEX: 90,
          BRA: 50
        })
      const sortedProposal = service.refreshTradeProposal({
        sortMissing: true,
        maxStickerReceive: 3,
        maxStickerSend: 2
      })
      expect(Object.keys(sortedProposal.receive)).toEqual(['MEX', 'BRA'])
      const unsortedProposal = service.refreshTradeProposal({
        sortMissing: false,
        maxStickerReceive: 3,
        maxStickerSend: 2
      })
      expect(Object.keys(unsortedProposal.receive)).toEqual(['BRA', 'MEX'])
      expect(unsortedProposal.receive.BRA).toEqual([3, 4])
      expect(unsortedProposal.receive.MEX).toEqual([15, 1, 5])
    })
  })

  /** setOtherTradeInfoFromQr() */
  describe('setOtherTradeInfoFromQr()', () => {
    test('stores decoded QR trade information', () => {
      class MockTradeQrHelper {
        decode() {
          return {
            missing: { MEX: [1, 5] },
            repeats: { BRA: [8] }
          }
        }
      }
      const svc = initService()
      svc.TradeQrHelper = MockTradeQrHelper
      svc.setOtherTradeInfoFromQr('qr-data')
      expect(svc.getOtherTradeInfo()).toEqual({
        missing: { MEX: [1, 5] },
        repeats: { BRA: [8] }
      })
    })
  })

  /** findStickerTradeMatchesFromQr() */
  describe('static findStickerTradeMatchesFromQr()', () => {
    test('decodes QR data and calculates trade matches', () => {
      class MockTradeQrHelper {
        decode() {
          return {
            missing: { MEX: [1] },
            repeats: { BRA: [8] }
          }
        }
      }
      class MockTradeCalculation {
        calculate() {
          return { receive: {}, send: {} }
        }
      }
      const result = TradeService.findStickerTradeMatchesFromQr({
        qrData: '{"m":{"MEX":[1]},"r":{"BRA":[8]}}'
      }, null, {
        ExportService,
        ExportStickers,
        ImportStickers,
        TradeCalculation: MockTradeCalculation,
        TradeQrHelper: MockTradeQrHelper
      })
      expect(result).toEqual({ receive: {}, send: {} })
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
  })
})

/** Unit tests for TradeQrHelper class */
describe('TradeQrHelper (unit)', () => {
  let helper
  beforeEach(() => {
    helper = new TradeQrHelper()
  })
  test('encodes trade information into QR payload format', () => {
    const tradeInfo = {
      missing: { MEX: [1, 5, 15], FWC: [2, 8] },
      repeats: { BRA: [8, 10], ARG: [4, 12] }
    }
    const result = helper.encode(tradeInfo)
    expect(result).toBe('{"m":{"MEX":[1,5,15],"FWC":[2,8]},"r":{"BRA":[8,10],"ARG":[4,12]}}')
  })
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
})
