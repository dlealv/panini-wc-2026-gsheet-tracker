# Panini FIFA WC 2026 Import Service Requirements

## Purpose

Provide a Google Apps Script solution for importing  sticker count data in the `Stickers` sheet of the Panini FIFA World Cup 2026 tracker.

The service must allow the user to:
- Import sticker data from text or CSV content.
- Validate input before importing.
- Preview parsed values before writing them.
- Preserve spreadsheet formatting when updating values.

The service is implemented as a spreadsheet-bound Apps Script solution with an HTML dialog opened from the custom spreadsheet menu.

---

## Scope

This service covers:
- Import of sticker counts into the spreadsheet.
- Validation of import syntax and business rules.
- Preview of parsed import values.
- File upload or manual pasting as import input.

This service does not cover:
- Export service
- Quick Sticker Entry behavior.
- Google Forms integration.
- External libraries.
- Web app deployment.
- Add-on publishing.
- Special collections such as Coca-Cola stickers.

---

## Service entry points

This service is accessed from the **Manage Panini** menu through:
- `Import dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`

The service uses: 
- `ImportService.gs` for backend logic
- `Commons.gs` common services used by all services via `StickerSheetRepository` class.
- HTML dialog files:
  - `ImportDialog.html` (main shell).
  - `ImportDialogHelpers.html` (client-side utilities).

---

## Target sheet and named ranges

### Main sheet

- Sheet name: `Stickers`

### Named ranges used by the service

- `COUNTRIES`: country code column to identify country codes.
- `COUNTS`: writable sticker count range in the `Stickers` sheet.

**Note:** Named ranges do not necessarily have to be defined in the same sheet. For example, you can define `COUNTRIES` in the `Conf` tab and `COUNTS` in the `Stickers` tab, but the total number of rows must match across all named ranges used together.

---

## Sticker classification based on its position

Consider the following definitions that the parser must take into account:

- `INVALID_STICKER` (hard invalid): Outside global numeric domain or malformed. Example: `25`, `-1`, `99`. Behavior: report a warning and skip the sticker.
- `OUT_OF_ALBUM_STICKER` (soft invalid / semantic null): Inside numeric domain `[0–20]` but not part of the album mapping for that country. Example: `FWC-20` or `0` for non-`FWC` (team country). `FWC` stickers are a special FIFA sticker category; they do not belong to any competing national team, and their range is `[0-19]`. Example: `MEX,0`, `BRA,0`. Behavior: no warning; mapped to 0; allowed on import.
- `VALID_STICKER`: Stickers in range `[0-20]` with specific cases based on the type of stickers: 
`FWC` from `[0-19]` and for non-`FWC` countries `[1-20]`. Behavior: sticker is accepted; no warning is issued.

`OUT_OF_ALBUM_STICKER` and `VALID_STICKER` are treated by the parser as valid positions.

---

## Import input format

One country per line. The parser supports two input formats:

- Format 1:
  - `MEX,1,2,3(2)` → sticker `3` is repeated `2` times.
  - 🇲🇽 `MEX,1,2,3(3)` → sticker `3` is repeated `3` times.
  - `MEX,1-3` → same as: `MEX,1,2,3`.
  - `MEX,1-3(2)` → same as: `MEX,1(2),2(2),3(2)`.

- Format 2: Similar to the sticker ID on the back of the sticker card.
  - `MEX-1,MEX-2,MEX3` → the dash (`-`) is optional, as in `MEX3`.
  - 🇲🇽 `MEX-1,MEX-9-10` → same as: `MEX-1,MEX-9,MEX-10`.
  - `MEX-1,MEX-9-10(2)` → same as: `MEX-1,MEX-9(2),MEX-10(2)`.

See the **Format 1** and **Format 2** sections below for more details.


### Pre-normalization

**Before any syntax analysis, the parser applies a pre-normalization step to each line:**

1. All non-ASCII characters are stripped (flag emojis are non-ASCII and are removed here, regardless of where they appear in the line).
2. Country codes are normalized to uppercase.
3. The delimiters (`;`, `:`, whitespace) are normalized to `,`.
4. Removes repeated or leading/trailing commas
5. All possible repeat representations (`NxX`, `N(xX)`, `A-BxX`, `A-B(xX)`) are normalized to the canonical repeat forms: `N(X)`, `A-B(X)`.

