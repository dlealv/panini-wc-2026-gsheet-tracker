# Panini WC 2026 Google Sheets Tracker

A practical Google Sheets tracker for the **Panini FIFA World Cup 2026** sticker collection.

This project was first published as a draft on [Reddit](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/), and GitHub is now the main place for source code, documentation, and future updates. If you already track your stickers with another tool, the import/export feature lets you move your data without re-entering everything manually.

Track your collection, duplicates, missing stickers, swap summary, and possible trades in one spreadsheet.

**Note:** in this document, `country code` also includes special sticker groups such as `FWC`, it applies also for the tracker.

## Live tracker

Use the live Google Sheet here:

```text
https://docs.google.com/spreadsheets/d/15-AosDygdRot_r7dOqZ7gmRlRjnJUS10hlLWkEUkEj8/edit?usp=sharing
```

**Recommended use:** open the sheet and make your own copy.

## Main features

- Track owned stickers in the `Stickers` tab
- See progress summaries in the `Reports` tab
- Share a compact swap view with other collectors
- Compare your list with another collector in the `Trade` tab
- Import and export sticker data with Google Apps Script tools

## Screenshots

### Stickers tab

This is the main input tab of the tracker. Enter and update your sticker counts here. The other tabs use this data and are generated automatically. The country codes are organized with the order in the [Panini Album](https://www.paniniamerica.net/fifa-world-cup-2026-official-sticker-collection-album.html). The column `Pg`, shows the page number where to find the corresponding information in the Album.

This tab has two hidden columns: `AD`, the country code to populate the flags) and `AE`, the corresponding group of the team. The group is required to generate the pivot table in `Reports` tab. The column `A` (`Gr`) shows the groups but merged vertically and it can't be used in the Pivot table.

The columns: `Done` (counts of completed stickers for the team),`%`(percentage completion),`Rep` (counts of repeated stickers),`Miss` (counts of missing stickers) are calculated fields and are shown as a heat map from green (good) to red (bad) depending on the case.


![Stickers tab](images/stickersView.jpg)

### Reports tab

This tab generates reports and visual summaries from the data entered in the `Stickers` tab. No manual input is required here. The Pivot table on the right helps to visualize the information sorted in descending order by the %-Completion. It helps to identify the teams or groups (via slicer) close to completion.

![Reports tab](images/reportsView.jpg)

### Compact Swap View tab

This tab shows a compact view of repeated and missing stickers for sharing with other collectors. The information comes from the `Stickers` tab, so no manual input is needed here. I helps to exchange the collector information in a compact view in a single view (or screen) usefull to share in social medial or groups.

![Compact Swap View tab](images/swapCompactView.jpg)

### Trade tab

This tab helps compare your collection with another collector to identify possible swaps. Paste the other collector data in the expected format in the **INPUT** section, then review the generated **OUTPUT** section to see what you can offer and what you may receive.

You can use it for trades where both collectors exchange the same number of stickers, or for cases where you receive more stickers and pay the difference. For that reason, the sheet shows the maximum number of stickers you may receive for each possible trade combination.

The `Cnt` column in the **OUTPUT** section shows the cumulative number of possible stickers to receive. Green background highlights indicate values that are lower than or equal to the number of stickers you can send, making it easier to identify equal or smaller trade combinations first.

The results are prioritized to help complete teams more efficiently while keeping trade review simple.

### Manage Panini menu

Custom spreadsheet menu added by the Apps Script. Use it to open the import dialog or export the current sticker data.

![Manage Panini menu](images/panini%20Manage.jpg)

### Import dialog

Use this dialog to load sticker data from pasted text or a local file. It is useful when you already track your collection somewhere else and want to move it into this spreadsheet without manual re-entry.

- **Import data**: clears all values in the `COUNTS` named range, then loads the input data.
- **Update counts clearing country counts**: clears only the rows for countries present in the input, then reloads those countries.
- **Update counts**: only overwrites sticker positions explicitly provided in the input; all other values remain unchanged.

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

Please consider the following rules:

- Repeats in parentheses are optional.
- Use comma `,` as delimiter.
- Country code must exist in the `COUNTRIES` named range in the `Stickers` tab.
- Sticker `0` only exists for `FWC`. For other countries it is accepted and mapped to count `0`.
- Sticker `20` only exists for non-`FWC` countries. For `FWC` it is accepted and mapped to count `0`.

Example:

```text
FWC,1,3,5(2),7
MEX,18,20
BRA,7(3)
```

In the previous example, sticker `5` for `FWC` appears twice, and sticker `7` for `BRA` appears three times.

### Named ranges used by the script

- `COUNTRIES`: refers to the country code column (`Ctry`) in the `Stickers` tab.
- `COUNTS`: refers to the range representing sticker counts for stickers `0-20` across all participating country codes.

## Repository purpose

This repository is the main place for:

- source code
- documentation
- future updates
- improvement history

The project was initially announced on Reddit, but future updates are maintained in GitHub.

## Files

- `Code.gs`: Main Google Apps Script source file. It contains menu creation, import/export logic, validation, and spreadsheet updates.
- `importDialog.html`: HTML user interface for the import and export dialogs shown inside Google Sheets.
- `Requirements.md`: Functional and technical notes for the project, including behavior rules and implementation details.
- `README.md`: Main project overview for GitHub visitors, including features, screenshots, and usage guidance.
- `examples/example_sticker-data.txt`: Sample data file that can be used both as an import example and as an example of the exported format.

## Examples

Example files are available in the `examples/` folder:

- `examples/example_sticker-data.txt`

## Feedback

Suggestions and improvements are welcome.
