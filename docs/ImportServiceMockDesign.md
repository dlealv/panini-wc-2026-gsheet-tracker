# Import Service Mock Design

## 1. Purpose

This document defines the proposed user interface for the Import service.

It complements the functional requirements described in [ImportServiceRequirements.md](ImportServiceRequirements.md) by illustrating the user interface, screen layout, and user interactions for both desktop and mobile implementations.

The mockups presented in this document are intended to:

- Visualize the import workflow (upload/paste, mode selection, preview, import).
- Define the organization of user interface elements.
- Ensure a consistent user experience across desktop and mobile devices.
- Serve as a reference during implementation.

Business rules, parsing/normalization, validation, and `COUNTS` writing behavior are defined in [ImportServiceRequirements.md (ImportServiceRequirements.md) and are not repeated in this document.

---

## 2. Desktop Mockups

### 2.1 Import dialog

The **Import dialog** is displayed when the user selects one of the Import-related options from the **Manage Panini** custom menu (`Update counts`, `Update counts clearing country counts`, `Import data`). Each entry point opens the same dialog with a different loading mode preselected.

This is the main view of the Import service. It allows the user to:

- Upload a `.txt`/`.csv` file, or paste input text directly.
- Select a loading mode.
- Validate and preview the parsed result before writing anything.
- Clear the input.
- Import the data.
- Cancel without making changes.

The dialog has two states:

- **Initial state**, displayed when the dialog is first opened (no Messages section shown yet).
- **Previewed/imported state**, displayed after **Validate / Preview** or **Import** has been run at least once.

The dialog remains open throughout the validation and import process.

#### Initial state

Example layout:

```text
  Import stickers count                                                     [ Cancel ]

  Sticker data                                                        
  Load a text/CSV file or paste its content. Data will be written to  the COUNTS named 
  range in the Stickers tab, preserving formatting.  
+-------------------------------------------------------------------------------------+
| 1) Upload file                                                                      |
| Select a .txt or .csv file   [ Choose File ]                                        |
| When a file is selected, its content will be loaded into the                        |
| text area below.                                                                    |
+-------------------------------------------------------------------------------------+
+-------------------------------------------------------------------------------------+
| 2) Or paste content                                                                 |
| Input data                                                               [ Clear ]  |
| +--------------------------------------------------------------------------------+  |
| | Input data                                                                     |  |
| | MEX,1,3-5,10                                                                   |  |
| | BRA-1,BRA-5(2),BRA3                                                            |  |
| | <>FWC,1-10,12-19                                                               |  |
| +--------------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------+
+-------------------------------------------------------------------------------------+
| Input format [ⓘ]                                                                   |
| | Format     | Example              | Note                                          |
| --------------------------------------------------------------------------------    | 
|   Format 1    MEX,1,3-7,10(2)        Country code once; comma-separated             |
|                                      stickers, ranges (3-7), repeats (10(2))        |                    
|                                      repeats                                        |
|   Format 2    MEX-1,MEX-5(2),MEX3    Country prefix per sticker; dash is            |
|                                      optional (as in MEX3)                          |
|   Exclusion   <>MEX,1,2,3            Imports all stickers except those listed;      | 
|                                      use != or ^ instead of <>                      |
+-------------------------------------------------------------------------------------+
+-------------------------------------------------------------------------------------+
| 3) Loading mode                                                                     |
| Choose how to apply the load                                                        |
| [ Update counts                                                                 ▼ ] |
|  - Update counts: overwrites only the positions explicitly                          |
|    provided; all other values remain unchanged.                                     |
|  - Update counts clearing country counts: clears only the rows for                  |
|    countries in the input, then loads those countries.                              |
|  - Import data: clears all values in COUNTS, then loads the input.                  |
+-------------------------------------------------------------------------------------+
+-------------------------------------------------------------------------------------+
| Actions                                                                             |
| [ Validate / Preview ] [ Clear ] [ Import ] [ Cancel ]                              |
|  - Validate / Preview: checks syntax and shows how values will be                   |
|    mapped without writing to the sheet.                                             |
|  - Clear: removes the selected file, clears the pasted input, clears the preview,   | 
|       and resets the message.                                                       |
|  - Import: writes the validated values to the sheet using the selected loading mode.| 
|       Validation runs automatically before writing.                                 |
|  - Cancel: closes the dialog without importing anything.                            |
|                                                                                     |
| 📌 Tip: use Validate / Preview first to confirm how counts will be                  |
|         mapped before importing.                                                    |
+-------------------------------------------------------------------------------------+
```

Depending on the action taken from the **Manage Panini** the dropdown will be pre-assigned to corresponding selection:
1. Update counts  $\rightarrow$ Update counts.
2. Update counts clearing country counts $\rightarrow$ Update counts clearing country counts.
3. Import data  $\rightarrow$ Import data.

The user can change this preset from any of the import options selected from **Manage Panini**.

#### Previewed/imported state

After **Validate / Preview** or **Import** is run, the **Messages** section appears between the **Loading mode** section and **Actions**, showing the result message, any warnings, and (for preview) the mapped preview output.

Example layout of the message section:

```text
+-------------------------------------------------------------------------------------+
| 3) Loading mode                                                                     |
| ...                                                                                 |
+-------------------------------------------------------------------------------------+
+-------------------------------------------------------------------------------------+
| Messages                                                                            |
| Validation successful.                                                              |
| ⚠ Country "XYZ": unknown country code, line skipped.                                |
| ⚠ Country "MEX": sticker 1 duplicated.                                              |
| +-------------------------------------------------------------------------------+   |
| | MEX -> 1:1, 3:1, 4:1, 5:1                                                     |   |
| | BRA -> 1:1, 3:1, 5:2                                                          |   |
| | FWC -> 0:1, 11:1                                                              |   |
| +-------------------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------------+
+-------------------------------------------------------------------------------------+
| Actions                                                                             |
| [ Validate / Preview ] [ Clear ] [ Import ] [ Cancel ]                              |
| ...                                                                                 |
+-------------------------------------------------------------------------------------+
```

User interface elements:

- **Upload file**
  - Lets the user select a `.txt` or `.csv` file from disk.
  - On selection, the file content is loaded into the **Input data** text area (does not import automatically).

- **Input data**
  - Multi-line text area for pasting or reviewing import input.
  - Accepts Format 1, Format 2, and the exclusion operator, mixed freely across lines.
  - A **Clear** button sits inline with the label for immediate discoverability which resets the input data and if any validation output exist. It doesn't change the input mode pre-selected by the specific input mode or selected by the user.

- **Input format**
  - Compact three-row reference table (Format 1, Format 2, Exclusion) always visible inline.
  - **ⓘ** button opens the full **Input format guide** modal (see §2.2) with the complete rule set and additional examples.

- **Loading mode**
  - Dropdown with the three modes defined in [ImportServiceRequirements.md](ImportServiceRequirements.md#import-modes): `Update counts`, `Update counts clearing country counts`, `Import data`.
  - The mode preselected depends on which **Manage Panini** menu entry was used to open the dialog.
  - Inline hint text under the dropdown summarizes each mode's clearing behavior.

- **Messages**
  - Hidden until the first **Validate / Preview** or **Import** action.
  - Displays the result/status message, all collected warnings, and — for **Validate / Preview** — the mapped preview output per country. The output uses color to differentiate each type of information:
    - The validation output, in case of no error is indicated in green color: 'Validation successful.'.
    - If any error during the process happened, the message is indicated with red font color.
    - Warning (each prefixed `⚠`) are highlighted with orange font color after the validation message.
    - Validation output in gray background and using monospace font.
  - Cleared at the start of every **Validate / Preview** or **Import** call, before the new result is rendered.

- **Validate / Preview**
  - Runs the same validation/parsing pipeline used by **Import**, without writing to the sheet.
  - Shows the first blocking error and stops, if any; otherwise shows all warnings plus the mapped preview.

- **Clear**
  - Clears the selected file, the pasted text, the preview, and the message section;
  - It doesn't change the input mode pre-selected by the specific input mode or selected by the user.

- **Import**
  - Re-runs validation silently, then writes the validated data to
    `COUNTS` using the selected loading mode.
  - Reports the same message/warning structure as **Validate / Preview**.

- **Cancel**
  - Closes the dialog without importing anything.

### 2.2 Input format guide modal

The **Input format guide** modal is displayed when the user selects the
**ⓘ** button next to the **Input format** section header.

This view gives the complete format reference so the compact inline table
in the dialog doesn't need to carry every rule and example.

Example layout:

```text
 Input format guide                                    (+info)  [ Close ]
+----------------------------------------------------------------------+
| Common rules                                                         |
| • Delimiters: comma, semicolon, colon, or whitespace.                |
| • Repeats: N(X) or N(xX) or NxX; sticker N owned X times.            |
| • Range: A-B is an inclusive range from A to B (A < B).              |
| • Range repeats: A-B(X) or A-B(xX) or A-BxX; stickers A-B owned X    |
|   times.                                                             |
| • Non-ASCII characters (e.g. flag emojis) are stripped automatically.|
|                                                                      |
| ▾ Format 1 — country code once                                       |
|   CODE,N[,N(X)][,A-B][,A-B(X)]...                                    |
|   MEX,1,3-7,10(2) → MEX,1,3,4,5,6,7,10(2)                            |
|   FWC,0,1,3-5(2) → FWC,0,1,3(2),4(2),5(2)                            |
|                                                                      |
| ▸ Format 2 — country prefix per sticker                              |
|                                                                      |
| ▸ Exclusion operator — import missing stickers                       |
|                                                                      |
| [ Close ]                                                            |
+----------------------------------------------------------------------+
```

On open only the Format 1 is the only section expected, Format 2 and Exclusion operator are collapsed. Here is the content of the collapsed section:

Format 2:
```text
| ▾ Format 2 — country prefix per sticker                                   |
|    CODE[-]N[,CODE[-]N(X)][,CODE[-]A-B][,CODE[-]A-B(X)]...                 |
|   Format printed on the back of each Panini sticker (e.g. MEX-10).        |
|   Examples:                                                               |
|    MEX-1,MEX-5(2),MEX3                                                    |
|    FWC-1,FWC3-5(2)                                                        |
|   • The dash between the country code and the sticker number is optional  | 
|     (e.g. MEX3 and MEX-3 are identical).                                  |
```

Exclusion operator:
```text
| ▾ Exclusion operator — import missing stickers                           |
|   Prefix the line with <>, !=, or ^.                                     |
|   The parser imports every valid sticker position except those listed.   |
|   Examples:                                                              |
|   <>MEX,1,2,3 → imports stickers 4–20.                                   |
|   !=FWC,1-10,12-19 → imports stickers 0 and 11.                          |
|   • Repeat counts inside an exclusion line are ignored; the complement   | 
|     always uses count 1.                                                 |
|   • Works with Format 1 and Format 2 tokens on the same line.            |
```

User interface elements:

- **Common rules**
  - Delimiter, repeat, and range notation that applies to every format.

- **Format 1 / Format 2 / Exclusion operator** (collapsible sections)
  - Each section documents one input format with its token grammar and worked examples, mirroring [ImportServiceRequirements.md](ImportServiceRequirements.md).
  - **Format 1** is expanded by default; **Format 2** and **Exclusion operator** are collapsed and expand on click.

- **(+info)**
  - External link to the project `README.md` for additional background.

- **Close**
  - Closes the modal and returns to the Import dialog without affecting
    any dialog state.

The format guide modal is read-only: it does not perform backend calls or modify the current import input.

---

## 3. Mobile Workflow

The mobile Import view provides a **simplified** version of the import workflow, adapted for small screens, rather than a wrapper around the desktop dialog (unlike Export, Quick Entry, and Trade). This is a documented, intentional simplification.

The mobile workflow consists of:

- Opening the Import service from the mobile navigation drawer.
- Pasting or typing sticker data directly (no file upload).
- Selecting a loading mode.
- Validating and previewing, or importing directly.

### 3.1 Mobile Import view

The **Mobile Import view** is displayed when the user opens the Import service on a mobile device.

The mobile Import view differs from the desktop implementation in the following ways:

- No **Upload file** control — mobile input is paste/type only.
- No separate **Input format guide** modal — a compact format hint is shown inline under the text area instead.
- No **Cancel** button — the view is part of the mobile navigation shell, not a dismissible dialog.
- **Messages** section (message, warnings, preview) is hidden until the first **Validate / Preview** or **Import** action, same as desktop.

Example layout:

```text
+--------------------------------------------------+
| Import Sticker Counts                            |
| Sticker data                                     |
| +----------------------------------------------+ |
| | MEX,1,3-5,10                                 | |
| | BRA-1,BRA-5(2),BRA3                          | |
| | <>FWC,1-10,12-19                             | |
| +----------------------------------------------+ |
| Import mode                                      |
| [ Update counts                             ▼ ]  |
| Format examples:                                 |
| MEX,1,3-7,10(2) — country once, comma-separated  |
| MEX-1,MEX-5(2) — country prefix per sticker      |
| <>FWC,1-10 — exclusion: imports all except listed|
+--------------------------------------------------+
| Messages                                         |
| +----------------------------------------------+ |
| | Validation successful.                       | |
| +----------------------------------------------+ |
| +----------------------------------------------+ |
| | ⚠ Country "XYZ": unknown country code, line  | |
| |   skipped.                                   | |
| +----------------------------------------------+ |
| +----------------------------------------------+ |
| | MEX -> 1:1, 3:1, 4:1, 5:1                    | |
| | BRA -> 1:1, 3:1, 5:2                         | |
| | FWC -> 0:1, 11:1                             | |
| +----------------------------------------------+ |
+--------------------------------------------------+
+--------------------------------------------------+
| Actions                                          |
| [ Validate / Preview ]                [ Clear ]  |
| [              Import                         ]  |
+--------------------------------------------------+
```

User interface elements:

- **Sticker data**
  - Multi-line text area for pasting or typing import input; same accepted syntax as desktop (Format 1, Format 2, exclusion operator).

- **Import mode**
  - Dropdown with the same three loading modes as desktop, labeled identically. Default **Update counts**.

- **Format examples**
  - Compact inline hint (one line per format) shown permanently under the mode selector, replacing the desktop's collapsible format guide modal.

- **Messages**
  - Hidden until the first action; displays the result message, warnings, and — for **Validate / Preview** — the mapped preview output. The message section elements can be differentiated by the color:
    - Validation section, if successful shows the message: 'Validation successful.' with dark green font and light green background. In case of error, the error message is indicated in dark red font color and light red background.
    - Warning (each prefixed `⚠`) after validation section shown orange font color and yellow background.
    - Preview/validation output after warning section with gray background and monospace font.

- **Validate / Preview**
  - Same behavior as desktop: validates and shows the mapped preview without writing to the sheet.

- **Clear**
  - Resets the text area, and Messages section to their initial state.
  - It doesn't change the input mode pre-selected by the specific input mode or selected by the user.

- **Import**
  - Same behavior as desktop: re-validates, then writes to `COUNTS` using the selected mode.

The mobile Import view does not implement separate mobile import rules. It reuses the same parsing, validation, and business rules defined for the desktop implementation via shared helper functions and backend.

---

## 4. Implementation Notes

The Import mockup uses the existing application services and shared components.

The implementation must reuse:

- `ImportService.gs` for all parsing, validation, and `COUNTS`-writing logic — desktop and mobile call the same backend pipeline (`previewStickerData`/`importStickerData` and their mobile counterparts).
- `ImportHelpers.html` for shared client-side logic (payload assembly, message rendering, preview rendering) between `ImportView.html` and `MobileImportView.html`.
- The `StickerSheetRepository` for spreadsheet access via `Commons.gs`.
- The same message/warning format (`Country "ABC": description`, `⚠` prefix for warnings) across desktop and mobile.

The mockup does not define backend implementation details.
