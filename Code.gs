/**
 * Coordinates sticker import/export operations for the Panini tracker sheet.
 * Handles menu creation, preview/import flows, export generation, and sheet access.
 */
class StickerImportApp {
  /**
   * Initializes spreadsheet metadata and validates required named ranges.
   */
  constructor() {
    this.SHEET_NAME = 'Stickers';
    this.COUNTRIES_RANGE_NAME = 'COUNTRIES';
    this.COUNTS_RANGE_NAME = 'COUNTS';
    this.STICKER_MIN = 0;
    this.STICKER_MAX = 20;
    this.EXPECTED_STICKER_COLUMNS = this.STICKER_MAX - this.STICKER_MIN + 1;

    this.ss = SpreadsheetApp.getActiveSpreadsheet();
    this.countriesRange = this.ss.getRangeByName(this.COUNTRIES_RANGE_NAME);
    this.countsRange = this.ss.getRangeByName(this.COUNTS_RANGE_NAME);

    if (!this.countriesRange) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" not found.`);
    }

    if (!this.countsRange) {
      throw new Error(`Named range "${this.COUNTS_RANGE_NAME}" not found.`);
    }

    this.sheet = this.countriesRange.getSheet();

    if (this.sheet.getName() !== this.SHEET_NAME) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" must be in the "${this.SHEET_NAME}" sheet.`);
    }

    if (this.countsRange.getSheet().getName() !== this.SHEET_NAME) {
      throw new Error(`Named range "${this.COUNTS_RANGE_NAME}" must be in the "${this.SHEET_NAME}" sheet.`);
    }

    this._validateNamedRanges_();

    this.START_ROW = this.countriesRange.getRow();
    this.NUM_ROWS = this.countriesRange.getNumRows();
    this.COUNTRY_COL = this.countriesRange.getColumn();
    this.START_COL = this.countsRange.getColumn();
    this.NUM_STICKER_COLS = this.countsRange.getNumColumns();

    this.countryMap = this._buildCountryMap();
  }

  /**
   * Builds the custom spreadsheet menu.
   */
  static onOpen() {
    SpreadsheetApp.getUi()
      .createMenu('Manage Panini')
      .addItem('Open Import Dialog', 'showImportDialog')
      .addSeparator()
      .addItem('Import data', 'showImportDialogCleanAll')
      .addItem('Update counts clearing country counts', 'showImportDialogReplaceCountries')
      .addItem('Update counts', 'showImportDialogUpdate')
      .addSeparator()
      .addItem('Export Stickers', 'showExportDialog')
      .addToUi();
  }

  /**
   * Parses input and returns a preview payload without modifying the sheet.
   *
   * @param {string} text Raw pasted or uploaded text input.
   * @returns {{success: boolean, countries: Array<{code: string, stickers: Array<{number: number, count: number}>}>}}
   */
  preview(text) {
    const parser = new StickerInputParser(this.countryMap);
    const parsed = parser.parse(text);

    return {
      success: true,
      countries: parsed.map(item => ({
        code: item.code,
        stickers: Object.keys(item.counts)
          .map(Number)
          .sort((a, b) => a - b)
          .map(n => ({
            number: n,
            count: item.counts[n]
          }))
      }))
    };
  }

  /**
   * Imports validated sticker data into the sheet using the selected mode.
   *
   * @param {string} text Raw pasted or uploaded text input.
   * @param {string} mode Import mode: clean_all, replace_countries, or update.
   * @returns {{success: boolean, message: string}}
   */
  import(text, mode) {
    const normalizedMode = mode || 'update';
    const parser = new StickerInputParser(this.countryMap);
    const parsed = parser.parse(text);

    if (normalizedMode === 'clean_all') {
      this._clearAllCounts();
    } else if (normalizedMode === 'replace_countries') {
      this._clearCountries(parsed);
    } else if (normalizedMode !== 'update') {
      throw new Error(`Invalid import mode "${normalizedMode}".`);
    }

    this._writeCountries(parsed);

    return {
      success: true,
      message: `Imported ${parsed.length} country row(s) successfully.`
    };
  }

  /**
   * Exports sheet data using the same syntax as the import input format.
   * Only sticker counts greater than zero are exported.
   *
   * @returns {{success: boolean, text: string, lines: number}}
   */
  exportData() {
    const countryValues = this.countriesRange.getValues();
    const countValues = this.countsRange.getValues();
    const lines = [];

    for (let i = 0; i < this.NUM_ROWS; i++) {
      const code = String(countryValues[i][0] || '').trim().toUpperCase();
      if (!code) continue;

      const rowCounts = countValues[i];
      const stickerTokens = [];

      for (let sticker = this.STICKER_MIN; sticker <= this.STICKER_MAX; sticker++) {
        const cellValue = rowCounts[sticker];
        const numericValue = Number(cellValue);

        if (cellValue === '' || cellValue === null || Number.isNaN(numericValue) || numericValue <= 0) {
          continue;
        }

        if (numericValue === 1) {
          stickerTokens.push(String(sticker));
        } else {
          stickerTokens.push(`${sticker}(${numericValue})`);
        }
      }

      if (stickerTokens.length > 0) {
        lines.push([code].concat(stickerTokens).join(','));
      }
    }

    return {
      success: true,
      text: lines.join('\n'),
      lines: lines.length
    };
  }

  /**
   * Validates the named ranges used by the script.
   *
   * @private
   */
  _validateNamedRanges_() {
    if (this.countriesRange.getNumColumns() !== 1) {
      throw new Error(`Named range "${this.COUNTRIES_RANGE_NAME}" must contain exactly 1 column.`);
    }

    if (this.countsRange.getNumColumns() !== this.EXPECTED_STICKER_COLUMNS) {
      throw new Error(
        `Named range "${this.COUNTS_RANGE_NAME}" must contain exactly ${this.EXPECTED_STICKER_COLUMNS} columns.`
      );
    }

    if (this.countriesRange.getNumRows() !== this.countsRange.getNumRows()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.COUNTS_RANGE_NAME}" must have the same number of rows.`
      );
    }

    if (this.countriesRange.getRow() !== this.countsRange.getRow()) {
      throw new Error(
        `Named ranges "${this.COUNTRIES_RANGE_NAME}" and "${this.COUNTS_RANGE_NAME}" must start on the same row.`
      );
    }
  }

  /**
   * Builds a map of country code to row offset in the named ranges.
   *
   * @returns {Object<string, {row: number, index: number}>}
   * @private
   */
  _buildCountryMap() {
    const values = this.countriesRange.getValues();
    const map = {};

    values.forEach((row, idx) => {
      const code = String(row[0] || '').trim().toUpperCase();
      if (!code) return;

      map[code] = {
        row: this.START_ROW + idx,
        index: idx
      };
    });

    return map;
  }

  /**
   * Clears all sticker count values in the COUNTS named range.
   *
   * @private
   */
  _clearAllCounts() {
    this.countsRange.clearContent();
  }

  /**
   * Clears sticker count cells only for the countries present in the import.
   *
   * @param {Array<{code: string}>} parsedRows Parsed import rows.
   * @private
   */
  _clearCountries(parsedRows) {
    parsedRows.forEach(item => {
      const row = this.countryMap[item.code].row;
      this.sheet
        .getRange(row, this.START_COL, 1, this.NUM_STICKER_COLS)
        .clearContent();
    });
  }

  /**
   * Writes parsed sticker counts into the correct row and sticker columns.
   * Only values are updated; formatting is preserved.
   *
   * @param {Array<{code: string, counts: Object<number, number>}>} parsedRows Parsed import rows.
   * @private
   */
  _writeCountries(parsedRows) {
    parsedRows.forEach(item => {
      const row = this.countryMap[item.code].row;
      const range = this.sheet.getRange(row, this.START_COL, 1, this.NUM_STICKER_COLS);
      const currentValues = range.getValues()[0];
      const outputValues = currentValues.slice();

      Object.keys(item.counts).forEach(key => {
        const stickerNumber = Number(key);
        const mappedCount = item.counts[key];
        const offset = stickerNumber;

        if (offset < 0 || offset >= this.NUM_STICKER_COLS) {
          throw new Error(`Sticker number ${stickerNumber} is outside the writable range.`);
        }

        outputValues[offset] = mappedCount;
      });

      range.setValues([outputValues]);
    });
  }
}

