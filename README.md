# Panini WC 2026 Google Sheets Tracker

A practical Google Sheets tracker for the **Panini FIFA World Cup 2026** sticker collection.

This project was first published as a draft on [Reddit](https://www.reddit.com/r/Panini/comments/1taj3mn/google_sheet_tracker_for_panini_fifa_wc_2026/), and GitHub is now the main place for source code, documentation, and future updates. If you already track your stickers with another tool, you do not need to re-enter everything manually: the built-in import/export tools let you move your data in and out using a simple text format.

Track your collection, duplicates, missing stickers, swap summary, and possible trades in one spreadsheet.

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

This is the main input tab of the tracker. This is where the user enters and updates sticker counts. The other tabs are based on this data and are mostly calculated or generated from it.

![Stickers tab](images/stickersView.jpg)

### Reports tab

This tab generates reports and visual summaries from the data entered in the `Stickers` tab. The user does not need to enter manual information here.

![Reports tab](images/reportsView.jpg)

### Compact Swap View tab

This tab provides a compact view of repeated and missing stickers for sharing with other collectors. The information is generated from the `Stickers` tab, so the user does not need to enter data here. Usefull to share in social media or groups in a compact view what the Collector can offer (duplicates) and what stickers he/she needs.

![Compact Swap View tab](images/swapCompactView.jpg)

### Trade tab

This tab helps compare your collection with another collector to identify possible swaps. Paste the other collector data in the expected format (check the Import Format section below) in the **INPUT** section of the tab. Then check the **OUTPUT** section to identify posible trades based on the matches. It is designed to make trade review easier without changing your main sticker tracking data.

The count column (Cnt) in the **OUTPUT** section of the tab indicates the cumulative sum of the possible stickers to trade. Highlighted in green the values that are lower or equal to the stickers you plan to send. Since the number of stickers to send and receive should be the same, unless the other collector is willing to sell additional matches you have. In this case you get more stickers than you send, but you are willing to pay for extra sticker to receive. That is the purpose of this highlihted column, to identify the maximum stickers you can swap.

The information in the **OUTPUT** section is prioritized by %-completion of the team, collector intention is to complete the teams, so the idea is to propose to get stickers to help him/her to complete the list of stickers for a given team.

![Trade tab](images/tradeView.jpg)

### Manage Panini menu

Custom spreadsheet menu added by the Apps Script. Use it to open the import dialog or export the current sticker data.

![Manage Panini menu](images/panini%20Manage.jpg)

### Import dialog

Use this dialog to load sticker data from pasted text or a local file. It is useful when you already track your collection somewhere else and want to move it into this spreadsheet without manual re-entry. You can validate and preview the data before importing it. You have the following options:

- **Import data**: clears all values in the COUNTS named range, then loads the input data. Usefull when you want to have a fresh import, for example you get this template and you would like to clear the content and import your data.
- **Update counts clearing country counts**: clears only the rows for countries present in the input, then loads those countries again.
- **Update counts**: only overwrites sticker positions explicitly provided in the input; all other values remain unchanged.

**Note**: Where in this document or in the spreadsheet is referred to country code it includes also special sticker group such as `FWC`.

Check the Import Format section on how to format the input data, or just check the documentation of the Import dialog in the tracker.

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
- Use comma , as delimiter.
- Country code must exist in the `COUNTRIES` named range in the Stickers tab.
- Sticker `0` only exists for `FWC`. For other countries it is accepted and mapped to count `0`.
- Sticker `20` only exists for `non-FWC` countries. For `FWC` it is accepted and mapped to count `0`.

Example:

```text
FWC,1,3,5(2),7
MEX,18,20
BRA,7(3)
```
In previous example the sticker `5` for Mexico (`MEX`) is duplicated and the sticker `7` for Brasil (`BRA`) is three times.

### Named ranges used by the script

- `COUNTRIES`: Refers to the Country Code column (Ctry) in `Stickers` tab.
- `COUNTS`: Refers to the range representing the sticker counts for all stickers from 0-20 and all country codes participant.

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
