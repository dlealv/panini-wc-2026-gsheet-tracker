# Panini FIFA WC 2026 Sticker Data Management Requirements

## Purpose

Provide a Google Apps Script solution for managing sticker count data in the `Stickers` sheet of the Panini FIFA World Cup 2026 tracker.

The solution must allow the user to:

- import sticker data from text/CSV content
- export existing sticker data back into the same text format
- validate input before importing
- preserve existing spreadsheet formatting when updating values

The solution is implemented as a spreadsheet-bound Apps Script with an HTML dialog opened from a custom spreadsheet menu.

---

## Scope

This solution covers:

- import of sticker counts into the spreadsheet
- export of sticker counts from the spreadsheet
- validation of import syntax
- preview of parsed import values
- file upload or manual paste as import input
- local download of exported data
- clipboard copy of exported data

This solution does not require:

- Google Forms
- external libraries
- web app deployment
- add-on publishing

---

## Target sheet and named ranges

### Main sheet
- Sheet name: `Stickers`

### Named ranges used by the solution
- `COUNTRIES`: country code column in the `Stickers` sheet
- `COUNTS`: writable sticker count range in the `Stickers` sheet

### Data used for export
- Export reads the country codes from `COUNTRIES`
- Export reads the sticker counts from `COUNTS`

---

## Import input format

One country per line.

General syntax:

```text
CODE,number[,number(repeats)]...
```

Examples:

```text
FWC,1,3,5(2),7
MEX,18,20
BRA,7(3)
```

### Syntax rules

- The first token must be a country code.
- Country codes must exist in the `COUNTRIES` named range.
- Values must be separated only by commas `,`.
- A sticker token must be:
  - `N`
  - or `N(X)`
- `N` is the sticker number.
- `X` is the count or repeat value.
- Repeats in parentheses are optional.

---

## Sticker mapping rules for import

- If a sticker token is written as `N`, its mapped count is `1`, unless a special sticker rule applies.
- If a sticker token is written as `N(X)`, its mapped count is `X`, unless a special sticker rule applies.
- Sticker `0` only exists for `FWC`. For other country codes it is accepted as input and mapped to count `0`.
- Sticker `20` only exists for non-`FWC` country codes. For `FWC` it is accepted as input and mapped to count `0`.

### Examples

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
- the same country code cannot appear more than once in the same import
- the same sticker number cannot appear more than once for the same country in the same line

If validation fails, the process must stop and return a clear error message including the line number.

---

## Import modes

The solution must provide 3 loading modes.

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

## Data writing requirements

During import:

- Only values must be written
- Existing formatting must be preserved
- No formulas or formatting outside the target cells should be modified

---

## Export requirements

The solution must provide an export function that reads current sticker counts from the `COUNTS` named range and country codes from the `COUNTRIES` named range, and produces text in the same general syntax accepted by the import process.

### Export format

One country per line.

General format:

```text
CODE,number[,number(repeats)]...
```

### Export rules

- Country code is read from `COUNTRIES`
- Sticker counts are read from `COUNTS`
- Only sticker counts greater than `0` are exported
- Exported sticker values follow these rules:
  - count `1` → export as `number`
  - count greater than `1` → export as `number(repeats)`
- Sticker positions that are not valid for a given country code are treated as count `0`

### Export examples

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

The solution must provide an HTML dialog opened from a custom spreadsheet menu.

---

## Menu requirements

Custom menu name:

- `Manage Panini`

Menu options:

- `Open Import Dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`
- `Export Stickers`

### Menu behavior

- `Open Import Dialog` opens the import dialog with the default mode preselected
- `Import data` opens the import dialog with **Import data** preselected
- `Update counts clearing country counts` opens the import dialog with that mode preselected
- `Update counts` opens the import dialog with that mode preselected
- `Export Stickers` opens the export dialog

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
  - clears preview and messages
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

The solution does not need to force saving into a specific local folder, because that depends on browser behavior.

---

## Error handling requirements

The solution must return clear messages for user-facing errors, including cases such as:

- empty input
- invalid country code format
- unknown country code
- invalid delimiter
- invalid sticker token format
- invalid sticker number range
- invalid repeat value
- duplicate country code in the same import
- duplicate sticker number for the same country
- export failure
- file read failure
- clipboard copy failure
- download start failure

Error messages should be concise and understandable by a spreadsheet user.

---

## Technical design guidelines

- Use a class-based Apps Script design
- Separate responsibilities between:
  - import and export orchestration
  - input parsing
  - dialog UI
- Reuse shared configuration and sheet metadata where possible
- Keep inline code documentation concise and focused on maintainability
- No external libraries are required for import or export
- File download is handled client-side in the HTML dialog using browser-supported JavaScript APIs

---

## Non-goals

The solution does not need to:

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
3. Open the import dialog
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