> All steps carried out during the pre-normalization phase are performed at the line level (pre-tokenization).


### Repeat representation

The parser should allow different ways to represent repeats, as all of them are commonly used.

- Single sticker repeat: `N(X)`, `NxX`, `N(xX)`; all of them denote that sticker `N` is repeated `X` times, where `X > 1`.
- Sticker range repeats: `A-B(X)`, `A-BxX`, `A-B(xX)`; all sticker numbers from `A` to `B` (both inclusive) are repeated `X` times.

In the above cases, the **canonical form** is the first one: `N(X)` or, for ranges, `A-B(X)`.

Examples:

- `1(2)`, `1(x2)`, `1x2` → sticker `1` is repeated twice.
- `1-3(2)`, `1-3(x2)`, `1-3x2` → stickers `1`, `2`, and `3` are repeated twice.

> After the pre-normalization step, all repeats are normalized to the standard canonical form: `N(X)`, `A-B(X)`. **From this point forward in this document, repeats are represented in canonical form only.**

### Syntax rules

All formats enforce the following syntax rules (for simplicity, all examples use Format 1, but the rules apply to both formats):

- Accepted delimiters between tokens are `,` (comma), `;` (semicolon), `:` (colon), and whitespace; all normalized to `,` before parsing.
- All non-ASCII characters are stripped from each line before parsing; flag emojis are removed as part of the normalization process.
- Empty tokens produced by consecutive delimiters (e.g. `FWC,,1,2`) are silently skipped.
- One country per line.
- Country codes are normalized to uppercase before matching against `COUNTRIES`; the parser is case-insensitive.
- Country codes must exist in the `COUNTRIES` named range. Invalid countries are skipped and a warning is reported.
- *First country rule*: The first mandatory token in the country line must be a country code; all stickers belong to this country code.
- `N` sticker number. Sticker number is classified as:
  - `VALID_STICKER` → normal processing.
  - `OUT_OF_ALBUM_STICKER` → accepted, mapped to 0, no warning.
  - `INVALID_STICKER` → skipped with warning.
- `N(X)` sticker number repeated `X` times, where `X > 1` (otherwise skipped and a warning is reported).
- `A-B` sticker range from `A` to `B`, both inclusive, where `A` is less than `B` (otherwise skipped and a warning is reported).
- `A-B(X)` sticker range with repeats. Same as the `A-B` case, but repeated `X` times for each sticker in the range.
- *First-occurrence-wins rule*: The first occurrence is kept in the case of duplicated stickers within the same country line or duplicated country lines (two lines belong to the same country). Skipped stickers and country lines are reported as warnings:
  - *Duplicates*: `MEX,1,1(2),2,3` → `MEX,1,2,3`; sticker `1(2)` is skipped and reported as a warning.
  - *Duplicates in overlapping ranges*: `MEX,1-3,3-5(2)` is expanded internally as `MEX,1,2,3,3(2),4(2),5(2)`; therefore, the second occurrence of sticker `3` (`3(2)`) is skipped and reported as a warning.
  - *Duplicated country lines*: If a line contains `MEX,1,2,3` and another line below contains `MEX,10,11(2),13`, the second line is skipped and reported as a warning.

### Format 1 — Classic (country prefix once)

```text
Format: [flag] CODE,number[,number(repeats)][,number-range][,number-range(repeats)]...
```

Examples:

```text
FWC,1,3,5(2),7
🇲🇽 MEX,18,20
BRA,7(3)
MEX,1-4,8
BRA,5-8(2),10
MEX,1,2,3(2),5-8,10-12(2)
```

### Canonical line form
After pre-normalization and parser transformation, the country line will satisfy the following:

```text
Format: CODE,sticker-token[,sticker-token]...
```

where a `sticker-token` is either `number` or `number(repeats)`.

It is a simplification of Format 1, where sticker ranges were removed and expanded.

> "Canonical line form" refers to the internal representation after parsing and normalization have completed (delimiters unified, codes uppercase, emojis removed, repeats in canonical form, ranges expanded, duplicate stickers resolved, and exclusion processing applied when present).


