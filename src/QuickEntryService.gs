/** @OnlyCurrentDoc */
//src/QuickEntryService.gs

/**
 * Provides classes and methods related to the Quick Sticker Entry dialog, including data transformation, 
 * view model construction, and sticker count updates.
 * This service acts as the core logic layer for the Quick Entry dialog, handling all interactions between 
 * the shared sheet data and the UI payloads.
 * NOTE: the export tag in comments indicates methods that are intended to be testable and exposed for 
 * external use, so they should not be removed or altered without consideration of their role in the overall 
 * application architecture.
 */

/**
 * Builds Quick Sticker Entry view models and applies sticker count updates.
 * This service transforms shared sheet data into UI-ready payloads for the Quick Entry dialog.
 * export tag is used for testable classes/methods, don't remove them.
 * @export
 */
class QuickEntryService {
  /** Creates a service for Quick Sticker Entry. */
  constructor() {
    this.repository = new StickerSheetRepository()
    this.DEFAULT_STATUS_FILTER = 'all'
    this.DEFAULT_GROUP_FILTER = 'all'
  }

  /** Returns the initial dialog payload. */
  getInitialData() {
    const countries = this.repository.getCountries()
    const groupCodes = this.repository.getGroupCodes()

    return {
      countries: this._buildCountryViewModels(countries),
      groupCodes,
      selectedStatusFilter: this.DEFAULT_STATUS_FILTER,
      selectedGroupFilter: this.DEFAULT_GROUP_FILTER
    }
  }

  /** Applies a batch of pending sticker updates and returns refreshed data. */
  applyPendingUpdates(pendingUpdates) {
    const normalizedUpdates = this._normalizePendingUpdates(pendingUpdates)
    this.repository.updateStickerCounts(normalizedUpdates)

    return {
      success: true,
      message: `Updated ${normalizedUpdates.length} sticker value(s).`,
      countries: this._buildCountryViewModels(this.repository.getCountries())
    }
  }

  /** Builds country view models for the UI. */
  _buildCountryViewModels(countries) {
    return countries.map(country => this._buildCountryViewModel(country))
  }

  /** Builds one country section view model. */
  _buildCountryViewModel(country) {
    const stickers = this._buildStickerViews(country.code, country.counts)
    const summary = this._buildSummary(stickers)
    const isCompleted = summary.missing === 0

    return {
      code: country.code,
      countryName: country.countryName,
      group: country.group,
      flag: country.flag,
      isCompleted,
      stickers,
      summary
    }
  }

  /** Builds sticker cards for one country. */
  _buildStickerViews(countryCode, counts) {
    return this._getVisibleStickerNumbers(countryCode).map(stickerNumber => {
      const count = counts[stickerNumber]
      return this._buildStickerView(countryCode, stickerNumber, count)
    })
  }

  /** Builds one sticker card view model. */
  _buildStickerView(countryCode, stickerNumber, count) {
    return {
      number: stickerNumber,
      count,
      status: this._getStickerStatus(count),
      colorClass: this._getStickerColorClass(count),
      iconLabel: this._getStickerIconLabel(countryCode, stickerNumber),
      label: `${stickerNumber} (${count})`
    }
  }

  /** Returns the sticker corner label for special sticker numbers. */
  _getStickerIconLabel(countryCode, stickerNumber) {
    if (countryCode === 'FWC') {
      return ''
    }
    if (stickerNumber === 1) {
      return 'CREST'
    }
    if (stickerNumber === 13) {
      return 'TEAM'
    }

    return ''
  }

  /** Returns the status for one sticker count. */
  _getStickerStatus(count) {
    if (count === 0) {
      return 'missing'
    }
    if (count > 1) {
      return 'repeated'
    }

    return 'all'
  }

  /** Returns the color class for one sticker count. */
  _getStickerColorClass(count) {
    if (count <= 0) {
      return 'count-0'
    }
    if (count === 1) {
      return 'count-1'
    }
    if (count === 2) {
      return 'count-2'
    }
    if (count === 3) {
      return 'count-3'
    }
    if (count === 4) {
      return 'count-4'
    }

    return 'count-5-plus'
  }

  /** Returns visible sticker numbers for one country. */
  _getVisibleStickerNumbers(countryCode) {
    if (countryCode === 'FWC') {
      return this._buildNumberRange(0, 19)
    }

    return this._buildNumberRange(1, 20)
  }

  /** Builds an inclusive number range. */
  _buildNumberRange(start, end) {
    const numbers = []

    for (let value = start; value <= end; value++) {
      numbers.push(value)
    }

    return numbers
  }

  /** Builds summary values for the selected country. */
  _buildSummary(stickers) {
    const total = stickers.length
    const owned = stickers.filter(sticker => sticker.count > 0).length
    const missing = stickers.filter(sticker => sticker.count === 0).length
    const repeated = stickers.filter(sticker => sticker.count > 1).length
    const completionPercent = total === 0 ? 0 : Math.round((owned / total) * 100)

    return {
      owned,
      missing,
      repeated,
      total,
      completionPercent
    }
  }

  /** Validates and normalizes pending updates. */
  _normalizePendingUpdates(pendingUpdates) {
    if (!Array.isArray(pendingUpdates) || !pendingUpdates.length) {
      throw new Error('There are no pending updates to apply.')
    }

    return pendingUpdates.map(update => this._normalizePendingUpdate(update))
  }

  /** Validates and normalizes one pending update. */
  _normalizePendingUpdate(update) {
    const countryCode = this._normalizeCountryCode(update && update.countryCode)
    const stickerNumber = Number(update && update.stickerNumber)
    const count = Number(update && update.count)

    this._validateVisibleSticker(countryCode, stickerNumber)

    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid count "${update && update.count}" for ${countryCode} sticker ${stickerNumber}.`)
    }

    return {
      countryCode,
      stickerNumber,
      count
    }
  }

  /** Normalizes a country code. */
  _normalizeCountryCode(countryCode) {
    const normalizedCountryCode = String(countryCode || '').trim().toUpperCase()

    if (!normalizedCountryCode) {
      throw new Error('Country code is required.')
    }

    return normalizedCountryCode
  }

  /** Validates a visible sticker for the selected country. */
  _validateVisibleSticker(countryCode, stickerNumber) {
    if (!this._getVisibleStickerNumbers(countryCode).includes(stickerNumber)) {
      throw new Error(`Sticker ${stickerNumber} is not valid for country code "${countryCode}".`)
    }
  }
}
