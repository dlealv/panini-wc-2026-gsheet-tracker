# Panini FIFA World Cup 2026 Google Sheets Tracker

A Google Sheets tracker for the **Panini FIFA World Cup 2026** sticker collection.

This project helps collectors track album progress, repeated stickers, missing stickers, and possible trades using a Google Sheet.

## Project status

This tracker was **initially published on Reddit** as the first public announcement of the project. The Reddit post introduced the tracker, described its main features, and shared screenshots of the main tabs. ([reddit.com](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/))

Moving forward, the **GitHub repository** is intended to be the main place for:

- source code
- documentation
- change history
- future updates

The **live tracker** is available as a Google Sheet:

```text
https://docs.google.com/spreadsheets/d/15-AosDygdRot_r7dOqZ7gmRlRjnJUS10hlLWkEUkEj8/edit?usp=sharing
```

## Live Google Sheet

Use the live Google Sheet to access the tracker:

```text
https://docs.google.com/spreadsheets/d/15-AosDygdRot_r7dOqZ7gmRlRjnJUS10hlLWkEUkEj8/edit?usp=sharing
```

**Recommended usage:**
1. Open the shared Google Sheet
2. Make your own copy
3. Use your own copy to track your collection and trades

## Initial Reddit announcement

The tracker was first announced in Reddit in the post:

**Google Sheet tracker for Panini FIFA WC 2026**

That post introduced the project as a simple and intuitive Google Sheets tracker and described the following goals:
- track collection progress
- track repeated and missing stickers
- provide reports and visualizations
- provide a compact swap sharing view
- help identify trade matches between collectors ([reddit.com](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/))

## Features

The tracker currently supports the following core use cases:

- **Track collection progress**
  - Main tracking through the `Stickers` tab
  - Summary and progress reporting through the `Reports` tab

- **Track repeated and missing stickers**
  - Identify what you already have
  - Identify what is still missing
  - Track repeated stickers for swaps

- **Reports and visualization**
  - Progress summaries
  - Pivot tables
  - Charts and other spreadsheet-based visualizations

- **Compact swap sharing**
  - A compact view designed to make it easier to share your duplicates and needs with other collectors
  - Useful for social media or quick trade discussions

- **Trade matching**
  - Compare your list with another collector using a similar file
  - Use the `Trade` tab to help identify possible matches

These features are consistent with the original Reddit announcement, which references the `Stickers`, `Reports`, `Compact Swap View`, and `Trade` tabs. ([reddit.com](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/))

## Main tabs

### Stickers
Main tab used to record owned sticker counts and track progress.

### Reports
Provides summaries and visualizations of collection progress.

### Compact Swap View
Provides a compact representation of repeated and missing stickers so it is easier to share with other collectors.

### Trade
Helps identify trade matches between your sticker list and another collector’s list, assuming both are using a compatible tracker structure.

## Import / Export tools

The tracker includes a Google Apps Script dialog for importing and exporting sticker count data.

### Import
The import dialog allows you to:

- upload a `.txt` or `.csv` file
- paste sticker data manually
- validate and preview parsed values before writing
- import using different update modes

Supported loading modes:

- **Import data**
  - clears the `COUNTS` named range
  - imports all provided data

- **Update counts clearing country counts**
  - clears only rows for countries present in the input
  - reloads those countries

- **Update counts**
  - only updates sticker positions explicitly provided in the input
  - preserves the rest of the existing values

### Export
The export dialog allows you to:

- load current sticker counts automatically
- copy exported data to the clipboard
- download exported data as a local file

The export format matches the same general syntax accepted by the import process.

## Import format

One country per line:

```text
CODE,number[,number(repeats)]...
```

Examples:

```text
FWC,1,3,5(2),7
MEX,18,20
BRA,7(3)
```

### Import rules

- country code must exist in the `COUNTRIES` named range in the `Stickers` tab
- sticker counts are written to the `COUNTS` named range
- repeats in parentheses are optional
- comma is the required delimiter

### Special sticker rules

- sticker `0` only exists for `FWC`
  - for other countries, `0` is accepted as input but mapped to count `0`

- sticker `20` only exists for non-`FWC` countries
  - for `FWC`, `20` is accepted as input but mapped to count `0`

## Menu

The spreadsheet adds a custom menu:

```text
Manage Panini
```

Menu options:

- `Open Import Dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`
- `Export Stickers`

## Repository purpose

This repository is intended to hold the source code and documentation for the Google Sheets tracker, while the live spreadsheet remains hosted in Google Sheets.

Typical files include:

- `Code.gs`
- `ImportDialog.html`
- `Requirements.md`
- `README.md`

## Why GitHub if the tracker is a Google Sheet?

The live spreadsheet exists in Google Sheets, but GitHub is still useful for:

- version control
- documentation
- issue tracking
- improvement history
- sharing the Apps Script source code separately from the live sheet

In this model:

- **Google Sheets** = live tracker
- **GitHub** = source code and documentation

## Feedback and suggestions

Feedback was originally invited in the Reddit post, and future improvements can also be tracked through this GitHub project. ([reddit.com](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/))

If you have ideas for improvements, bug fixes, or new tracking and trading features, feel free to open an issue or share feedback.

## Credits

Project created and initially announced by **dlealval** on Reddit. ([reddit.com](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/))