### Format 2 — Per-sticker country prefix (CODE[-]N)

Each sticker token includes the country code as a prefix. The dash between the code and the sticker number is **optional**.

All current country codes for the Panini WC 2026 album are exactly three characters long; the parser relies on this fixed length to identify the code prefix in Format 2 tokens.

```text
Format: [flag] CODE[-]N[,CODE[-]N(X)][,CODE[-]A-B][,CODE[-]A-B(X)]...
```

Where `CODE[-]` means the country code followed by an optional dash.

> Note: Repeats at this point have been converted into canonical form via the pre-normalization process.

The *First country rule* from the **Syntax rules** section enforces that any country different from the first one in the country line is skipped and reported as a warning. For example, `MEX1,MEX10,BRA10,ARG10,MEX20` results in `MEX1,MEX10,MEX20`, and stickers `BRA10` and `ARG10` are skipped and reported as warnings.

Examples:

```text
MEX-1,MEX-5,MEX-10
MEX1,MEX5,MEX10
🇲🇽 MEX-1,MEX-3-5(2)
MEX1,MEX3-5(2)
MEX-1,MEX-5(2),MEX-10
FWC-1,FWC-3-5(2)
FWC1,FWC3-5(2)
```

### Range interpretation examples

> All range tokens are expanded into individual sticker entries during parser transformation, before validation and deduplication.

- `1-4` → stickers `1,2,3,4`.
- `1-4(2)` → stickers `1(2),2(2),3(2),4(2)`.
- `MEX-3-5` → stickers `3,4,5`.
- `MEX-3-5(2)` → stickers `3(2),4(2),5(2)`.
- `MEX3-5` → stickers `3,4,5`.
- `MEX3-5(2)` → stickers `3(2),4(2),5(2)`.

### Duplicate sticker and range overlap

All range tokens are expanded to individual sticker numbers before deduplication. A sticker number that appears more than once for the same country—whether due to explicit duplicates or overlapping ranges—is resolved by the first-occurrence-wins rule: the first occurrence is kept, and the duplicate is skipped with a warning.

Duplicate warnings for the same line are consolidated into a single warning listing all affected sticker numbers.

Examples:

| Input | Result | Warning |
| --- | --- | --- |
| `MEX,1,1,2` | `MEX,1,2` | sticker `1` duplicated |
| `MEX,1,2(2),2` | `MEX,1,2(2)` | sticker `2` duplicated |
| `MEX,1-3,3-4` | `MEX,1,2,3,4` | sticker `3` duplicated |
| `MEX,1-3(2),3-5(3)` | `MEX,1(2),2(2),3(2),4(3),5(3)` | sticker `3(3)` duplicated |
| `MEX,1,1,2,2,3,3` | `MEX,1,2,3` | stickers `1,2,3` duplicated (single consolidated warning) |


### Sticker mapping rules for import

- If a sticker token is written as `N`, its mapped count is `1`, unless a special sticker rule applies.
- If a sticker token is written as `N(X)`, its mapped count is `X`, unless a special sticker rule applies.
- If a sticker token is written as `A-B`, it is first expanded into individual sticker numbers during parser transformation; each resulting sticker is then mapped to `1`, unless a special sticker rule applies.
- If a sticker token is written as `A-B(X)`, each sticker in the inclusive range is mapped as if written individually with count `X`, unless a special sticker rule applies.
- Sticker `0` only exists for `FWC`; for other country codes it is accepted as input and silently mapped to count `0`.
- Sticker `20` only exists for non-`FWC` country codes; for `FWC` it is accepted as input and silently mapped to count `0`.

See **Sticker classification based on its position** for the complete definition of valid positions.

### Mapping examples