/**
 * Parses raw import text and converts it into validated country/sticker counts.
 * Handles syntax validation and special sticker mapping rules.
 */
class StickerInputParser {
  /**
   * @param {Object<string, {row: number, index: number}>} countryMap Valid country codes loaded from the sheet.
   */
  constructor(countryMap) {
    this.countryMap = countryMap;
    this.tokenRegex = /^(\d+)(?:\((\d+)\))?$/;
  }

  /**
   * Parses and validates the full input payload.
   *
   * @param {string} text Raw pasted or uploaded text input.
   * @returns {Array<{code: string, counts: Object<number, number>}>}
   */
  parse(text) {
    const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) {
      throw new Error('No input provided. Paste content or upload a file.');
    }

    const lines = normalized
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      throw new Error('Input is empty.');
    }

    const seen = new Set();
    const parsed = [];

    lines.forEach((line, lineIndex) => {
      if (line.includes(';')) {
        throw new Error(`Line ${lineIndex + 1}: invalid delimiter ";". Use comma only.`);
      }

      const parts = line.split(',').map(p => p.trim());

      if (parts.length < 2) {
        throw new Error(`Line ${lineIndex + 1}: expected COUNTRY_CODE plus at least one sticker token.`);
      }

      const codeRaw = parts[0];
      const code = codeRaw.toUpperCase();

      if (!/^[A-Z]{3}$/.test(code)) {
        throw new Error(`Line ${lineIndex + 1}: invalid country code "${codeRaw}".`);
      }

      if (!this.countryMap[code]) {
        throw new Error(`Line ${lineIndex + 1}: country code "${code}" not found in the COUNTRIES named range.`);
      }

      if (seen.has(code)) {
        throw new Error(`Line ${lineIndex + 1}: duplicate country code "${code}" in input.`);
      }
      seen.add(code);

      const counts = {};

      for (let i = 1; i < parts.length; i++) {
        const token = parts[i];

        if (!token) {
          throw new Error(`Line ${lineIndex + 1}: empty token detected. Check comma placement.`);
        }

        const match = token.match(this.tokenRegex);
        if (!match) {
          throw new Error(
            `Line ${lineIndex + 1}: invalid token "${token}". Use N or N(X), for example 5 or 5(2).`
          );
        }

        const stickerNumber = Number(match[1]);
        const explicitCount = match[2] ? Number(match[2]) : null;

        if (!Number.isInteger(stickerNumber) || stickerNumber < 0 || stickerNumber > 20) {
          throw new Error(`Line ${lineIndex + 1}: sticker number ${stickerNumber} is outside allowed range 0-20.`);
        }

        if (explicitCount !== null && (!Number.isInteger(explicitCount) || explicitCount < 0)) {
          throw new Error(`Line ${lineIndex + 1}: invalid repeat count in "${token}".`);
        }

        if (counts[stickerNumber] != null) {
          throw new Error(`Line ${lineIndex + 1}: sticker ${stickerNumber} for "${code}" appears more than once.`);
        }

        counts[stickerNumber] = this._mapTokenToCount(code, stickerNumber, explicitCount);
      }

      parsed.push({ code, counts });
    });

    return parsed;
  }

  /**
   * Maps a parsed sticker token to the final count written into the sheet.
   *
   * @param {string} code Country code.
   * @param {number} stickerNumber Sticker number.
   * @param {?number} explicitCount Repeat count from parentheses, if provided.
   * @returns {number}
   * @private
   */
  _mapTokenToCount(code, stickerNumber, explicitCount) {
    if (stickerNumber === 0) {
      if (code === 'FWC') {
        return explicitCount !== null ? explicitCount : 1;
      }
      return 0;
    }

    if (stickerNumber === 20) {
      if (code === 'FWC') {
        return 0;
      }
      return explicitCount !== null ? explicitCount : 1;
    }

    return explicitCount !== null ? explicitCount : 1;
  }
}

