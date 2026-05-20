# Panini FIFA WC 2026 Quick Sticker Entry Service Requirements

## Purpose

Provide a faster and more visual way to update sticker counts than editing cells directly in the `Stickers` tab.

The service must allow the user to browse countries, view stickers in a compact interactive layout, filter what is visible, make multiple local count changes, and apply those updates to the spreadsheet in one batch.

The service is intended for day-to-day collection tracking and must provide a cleaner and more guided workflow than editing spreadsheet cells manually.

---

## Scope

This service covers:
- opening the Quick Sticker Entry dialog from the spreadsheet menu
- loading country data and sticker counts from the spreadsheet
- rendering countries as interactive visual sections
- filtering countries by search text by country code and country name
- filtering countries by group
- filtering stickers by status
- showing per-country completion summaries
- tracking local pending changes before saving
- displaying pending-change indicators in sticker cards
- applying pending sticker count updates to the spreadsheet in batch
- displaying loading, empty, success, and error states in the dialog

This service does not cover:
- import/export workflows
- trade comparison features
- spreadsheet report generation
- offline use
- undo/redo support
- multi-user conflict handling
- external libraries
- web app deployment
- add-on publishing

---

## Service entry point

This service is accessed from the **Manage Panini** menu through:

- `Quick Sticker Entry`

The service uses the `QuickEntryDialog.html` template and backend logic encapsulated in `QuickEntryService.gs`.

---

## Target sheet and named ranges

### Main sheet

- Sheet name: `Stickers`

### Named ranges used by the service

- `COUNTRIES`: country code column in the `Stickers` sheet
- `COUNTS`: writable sticker count range in the `Stickers` sheet
- `GROUPS`: team group for each country
- `FLAGS_URL`: flag image source used by the dialog
- `COUNTRY_NAMES`: country names used for display and incremental search

---

## User interface requirements

The service must provide an HTML dialog for Quick Sticker Entry.

The dialog must include:
- a search input for incremental country filtering
- a group filter
- a sticker status filter
- an action button to apply pending changes
- a legend for visual sticker states
- a scrollable list of country sections
- controls to close the dialog

The UI is country-list based, not single-country based.
Multiple countries may be visible at the same time after filtering.

The dialog must display a loading state while the initial country data is being fetched.

The dialog must display a clear empty-state message when the current search and filter criteria produce no visible countries.

---

## Loading and empty-state requirements

### Initial loading behavior

When the dialog opens:
- a loading message or loading indicator must be displayed
- interactive country content must appear only after the initial payload is loaded
- the loading state must disappear when data is successfully loaded or when an error is shown

### Empty result behavior

When the current search text and filters match no countries:
- no country sections must be shown
- a clear no-results message must be displayed
- the active search text and filters must remain available so the user can adjust them

---

## Country section requirements

Each visible country section must display:
- country code
- country name
- group
- flag when available
- completion state
- per-country summary values
- sticker cards for the valid sticker positions of that country

A country section must be visually identifiable as complete when it has no missing stickers.

---

## Search and filter requirements

### Search behavior

The dialog must allow incremental search by:
- country code
- country name

Search behavior:
- matching must be case-insensitive
- partial matches must be supported
- the visible country list must refresh without writing to the spreadsheet

### Group filter behavior

The dialog must provide:
- `All groups`
- one option per available group code

Group filter behavior:
- `All groups` shows countries from all groups
- a selected group shows only countries belonging to that group
- the visible country list must refresh without writing to the spreadsheet

### Sticker status filter behavior

The dialog must provide these sticker status options:
- `All`
- `Missing`
- `Repeated`
- `Pending`

Sticker status behavior:
- `All` shows all valid stickers for the visible countries
- `Missing` shows only stickers with count `0`
- `Repeated` shows only stickers with count greater than `1`
- `Pending` shows only stickers whose local count differs from the persisted spreadsheet count

The `Pending` filter must use the same condition as the pending-change indicator shown on the sticker card.

If a local edit is reverted so that the local count again matches the persisted spreadsheet count, that sticker must stop matching the `Pending` filter immediately.

The status filter applies to sticker visibility inside each visible country section.

### Filter state persistence

The current search text, selected group filter, and selected sticker status filter must remain active while:
- the user reviews visible countries
- the user changes local counts
- the user applies pending changes
- the dialog refreshes from the service response

---

## Sticker card requirements

Each sticker card must show:
- sticker number
- count
- label formatted as `number (count)`
- status-based visual styling
- special sticker label when applicable

Each sticker card must provide:
- one control to increment the count locally
- one control to decrement the count locally

The service must visually identify:
- missing stickers
- single owned stickers
- repeated stickers
- pending local changes

### Special sticker labels

For non-`FWC` countries:
- sticker `1` must be labeled `CREST`
- sticker `13` must be labeled `TEAM`

For `FWC`:
- no special sticker labels are shown

### Pending change indicator behavior

A sticker card must show a pending-change indicator only when its local count differs from the persisted spreadsheet count.

If local edits return the sticker count to its original persisted value, the pending-change indicator must be removed.