| Input file value | Count stored in the tracker |
| --- | --- |
| `FWC,0` | sticker `0` → `1` |
| `FWC,0(2)` | sticker `0` → `2` |
| `MEX,0` | sticker `0` → `0` (silently) |
| `MEX,0(5)` | sticker `0` → `0` (silently) |
| `FWC,20` | sticker `20` → `0` (silently) |
| `FWC,20(3)` | sticker `20` → `0` (silently) |
| `MEX,20` | sticker `20` → `1` |
| `MEX,20(3)` | sticker `20` → `3` |
| `MEX,1-3` | stickers `1,2,3` → `1,1,1` |
| `BRA,5-7(2)` | stickers `5,6,7` → `2,2,2` |
| `MEX-1,MEX-3-5` | stickers `1,3,4,5` (after expansion) → `1,1,1,1` |
| `MEX1,MEX3-5(2)` | stickers `1,3,4,5` (after parser transformation and range expansion) → `1,2,2,2` |


### Exclusion operator

The exclusion operator allows a collector to import only the stickers they are missing, instead of listing all the stickers they own. Since all non-ASCII characters and whitespace are stripped before parsing (pre-normalization), the operator must appear at the very beginning of the line, immediately before the first country code token.

The operator may be applied to any valid import line, regardless of format (Format 1, Format 2, or mixed).

The parser computes the complement after the line has been fully parsed and normalized, including range expansion, sticker validation, and duplicate sticker resolution within the line. Duplicate stickers continue to generate warnings according to the normal duplicate rules before the complement is computed. The exclusion operator takes all valid sticker positions for the country (see **Sticker classification based on its position**) and removes the explicitly listed sticker numbers, then imports the resulting set with count `1`. Repeats are not taken into account in this case, since it does not make sense to specify missing stickers using repeat counts.

> Repeat values, if present in an exclusion line, are silently ignored — the complement always assigns a count of `1` to each resulting sticker position.

#### Supported operator symbols

The following operator symbols are equivalent and interchangeable:

| Symbol | Background |
| --- | --- |
| `<>` | Spreadsheet users (Google Sheets / Excel not-equal operator) |
| `!=` | JavaScript / Java developers |
| `^` | Regex / set-complement notation |

#### Exclusion operator syntax

The operator prefix may be applied to any valid import line format:

```text
<OPERATOR> CODE,number[,number(repeats)][,start-end][,start-end(repeats)]...   (Format 1)
<OPERATOR> CODE[-]N[,CODE[-]N(X)][,CODE[-]A-B][,CODE[-]A-B(X)]...              (Format 2)
```

#### Exclusion examples

| Input | Equivalent (stickers imported) |
| --- | --- |
| `<>MEX,1,2,3` | `MEX,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20` |
| `<>MEX,1,MEX-5-7` | `MEX,2,3,4,8,9,10,11,12,13,14,15,16,17,18,19,20` |
| `<>MEX,1(2),MEX-5-7(2)` | same as `<>MEX,1,MEX-5-7` (previous row); repeats are ignored |
| `<>FWC,1-10,12-19` | `FWC,0,11` |
| `!=MEX,1,2,3` | `MEX,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20` |
| `^MEX1,MEX2,MEX3` | `MEX,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20` |

#### Exclusion operator validation rules

- The operator must appear only at the start of the line, immediately before the first country code token.
- If more than one operator symbol appears at the start of a line, only the first is recognized; the remainder are silently ignored.
- An exclusion line must contain at least one sticker token after the country code; if no sticker tokens are present, the line is skipped and a warning is issued. To import all stickers for a country, use the explicit form `CODE,1-20` (or `FWC,0-19`) instead.
- If the exclusion results in an empty set (all valid positions excluded), the line produces no sticker entries and a warning is issued.
- Repeat counts in exclusion lines are silently ignored; the complement always uses count `1`.

### Import validation rules

The import parser is designed to be flexible: it does not abort the entire import process for recoverable situations. Instead, it distinguishes between **strict rules** that stop the process and **flexible rules** that skip the affected line or token and collect a warning.

#### Strict rules — stop on first occurrence, report an error

- The overall input is empty.
- A line contains an unrecognized structure that cannot be classified as any known format.
- After all flexible skips are applied, no valid sticker entries remain to import.

#### Flexible rules — skip and continue, collect a warning

