# Panini FIFA WC 2026 Import / Export Service Requirements

## Purpose

Provide a Google Apps Script solution for importing and exporting sticker count data in the `Stickers` sheet of the Panini FIFA World Cup 2026 tracker.

The service must allow the user to:
- import sticker data from text or CSV content
- export existing sticker data back into the same text format
- validate input before importing
- preview parsed values before writing them
- preserve spreadsheet formatting when updating values

The service is implemented as a spreadsheet-bound Apps Script solution with an HTML dialog opened from the custom spreadsheet menu.

---

## Scope

This service covers:
- import of sticker counts into the spreadsheet
- export of sticker counts from the spreadsheet
- validation of import syntax and business rules
- preview of parsed import values
- file upload or manual paste as import input
- local download of exported data
- clipboard copy of exported data

This service does not cover:
- Quick Sticker Entry behavior
- Google Forms integration
- external libraries
- web app deployment
- add-on publishing

---

## Service entry points

This service is accessed from the **Manage Panini** menu through:
- `Open Import / Export Dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`
- `Export Stickers`

The service uses the combined `ImportExportDialog.html` template and backend logic encapsulated in `ImportExportService.gs`.

---

## Target sheet and named ranges

### Main sheet

- Sheet name: `Stickers`

### Named ranges used by the service

- `COUNTRIES`: country code column
- `COUNTS`: writable sticker count range in the `Stickers` sheet
- `FLAG_ICONS` flag icons column
**Note:** Named ranges don’t necessarily have to be defined in the same sheet. For example, you can define `COUNTRIES` in the `Conf` tab and `COUNTS` in the `Stickers` tab, but the total number of rows for these named ranges should be the same.

### Data used for export

- Export reads country codes from `COUNTRIES`
- Export reads sticker counts from `COUNTS`
- Export reads flag icons from `FLAG_ICONS`

---

## Import input format

One country per line.

General syntax:

```text
Format: [flag] CODE,number[,number(repeats)][,start-end][,start-end(repeats)]...
```

Examples:

```text
FWC,1,3,5(2),7
MEX,18,20
BRA,7(3)
MEX,1-4,8
🇲🇽 MEX,1,2,3(2),5-8,10-12(2)
BRA,5-8(2),10
```

### Syntax rules

- The first mandatory token must be a country code, the flag icon is optional
- The parser will skip flag icon if present
- Country codes must exist in the `COUNTRIES` named range
- Flag icon most exist in the `FLAG_ICON` named range
- Values must be separated only by commas `,`
- A sticker token must be:
  - `N`
  - `N(X)`
  - `A-B`
  - `A-B(X)`
- `N` is one sticker number
- `X` is the count or repeat value
- `A-B` is an inclusive sticker range
- `A-B(X)` applies the same repeat count to each sticker in the inclusive range
- Single sticker values are supported. Repeats in parentheses and sticker ranges are optional

### Range interpretation examples

- `1-4` is interpreted as stickers `1,2,3,4`
- `1-4(2)` is interpreted as stickers `1(2),2(2),3(2),4(2)`

---

## Sticker mapping rules for import

- If a sticker token is written as `N`, its mapped count is `1`, unless a special sticker rule applies
- If a sticker token is written as `N(X)`, its mapped count is `X`, unless a special sticker rule applies
- If a sticker token is written as `A-B`, each sticker in the inclusive range is mapped as if written individually with count `1`, unless a special sticker rule applies
- If a sticker token is written as `A-B(X)`, each sticker in the inclusive range is mapped as if written individually with count `X`, unless a special sticker rule applies
- Sticker `0` only exists for `FWC`. For other country codes it is accepted as input and mapped to count `0`
- Sticker `20` only exists for non-`FWC` country codes. For `FWC` it is accepted as input and mapped to count `0`

### Mapping examples