The pending-change indicator must update immediately after each increment or decrement action.

---

## Sticker state rules

Sticker cards must reflect the current count visually:

- count `0`: missing
- count `1`: owned
- count greater than `1`: repeated

The service must map counts to visual classes so the UI can distinguish:
- missing
- count `1`
- count `2`
- count `3`
- count `4`
- count `5+`

The color convention must match the Legend section in the `Stickers` tab.

---

## Country-specific sticker rules

- Sticker `0` is valid only for `FWC`
- Sticker `20` is valid only for non-`FWC` country codes

Visible sticker ranges must be:
- `FWC`: stickers `0..19`
- non-`FWC`: stickers `1..20`

Invalid sticker positions used internally by the spreadsheet must not be shown in the Quick Sticker Entry UI.

---

## Count update rules

- Increment increases the local count by `1`
- Decrement decreases the local count by `1`
- The minimum allowed count is `0`
- Negative values must not be allowed

Pending updates must represent the final target count to be written, not just the delta from the original value.

The user must be able to make multiple changes across multiple countries before applying them.

After each local increment or decrement:
- the displayed count must refresh immediately
- the visual sticker state must refresh immediately
- the pending-change indicator must be recalculated immediately
- the country summary values must refresh immediately
- the current sticker status filter must be reapplied immediately

If a local count change causes a sticker card to no longer match the active sticker status filter, that card must stop being visible in the filtered view.

This rule also applies to the `Pending` filter. If a sticker no longer has a pending change, it must stop being visible under that filter immediately.

---

## Save behavior

The service must not write to the spreadsheet after each click.

Instead:
- increment and decrement actions update only the local dialog state
- the dialog tracks pending updates
- the spreadsheet is updated only when the user presses **Update**

The dialog must provide a visible indication that pending updates exist.

If all local changes are reverted to their original persisted values, the pending update state must be cleared.

After a successful update:
- all pending updates must be written to the corresponding positions in `COUNTS`
- the pending changes list must be cleared
- the affected country sections must refresh
- summary values must refresh
- the active filters must remain applied

If there are no pending updates, applying changes must return a clear error.

---

## Data source and write behavior

The service must use the existing spreadsheet data model.

Reads:
- country codes must be resolved from `COUNTRIES`
- sticker counts must be read from `COUNTS`
- group codes must be read from `GROUPS`
- country names must be read from `COUNTRY_NAMES`
- flag values must be resolved from `FLAGS_URL`

Writes:
- sticker counts must be written only to `COUNTS`

---

## Summary information requirements

Each visible country section must show a summary including:
- owned sticker count
- missing sticker count
- repeated sticker count
- total sticker count
- completion percentage

Completion percentage must be calculated from the visible valid sticker positions of the country.

---

## Validation requirements

Before applying updates, the service must validate:
- pending updates exist
- each update contains a valid country code
- each update contains a valid sticker number for the selected country
- each update contains a non-negative integer count

If validation fails, the batch update must stop and return a clear error message.

---

## Formatting and data safety

The service must:
- write only values
- preserve spreadsheet formatting
- avoid modifying formulas or unrelated cells
- avoid writing outside the `COUNTS` named range

---

## Error handling requirements

The service must show a clear message when:
- initial country data cannot be loaded
- required named ranges are missing
- group, flag, or country-name support data is unavailable
- a pending update is invalid
- a batch save fails
- spreadsheet data is unavailable
- the dialog cannot apply changes

Error messages should be concise and understandable by a spreadsheet user.

---

## Technical design guidelines

The implementation should separate responsibilities between:
- spreadsheet data access
- Quick Entry business logic
- dialog rendering and interaction

### Expected module responsibilities

- `Code.gs`
  - menu creation
  - dialog opening
  - thin wrapper functions callable by the HTML dialog

- `QuickEntryService.gs`
  - Quick Entry service orchestration
  - country view model generation
  - summary generation
  - validation and normalization of pending updates

- `Commons.gs`
  - shared sticker sheet access
  - named range validation
  - country, group, flag, and count retrieval
  - batch count persistence

- `QuickEntryDialog.html`
  - Quick Entry user interface
  - search and filter interaction
  - local pending change tracking
  - update action and refresh handling
  - loading, empty, and error state rendering

No external libraries are required for this service.

---

## Non-goals

Version 1 does not need to include:
- immediate spreadsheet writes on every click
- batch editing with spreadsheet-like paste behavior
- undo/redo support
- offline support
- import/export from the Quick Sticker Entry dialog
- trade comparison features
- advanced filtering beyond search, group filter, and sticker status filter
- user-defined sticker groupings
- customizable color themes

---

## Expected user workflow

1. Open the spreadsheet
2. Open the custom menu `Manage Panini`
3. Select `Quick Sticker Entry`
4. Wait for the initial country data to load
5. Use search and group filters to narrow the visible countries
6. Use the sticker status filter to focus on all, missing, repeated, or pending stickers
7. Adjust one or more sticker counts with the increment and decrement controls
8. Review pending visual changes
9. Press **Update**
10. Review the refreshed summaries and country states