| Condition | Behavior |
| --- | --- |
| Country code does not exist in `COUNTRIES` | Line skipped; warning reported |
| Invalid country code format | Line skipped; warning reported |
| `INVALID_STICKER` | Token skipped; warning reported |
| `OUT_OF_ALBUM_STICKER` (e.g. `MEX,0` or `FWC,20`) | Silently mapped to `0`; no warning reported |
| Invalid or non-integer repeat value | Token skipped; warning reported |
| Invalid range order (`start > end` before expansion) | Token skipped; warning reported |
| Mismatched per-sticker country code prefix in a Format 2 token (e.g. in `MEX-1,BRA-2,MEX-3`, `BRA-2` is skipped) | Token skipped; warning reported |
| A country line is repeated in the input | First occurrence is used; duplicate line skipped; warning reported |
| A sticker number appears more than once for the same country, including via overlapping ranges (e.g. `MEX,1,1,2`; `MEX,1-3,3-4`; `MEX,1-3(2),3-5(3)`) | First occurrence is used; duplicate token skipped; all duplicates in the same line are consolidated into a single warning |
| Exclusion line with no sticker tokens | Line skipped; warning reported |
| Exclusion result is an empty set | Line produces no entries; warning reported |

### Warning reporting

All warnings accumulated during validation or import are reported to the user together at the end of the operation.

The validation process does not stop when a warning is raised; it continues and collects all warnings in a single output.

### Error and warning messages

All error and warning messages use the pattern `Country "ABC": description` to identify the affected country as context.

Duplicate country warnings additionally include a snippet of the line (country code plus up to the first two sticker tokens) and the line number to help the user locate the entry in large inputs.

Example:

`Country "MEX": starting with MEX,1,20 (line 4) duplicate country "MEX" ignored; first occurrence wins.`

### Import modes

The service must provide three loading modes.

#### 1. Import data

- Clears all values in `COUNTS`.
- Imports all provided input data.

#### 2. Update counts clearing country counts

- Clears only the sticker count cells in `COUNTS` for countries present in the input.
- Imports the provided values for those same countries.
- Other countries remain unchanged.

#### 3. Update counts

- Does not clear any existing values before import.
- Updates only sticker positions explicitly provided in the input.
- All other sticker counts for the country remain unchanged.

> For countries being processed by the import operation, OUT_OF_ALBUM_STICKER positions are always silently populated with `0`, regardless of whether the user explicitly provided them.

### Data writing requirements

During import:

- Only values must be written.
- Existing formatting must be preserved.
- No formulas or formatting outside the target cells should be modified.

### Import preview requirements

The service must provide a preview step before writing values to the sheet.

Preview behavior:
- Validates the input using the same rules as import.
- Parses the data into the same mapped values that would be written.
- Does not modify the sheet.
- Returns countries and sticker counts in a UI-friendly structure.
- Includes all collected warnings alongside the preview result.

The preview is used by the dialog action **Validate / Preview**.
Clicking **Import** directly triggers the same validation pipeline silently before writing.

---

## User interface requirements

The service must provide an HTML dialog opened from the custom spreadsheet menu.

### Menu requirements

Custom menu name:
- `Manage Panini`

Menu options related to this service:
- `Import dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`

### Menu behavior

- `Import dialog` opens the dialog in import mode with the default import mode preselected.
- `Import data` opens the dialog in import mode with **Import data** preselected.
- `Update counts clearing country counts` opens the dialog in import mode with that mode preselected.
- `Update counts` opens the dialog in import mode with that mode preselected.

### Import dialog requirements

The import dialog must allow the user to:
- Upload a file.
- Paste input text.
- Select a loading mode.
- Validate and preview the parsed result.
- Clear the input.
- Import the data.
- Cancel the dialog.

The import dialog must show only import-related sections and actions.

#### Import dialog action behavior

- **Validate / Preview**
  - Validates syntax and business rules.
  - Shows the mapped values without writing to the sheet.
  - Displays all collected warnings (e.g. skipped unknown country codes, skipped duplicate stickers).
  - Displays the first error encountered, if any, and stops; the user must correct the input and try again.

- **Clear**
  - Clears the selected file.
  - Clears pasted text.
  - Clears the preview and message.
  - Resets controls to a usable state.

- **Import**
  - Runs the same validation pipeline as **Validate / Preview** before writing.
  - Imports validated data using the selected loading mode.

- **Cancel**
  - Closes the dialog without importing.

---