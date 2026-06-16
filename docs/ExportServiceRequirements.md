# Panini FIFA WC 2026 Export Service Requirements

## Purpose

Provide a Google Apps Script solution for exporting sticker count data in the `Stickers` sheet of the Panini FIFA World Cup 2026 tracker.

The service must allow the user to:
- Export existing sticker data back into the same text format.
- Export shared stickers of stickers (missing and repeats).

The service is implemented as a spreadsheet-bound Apps Script solution with an HTML dialog opened from the custom spreadsheet menu.

---

## Scope

This service covers:
- Export of sticker counts from the spreadsheet.
- Export a shared list of repeated and missing stickers for trading.
- Local download of exported data.
- Clipboard copy of exported data.

This service does not cover:
- Import Service
- Quick Sticker Entry behavior.
- Google Forms integration.
- External libraries.
- Web app deployment.
- Add-on publishing.
- Special collections such as Coca-Cola stickers.

---

## Service entry points

This service is accessed from the **Manage Panini** menu through:
- separator
- `Export all stickers`
- `Export shared stickers`

The service uses: 
- `ExportService.gs` for backend logic
- `Commons.gs` common services used by all services via `StickerSheetRepository` class.
- HTML dialog files:
  - `ExportDialog.html` (main shell).
  - `ExportDialogHelpers.html` (client-side utilities).

---

## Target sheet and named ranges

### Main sheet

- Sheet name: `Stickers`

### Named ranges used by the service

- `COUNTRIES`: country code column. 
- `COUNTS`: sticker count range in the `Stickers` sheet.
- `FLAG_ICONS`: flag icons column. Reads export flag icons (emojis)
- `DONE`: total count of unique stickers (not counting repeats). 

**Note:** Named ranges do not necessarily have to be defined in the same sheet. For example, you can define `COUNTRIES` in the `Conf` tab and `COUNTS` in the `Stickers` tab, but the total number of rows (`49`, i.e `48` teams plus FWC) must match across all named ranges used together.

#### Data used for export

- Export reads country codes from `COUNTRIES` named range.
- Export reads sticker counts from `COUNTS` named range.
- Export reads flag icons from `FLAG_ICONS` named range.
- Export reads total completion from `DONE` named range. It helps to identify the progress of the collection for each country. Used by **Export shared stickers** service only.

---

## Export all stickers requirements

The service must provide an export function that reads current sticker counts from the `COUNTS` named range and country codes from the `COUNTRIES` named range, and produces text output. The export always uses **Format 1** (classic format, with the country prefix appearing once per line and ranges expanded). No other output format is supported. For more information about Format 1 check `ImportServiceRequirements.md`.

### Export format

One country per line.

```text
Format: [flag] CODE,number[,number(repeats)][,number-range][,number-range(repeats)]...
```

where `[flag]` and number-range are present if the user selected the corresponding checkboxes and refresh.

### Export rules

- The default export output does **not** include flag icons; no user action is required to obtain icon-free output.
- If the user explicitly selects the option **"Flag"**, the flag emoji from `FLAG_ICONS` is prefixed to each line.
- If the user explicitly selects the option **"Compact (using ranges)"**, consecutive stickers are compacted using ranges.
- Country code is read from `COUNTRIES`.
- Sticker counts are read from `COUNTS` as flat per-sticker values (no range aggregation or reconstruction is performed during export).
- Flag icons are read from `FLAG_ICONS`.
- Only sticker counts greater than `0` are exported.
- If all sticker counts for a country are `0` or below, that country is silently omitted from the export output; the status message reports the total line count, which is sufficient to identify an empty result.
- Export only outputs individual sticker numbers (no ranges), filtered to valid positions for the selected country code.
- Exported sticker values follow these rules:
  - count `1` → export as `number`.
  - count greater than `1` → export as `number(repeats)`.
- Sticker `0` must be exported only for `FWC`.
- Sticker `20` must be exported only for non-`FWC` country codes.
- Invalid sticker positions must never appear in exported output, even if the sheet contains a positive stored value.

Examples:
- `MEX,0` must never appear in exported output.
- `FWC,20` must never appear in exported output.

### Export example

If the tracker contains these counts for country code `FWC`:

> Note: Each sticker is stored and exported independently; no range reconstruction is performed.

| Sticker | Stored count |
| ---     | ---          |
| `1`     | `1`          |
| `5`     | `2`          |
| `7`     | `1`          |
| `8`     | `1`          |
| `10`    | `2`          |
| `11`    | `2`          |
| `18`    | `1`          |

Then the export line must be:

```text
FWC,1,5(2),7,8,10(2),11(2),18
```
If checkbox **Compact (using ranges)** the output will be compacted as follows:

```text
FWC,1,5(2),7-8,10-11(2),18
```

### Export output usage

The exported content can be:
- Copied to the clipboard.
- Downloaded as a local `.txt` file.
- Reused later as import input.

---

## Export shared stickers requirements

The service must provide an export function that reads current sticker counts from the `COUNTS` named range and produces a shareable text representation composed of two sections: repeated stickers and missing stickers.

The output follows the same export principles as Export all stickers, but applies filtering rules to generate lists intended for sharing with other collectors.

### Output structure

The output consists of two sections.

The first section contains the list of repeated stickers. The second section contains the list of missing stickers. The two sections are separated by a single blank line.

Each section begins with a header line. The header is part of the exported text and is included when copying or downloading the export.

Example:

```text
Output generated by: https://bit.ly/panini-wc2026-gsheet-tracker

🔄 Repeated stickers
MEX,6,7,9,11,14
RSA,1,4,5,8,20
KOR,2,7,8,9,14

❌ Missing stickers
MEX,1,2,3,5,10,20
RSA,2,3,6,7
KOR,1,3,5,13,16
```

With **Compact (using range)** checkbox enabled, the output becomes:
- `7,8,9` → `7-9`
- `1,2,3` → `1-3`

> Notice the output of this services, doesn't include repeats, i.e. `1(2)`.

### Repeated stickers

This section contains all stickers whose stored count is greater than `1`.

- Header of the section: `🔄 Repeated stickers`.
- A repeated sticker is a sticker with count greater than `1`.
- Each sticker is exported only once per country, regardless of how many copies exist.
- Sticker repetition notation is not exported.
- Countries are ordered according to the `COUNTRIES` named range.
- If the user has no repeated stickers, below the header will show: `No repeated stickers available for trade.`

For example, if sticker `7` has a stored count of `3`, the exported value is `7` and not `7(3)`.

### Missing stickers

This section contains all stickers whose stored count is equal to `0`.

- Header of the section: `❌ Missing stickers`.
- A missing sticker is a sticker with count equal to `0`.
- Countries are ordered according to the `COUNTRIES` named range by default.
- If the user has no missing sticker, below the header will show: `No missing stickers, album complete. Congratulations!`.

The user may optionally enable sorting by completion. When enabled, countries in the missing stickers section are ordered using the `DONE` named range in descending order. This sorting applies only to the missing stickers section. The user can select this option by selecting the **Sort by Done (descending) missing stickers** checkbox.

### Common rules

Both sections use the same country line format and export rules defined in Export all stickers.

```text
Format: [flag] CODE,number[,number-range]...
```

The default export output does not include flag icons nor `number-ranges`. 

If the user selects the checkbox **Compact (using ranges)**, then the output is compacted using ranges, instead of `1,2,3` the output will be `1-3`.

If the user explicitly selects the option **Flag**, the flag icon from `FLAG_ICONS` is prefixed to each country line in both sections.

Countries that do not contain any stickers matching the filter criteria for a section are omitted from that section.

### Compact view

The export supports an optional Compact view mode.

When enabled, consecutive sticker numbers are compressed into ranges.

```text
Format: [flag] CODE,sticker-token[,sticker-token]...
```

where a sticker-token is either a number or a number-range.

Examples:
- `1,2,3` → `1-3`
- `1,2,3,7,8,10` → `1-3,7-8,10`

Compact view applies independently to both sections. Compact view is disabled by default.

---

## User interface requirements

The service must provide an HTML dialog opened from the custom spreadsheet menu.

### Menu requirements

Custom menu name:
- `Manage Panini`

Menu options related to this service:
- separator
- `Export all stickers`
- `Export shared stickers`

### Menu behavior

- `Export all stickers` opens the dialog to export all stickers with default options enabled.
- `Export shared stickers` opens the dialog to export the shared list of repeated and missing stickers.

---

### Export all stickers dialog requirements

The export dialog must:

- Load exported sticker data automatically when opened.
- Display the exported content in a text area; if no data is available, the textarea placeholder is cleared and the status message reports zero lines generated.
- Allow the user to download the exported content as a local `.txt` file.
- Allow the user to copy the exported content to the clipboard.
- Allow the user to close the dialog.
- Allow the user to refresh data to update the output based on checkboxes selected.
- Provide a option (checkbox), **Flag**; when selected, the flag emoji is prefixed to each country line in the output. This option is **off by default** — the exported output contains no flag icons unless the user explicitly enables it.
- Provide an option (checkbox), **Compact (using ranges)**; when selected, the consecutive stickers will be compacted using ranges, i.e. `1,2,3` → `1-3` or `1(2),2(2),3(2)` → `1-3(2). This option is **off by default** — the exported output contains no ranges unless the user explicitly enables it.

The export dialog must show only export-related sections and actions.

#### Export all stickers dialog action behavior

- **Download file**
  - Downloads the exported content as a local `.txt` file.
  - Browser settings determine the final download folder, typically the default Downloads folder.

- **Copy**
  - Copies the exported content to the clipboard.

- **Close**
  - Closes the export dialog.
- **Refresh**
  - Refresh output data based on user checkboxes selection.

### Export shared stickers dialog requirements

The Export shared stickers dialog must:

- Load the generated shared list automatically when opened.
- Display the generated content in a text area; if no data is available, the textarea placeholder is cleared and the status message reports zero lines generated.
- Allow the user to download the generated content as a local `.txt` file.
- Allow the user to copy the generated content to the clipboard.
- Allow the user to close the dialog.
- Provide an option (checkbox), **Flag**; when selected, the flag icon is prefixed to each country line in both sections of the output. This option is off by default.
- Provide an option (checkbox), **Sort by Done (descending) missing stickers**; when selected, countries in the Missing stickers section are sorted using the `DONE` named range in descending order. This option is off by default.
- Provide an option, **Compact (using ranges)**; when selected, consecutive sticker numbers are compressed into ranges. This option is off by default.

#### Export shared stickers dialog action behavior

- **Download file**
  - Downloads the generated content as a local `.txt` file.
  - Browser settings determine the final download folder, typically the default Downloads folder.

- **Copy**
  - Copies the generated content to the clipboard.

- **Close**
  - Closes the dialog.

  - **Refresh**
  - Refresh output data based on user checkboxes selection.
  
---