| Input file value | Count stored in the tracker |
| --- | --- |
| `FWC,0` | sticker `0` → `1` |
| `FWC,0(2)` | sticker `0` → `2` |
| `MEX,0` | sticker `0` → `0` |
| `MEX,0(5)` | sticker `0` → `0` |
| `FWC,20` | sticker `20` → `0` |
| `FWC,20(3)` | sticker `20` → `0` |
| `MEX,20` | sticker `20` → `1` |
| `MEX,20(3)` | sticker `20` → `3` |
| `MEX,1-3` | stickers `1,2,3` → `1,1,1` |
| `BRA,5-7(2)` | stickers `5,6,7` → `2,2,2` |

---

## Import validation rules

The import process must validate:
- the input is not empty
- each non-empty line contains at least:
  - one country code
  - one sticker token
- the country code format is valid
- the country code exists in the `COUNTRIES` named range
- comma is the only accepted delimiter
- each sticker token uses valid syntax
- sticker numbers are within range `0..20`
- repeat values, if present, are non-negative integers
- range start and range end are valid integers
- range start must be less than or equal to range end
- the same country code cannot appear more than once in the same import
- the same sticker number cannot appear more than once for the same country in the same line, including after range expansion

If validation fails, the process must stop and return a clear error message including the line number.

---

## Import modes

The service must provide 3 loading modes.

### 1. Import data

- Clears all values in `COUNTS`
- Imports all provided input data

### 2. Update counts clearing country counts

- Clears only the sticker count cells in `COUNTS` for countries present in the input
- Imports the provided values for those same countries
- Other countries remain unchanged

### 3. Update counts

- Does not clear any existing values before import
- Updates only sticker positions explicitly provided in the input
- All other sticker counts for the country remain unchanged

---

## Import preview requirements

The service must provide a preview step before writing values to the sheet.

Preview behavior:
- validates the input using the same rules as import
- parses the data into the same mapped values that would be written
- does not modify the sheet
- returns countries and sticker counts in a UI-friendly structure

The preview is used by the dialog action **Validate / Preview**.

---

## Data writing requirements

During import:
- only values must be written
- existing formatting must be preserved
- no formulas or formatting outside the target cells should be modified

---

## Export requirements

The service must provide an export function that reads current sticker counts from the `COUNTS` named range and country codes from the `COUNTRIES` named range, and produces text in the same general syntax accepted by import.

### Export format

One country per line.

General format:

```text
[flag] CODE,number[,number(repeats)]...
```

### Export rules

- Include flag icons before the country code if the user selected this option
- Country code is read from `COUNTRIES`
- Sticker counts are read from `COUNTS`
- Flag icons are read from `FLAG_ICONS`
- Only sticker counts greater than `0` are exported
- Export must include only sticker positions valid for the selected country code
- Exported sticker values follow these rules:
  - count `1` → export as `number`
  - count greater than `1` → export as `number(repeats)`
- Sticker `0` must be exported only for `FWC`
- Sticker `20` must be exported only for non-`FWC` country codes
- Invalid sticker positions must never appear in exported output, even if the sheet contains a positive stored value

Examples:
- `MEX,0` must never appear in exported output
- `FWC,20` must never appear in exported output

### Export example

If the tracker contains these counts for country code `FWC`:

| Sticker | Stored count |
| --- | --- |
| `1` | `1` |
| `5` | `2` |
| `18` | `1` |

then the export line must be:

```text
FWC,1,5(2),18
```

### Export output usage

The exported content can be:
- copied to clipboard
- downloaded as a local `.txt` file
- reused later as import input

---

## User interface requirements

The service must provide an HTML dialog opened from the custom spreadsheet menu.

### Menu requirements

Custom menu name:

- `Manage Panini`

Menu options related to this service:

- `Open Import / Export Dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`
- `Export Stickers`

### Menu behavior

- `Open Import / Export Dialog` opens the dialog in import mode with the default import mode preselected
- `Import data` opens the dialog in import mode with **Import data** preselected
- `Update counts clearing country counts` opens the dialog in import mode with that mode preselected
- `Update counts` opens the dialog in import mode with that mode preselected
- `Export Stickers` opens the dialog in export mode

---

