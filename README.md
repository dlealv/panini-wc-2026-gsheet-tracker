# Panini WC 2026 Google Sheets Tracker

A practical Google Sheets tracker for the **Panini FIFA World Cup 2026** sticker collection.

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

![Stickers tab](images/stickersView.jpg)

### Reports tab

![Reports tab](images/reportsView.jpg)

### Compact Swap View tab

![Compact Swap View tab](images/swapCompactView.jpg)

### Trade tab

![Trade tab](images/tradeView.jpg)

### Manage Panini menu

![Manage Panini menu](images/panini%20Manage.jpg)

### Import dialog

![Import dialog](images/importDialogView.jpg)

### Export dialog

![Export dialog](images/exportView.jpg)

## Import / Export tools

The spreadsheet includes a custom menu:

```text
Manage Panini
```

Available options:

- `Open Import Dialog`
- `Import data`
- `Update counts clearing country counts`
- `Update counts`
- `Export Stickers`

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

- `Code.gs`
- `importDialog.html`
- `Requirements.md`
- `README.md`

## Feedback

Suggestions and improvements are welcome.