function onOpen() {
  StickerImportApp.onOpen();
}

function showImportDialogCleanAll() {
  showDialog_('import', 'clean_all');
}

function showImportDialogReplaceCountries() {
  showDialog_('import', 'replace_countries');
}

function showImportDialogUpdate() {
  showDialog_('import', 'update');
}

function showImportDialog() {
  showDialog_('import', 'update');
}

function showExportDialog() {
  showDialog_('export', 'update');
}

function showDialog_(dialogMode, defaultMode) {
  const template = HtmlService.createTemplateFromFile('ImportDialog');
  template.dialogMode = dialogMode || 'import';
  template.defaultMode = defaultMode || 'update';

  const html = template
    .evaluate()
    .setWidth(760)
    .setHeight(760);

  SpreadsheetApp.getUi().showModalDialog(
    html,
    dialogMode === 'export' ? 'Export Stickers' : 'Import sticker counts'
  );
}

function previewStickerData(payload) {
  const app = new StickerImportApp();
  return app.preview(payload && payload.text ? payload.text : '');
}

function importStickerData(payload) {
  const app = new StickerImportApp();
  return app.import(
    payload && payload.text ? payload.text : '',
    payload && payload.mode ? payload.mode : 'update'
  );
}

function exportStickerData() {
  const app = new StickerImportApp();
  return app.exportData();
}