## Import dialog requirements

The import dialog must allow the user to:
- upload a file
- paste input text
- select a loading mode
- validate and preview the parsed result
- clear the input
- import the data
- cancel the dialog

The import dialog must show only import-related sections and actions.
Export-only controls must not be shown in import mode.

### Import dialog action behavior

- **Validate / Preview**
  - validates syntax and business rules
  - shows the mapped values without writing to the sheet

- **Clear**
  - clears selected file
  - clears pasted text
  - clears preview and message
  - resets controls to a usable state

- **Import**
  - imports validated data using the selected loading mode

- **Cancel**
  - closes the dialog without importing

---

## Export dialog requirements

The export dialog must:
- load exported sticker data automatically when opened
- display the exported content in a text area
- allow the user to download the exported content as a local `.txt` file
- allow the user to copy the exported content to the clipboard
- allow the user to close the dialog
- Allow users to decide whether the export will include or not the flag icon before each country code. If the user selects the option “Include flag icon before country code,” the icon flag will be populated for each country code. Otherwise, the flag icon is not populated (default).

The export dialog must show only export-related sections and actions.
Import-only controls must not be shown in export mode.

### Export dialog action behavior

- **Download file**
  - downloads the exported content as a local `.txt` file
  - browser settings determine the final download folder, typically the default Downloads folder

- **Copy**
  - copies the exported content to the clipboard

- **Close**
  - closes the export dialog

---

## File handling requirements

### Import input

The user must be able to provide import data in either of these ways:
- upload a `.txt` or `.csv` file
- paste the content manually into the input area

### Export output

The user must be able to:
- copy exported content manually
- download exported content as a local `.txt` file without using external libraries

The service does not need to force saving into a specific local folder, because that depends on browser behavior.

---

## Error handling requirements

The service must return clear messages for user-facing errors, including cases such as:
- empty input
- invalid country code format
- unknown country code
- invalid delimiter
- invalid sticker token format
- invalid sticker number range
- invalid repeat value
- invalid range syntax
- invalid range order
- duplicate country code in the same import
- duplicate sticker number for the same country
- export failure
- file read failure
- clipboard copy failure
- download start failure

Error messages should be concise and easily understandable for spreadsheet users. For instance, if the error pertains to data values, include the country code as a reference. Conversely, if the error is related to the country code, provide the line number.

---

## Technical design guidelines

- Use a class-based Apps Script design
- Separate responsibilities between:
  - service orchestration
  - input parsing
  - dialog UI
  - shared spreadsheet access
- Reuse shared configuration and sheet metadata where possible
- Keep inline documentation concise and focused on maintainability
- No external libraries are required for import or export
- File download is handled client-side in the HTML dialog using browser-supported JavaScript APIs

### Expected module responsibilities

- `Code.gs`
  - menu creation
  - dialog opening
  - thin wrapper functions callable by the HTML dialog

- `ImportExportService.gs`
  - import/export service orchestration
  - preview generation
  - import execution
  - export generation

- `Commons.gs`
  - shared sheet access
  - named range validation
  - common metadata and lookup support

- `ImportExportDialog.html`
  - import/export user interface
  - client-side file handling
  - preview rendering
  - copy and download actions

---

## Non-goals

The service does not need to:
- use Google Forms
- publish as a web app
- publish as a Google Workspace add-on
- force-save exported files into a specific local folder
- modify spreadsheet formatting during import
- support delimiters other than comma
- support sticker numbers outside the range `0..20`

---

## Expected user workflow

### Import workflow

1. Open the spreadsheet
2. Open the custom menu `Manage Panini`
3. Open the import/export dialog
4. Upload a file or paste input data
5. Choose the desired loading mode
6. Run **Validate / Preview**
7. If validation succeeds, run **Import**

### Export workflow

1. Open the spreadsheet
2. Open the custom menu `Manage Panini`
3. Select **Export Stickers**
4. Wait for the exported content to load
5. Either:
   - use **Download file**, or
   - use **Copy**
6. Close the dialog when finished
