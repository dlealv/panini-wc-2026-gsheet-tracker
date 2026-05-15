# Panini WC 2026 Google Sheets Tracker

A practical Google Sheets tracker for the **Panini FIFA World Cup 2026** sticker collection.

This project was first published as a draft on Reddit, and GitHub is now the main place for source code, documentation, and future updates. If you already track your stickers with another tool, you do not need to re-enter everything manually: the built-in import/export tools let you move your data in and out using a simple text format.

Track your collection, duplicates, missing stickers, swap summary, and possible trades in one spreadsheet.

## Live tracker

Use the live Google Sheet here:

```text
https://docs.google.com/spreadsheets/d/15-AosDygdRot_r7dOqZ7gmRlRjnJUS10hlLWkEUkEj8/edit?usp=sharing
```

**Recommended use:** open the sheet and make your own copy.

## Reddit post

The first public draft of this project was shared on Reddit:

```text
https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/
```

## Main features

- Track owned stickers in the `Stickers` tab
- See progress summaries in the `Reports` tab
- Share a compact swap view with other collectors
- Compare your list with another collector in the `Trade` tab
- Import and export sticker data with Google Apps Script tools

## Screenshots

### Stickers tab

This is the main input tab of the tracker. This is where the user enters and updates sticker counts. The other tabs are based on this data and are mostly calculated or generated from it.

![Stickers tab](images/stickersView.jpg)

### Reports tab

This tab generates reports and visual summaries from the data entered in the `Stickers` tab. The user does not need to enter manual information here.

![Reports tab](images/reportsView.jpg)

### Compact Swap View tab

This tab provides a compact view of repeated and missing stickers for sharing with other collectors. The information is generated from the `Stickers` tab, so the user does not need to enter data here.

![Compact Swap View tab](images/swapCompactView.jpg)

### Trade tab

This tab helps compare your collection with another collector to identify possible swaps. Paste or load the other collector data in the expected format, then use the generated comparison to see what you can give and what you can receive. It is designed to make trade review easier without changing your main sticker tracking data.

![Trade tab](images/tradeView.jpg)

### Manage Panini menu

Custom spreadsheet menu added by the Apps Script. Use it to open the import dialog or export the current sticker data.

![Manage Panini menu](images/panini%20Manage.jpg)

### Import dialog

Use this dialog to load sticker data from pasted text or a local file. It is useful when you already track your collection somewhere else and want to move it into this spreadsheet without manual re-entry. You can validate and preview the data before importing it.

![Import dialog](images/importDialogView.jpg)

### Export dialog

Use this dialog to generate a reusable text version of your current sticker counts. You can copy or download the exported data to keep a backup, share it, or use it later for import.

![Export dialog](images/exportView.jpg)

## Import / Export tools

### Import format

One country per line:

```text
CODE,number[,number(repeats)]...
```

Example:

```text
FWC,1,3,5(2),7
MEX,18,20
BRA,7(3)
```

### Named ranges used by the script

- `COUNTRIES`
- `COUNTS`

## Repository purpose

This repository is the main place for:

- source code
- documentation
- future updates
- improvement history

The project was initially announced on Reddit, but future updates are maintained in GitHub.

## Files

- `Code.gs`: Main Google Apps Script source file. It contains the menu creation, import/export logic, validation, and spreadsheet updates.
- `importDialog.html`: HTML user interface for the import and export dialogs shown inside Google Sheets.
- `Requirements.md`: Functional and technical notes for the project, including behavior rules and implementation details.
- `README.md`: Main project overview for GitHub visitors, including features, screenshots, and usage guidance.
- `examples/sticker-data-example.txt`: Sample data file that can be used both as an import example and as an example of the exported format.

## Examples

Example files are available in the `examples/` folder:

- `examples/sticker-data-example.txt`

## Feedback

Suggestions and improvements are welcome.
