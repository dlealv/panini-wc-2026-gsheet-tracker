# Panini FIFA WC 2026 Quick Sticker Entry Service Requirements

## Purpose

Provide a faster and more visual way to update sticker counts than editing cells directly in the `Stickers` tab.

The service must allow the user to browse countries, view stickers in a compact interactive layout, filter what is visible, make multiple local count changes, and apply those updates to the spreadsheet in one batch.

The service is intended for day-to-day collection tracking and must provide a cleaner and more guided workflow than editing spreadsheet cells manually.

---

## Scope

This service covers:
- Opening the Quick Sticker Entry dialog from the spreadsheet menu.
- Loading country data and sticker counts from the spreadsheet.
- Handles country teams and special stickers such us FIFA World Cup (`FWC`) and Coca-Cola (`CC`).
- Rendering countries as interactive visual sections.
- Filtering countries by search text by country code and country name.
- Filtering countries by group.
- Filtering stickers by status.
- Showing per-country completion summaries.
- Tracking local pending changes before saving.
- Displaying pending-change indicators in sticker cards.
- Applying pending sticker count updates to the spreadsheet in batch.
- Displaying loading, empty, success, and error states in the dialog.

This service does not cover:
- Import/export workflows.
- Trade comparison features.
- Spreadsheet report generation.
- Offline use.
- Undo/redo support.
- Multi-user conflict handling.
- External libraries.
- Web app deployment.
- Add-on publishing.

---

## Service entry points

This service is accessed from the **Manage Panini** menu through:
- `Quick sticker entry`

The service uses: 
- `QuickEntryService.gs` for backend logic
- `Commons.gs` common services used by all services via `StickerSheetRepository` class.
- HTML files:
  - `QuickEntryDialog.html`: main shell for desktop.
  - `QuickEntryView.html`: View of the service and javascript functions common to desktop and mobile service.
  - `QuickEntryHelpers.html`: client-side utilities.
  - `QuickEntryRender.html`: logic to render DOM/UI specific functions.
  - `MobileQuickEntryView.html`: Wrapper of the Quick entry service for mobile.

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
- A search input for incremental country filtering.
- A group filter.
- A sticker status filter.
- An action button to apply pending changes.
- A legend for visual sticker states.
- A scrollable list of country sections.
- Controls to close the dialog.

The UI is country-list based, not single-country based.
Multiple countries may be visible at the same time after filtering.

The dialog must display a loading state while the initial country data is being fetched.

The dialog must display a clear empty-state message when the current search and filter criteria produce no visible countries.

---

## Loading and empty-state requirements

### Initial loading behavior

When the dialog opens:
- A loading message or loading indicator must be displayed.
- Interactive country content must appear only after the initial payload is loaded.
- The loading state must disappear when data is successfully loaded or when an error is shown.

### Empty result behavior

When the current search text and filters match no countries:
- No country sections must be shown.
- A clear no-results message must be displayed.
- The active search text and filters must remain available so the user can adjust them.

---

## Country section requirements

Each visible country section must display:
- Country code.
- Country name.
- Group.
- Flag when available.
- Completion state.
- Per-country summary values.
- Sticker cards for the valid sticker positions of that country.

A country section must be visually identifiable as complete when it has no missing stickers.

---

## Search and filter requirements

### Search behavior

The dialog must allow incremental search by:
- Country code.
- Country name.

Search behavior:
- Matching must be case-insensitive.
- Partial matches must be supported.
- The visible country list must refresh without writing to the spreadsheet.

### Group filter behavior

The dialog must provide:
- `All groups`.
- One option per available group code.

Group filter behavior:
- `All groups` shows countries from all groups.
- A selected group shows only countries belonging to that group.
- The visible country list must refresh without writing to the spreadsheet.

### Sticker status filter behavior

The dialog must provide these sticker status options:
- `All`
- `Missing`
- `Repeated`
- `Pending`

Sticker status behavior:
- `All` shows all valid stickers for the visible countries.
- `Missing` shows only stickers with count `0`.
- `Repeated` shows only stickers with count greater than `1`.
- `Pending` shows only stickers whose local count differs from the persisted spreadsheet count.

The `Pending` filter must use the same condition as the pending-change indicator shown on the sticker card.

If a local edit is reverted so that the local count again matches the persisted spreadsheet count, that sticker must stop matching the `Pending` filter immediately.

The status filter applies to sticker visibility inside each visible country section.

### Filter state persistence

The current search text, selected group filter, and selected sticker status filter must remain active while:
- The user reviews visible countries.
- The user changes local counts.
- The user applies pending changes.
- The dialog refreshes from the service response.

---

## Sticker card requirements

Each sticker card must show:
- Sticker number.
- Count.
- Label formatted as `number (count)`.
- Status-based visual styling.
- Special sticker label when applicable.

Each sticker card must provide:
- One control to increment the count locally.
- One control to decrement the count locally.

The service must visually identify:
- Missing stickers.
- Single owned stickers.
- Repeated stickers.
- Pending local changes.

### Special sticker labels

For country teams:
- Sticker `1` must be labeled `CREST`.
- Sticker `13` must be labeled `TEAM`.

For non country teams such as `FWC` or `CC`:
- No special sticker labels are shown.

### Pending change indicator behavior

A sticker card must show a pending-change indicator only when its local count differs from the persisted spreadsheet count.

If local edits return the sticker count to its original persisted value, the pending-change indicator must be removed.

The pending-change indicator must update immediately after each increment or decrement action.

---

## Sticker state rules

Sticker cards must reflect the current count visually:

- count `0`: missing.
- count `1`: owned.
- count greater than `1`: repeated.

The service must map counts to visual classes so the UI can distinguish:
- missing.
- count `1`.
- count `2`.
- count `3`.
- count `4`.
- count `5+`.

The color convention must match the Legend section in the `Stickers` tab.

---

## Country-specific sticker rules

- Sticker `0` is valid only for `FWC`.
- Sticker `20` is valid only for country team codes.

Visible sticker ranges must be:
- `FWC`: stickers `0..19`.
- Country teams: stickers `1..20`.
- `CC` (Coca-Cola) stickers: `1..12`.

Invalid sticker positions used internally by the spreadsheet must not be shown in the Quick Sticker Entry UI.

---

## Count update rules

- Increment increases the local count by `1`.
- Decrement decreases the local count by `1`.
- The minimum allowed count is `0`.
- Negative values must not be allowed.

Pending updates must represent the final target count to be written, not just the delta from the original value.

The user must be able to make multiple changes across multiple countries before applying them.

After each local increment or decrement:
- The displayed count must refresh immediately.
- The visual sticker state must refresh immediately.
- The pending-change indicator must be recalculated immediately.
- The country summary values must refresh immediately.
- The current sticker status filter must be reapplied immediately.

If a local count change causes a sticker card to no longer match the active sticker status filter, that card must stop being visible in the filtered view.

This rule also applies to the `Pending` filter. If a sticker no longer has a pending change, it must stop being visible under that filter immediately.

---

## Save behavior

The service must not write to the spreadsheet after each click.

Instead:
- Increment and decrement actions update only the local dialog state.
- The dialog tracks pending updates.
- The spreadsheet is updated only when the user presses **Update**.

The dialog must provide a visible indication that pending updates exist.

If all local changes are reverted to their original persisted values, the pending update state must be cleared.

After a successful update:
- All pending updates must be written to the corresponding positions in `COUNTS`.
- The pending changes list must be cleared.
- The affected country sections must refresh.
- Summary values must refresh.
- The active filters must remain applied.

If there are no pending updates, applying changes must return a clear error.

---

## Data source and write behavior

The service must use the existing spreadsheet data model.

Reads:
- Country codes must be resolved from `COUNTRIES`.
- Sticker counts must be read from `COUNTS`.
- Group codes must be read from `GROUPS`.
- Country names must be read from `COUNTRY_NAMES`.
- Flag values must be resolved from `FLAGS_URL`.

Writes:
- Sticker counts must be written only to `COUNTS`.

---

## Summary information requirements

Each visible country section must show a summary including:
- Owned sticker count.
- Missing sticker count.
- Repeated sticker count.
- Total sticker count.
- Completion percentage.

Completion percentage must be calculated from the visible valid sticker positions of the country.

---

## Validation requirements

Before applying updates, the service must validate:
- Pending updates exist.
- Each update contains a valid country code.
- Each update contains a valid sticker number for the selected country.
- Each update contains a non-negative integer count.

If validation fails, the batch update must stop and return a clear error message.

---

## Formatting and data safety

The service must:
- Write only values.
- Preserve spreadsheet formatting.
- avoid modifying formulas or unrelated cells.
- Avoid writing outside the `COUNTS` named range.

---

## Error handling requirements

The service must show a clear message when:
- Initial country data cannot be loaded.
- required named ranges are missing.
- Group, flag, or country-name support data is unavailable.
- A pending update is invalid.
- A batch save fails.
- Spreadsheet data is unavailable.
- The dialog cannot apply changes.

Error messages should be concise and understandable by a spreadsheet user.

---

## Technical design guidelines

The implementation should separate responsibilities between:
- Spreadsheet data access.
- Quick Entry business logic.
- Dialog rendering and interaction.

### Expected module responsibilities

- `Code.gs`
  - Menu creation
  - Dialog opening
  - Thin wrapper functions callable by the HTML dialog

- `QuickEntryService.gs`
  - Quick Entry service orchestration.
  - country view model generation.
  - summary generation.
  - validation and normalization of pending updates.

- `Commons.gs`
  - Shared sticker sheet access.
  - Named range validation.
  - Country, group, flag, and count retrieval.
  - Batch count persistence.

- `QuickEntryDialog.html`: Desktop dialog for Quick Entry.
  - Load styles: `CommonStyles.html` and `QuickEntryStyles.html`.
  - Provides the desktop dialog shell.
  - Includes desktop styles.
  - Loads `QuickEntryView.html` (The view file, loads the `QuickEntryHelpers.html` and `QuickEntryRender.html`)
  - Initializes the shared Quick Entry view.

- `QuickEntryView.html`
  - Displays the toolbar, filters, legend, message area, and country list.
  - Includes the shared helpers and rendering modules.
  - Manages view state and user interactions.
  - Calls the appropriate backend methods depending on whether it is running inside the desktop dialog or the mobile Web app.
  - Loads `QuickEntryHelpers.html` and `QuickEntryViewRender.html` files.

- `MobileQuickEntryView.html`: Mobile wrapper around `QuickEntryView.html`.
    - Configures the mobile layout.
    - Sets the number of stickers displayed per row.
    - Reuses the shared Quick Entry implementation.

No external libraries are required for this service.

---

## Expected user workflow

1. Open the spreadsheet.
2. Open the custom menu `Manage Panini`.
3. Select `Quick Sticker Entry`.
4. Wait for the initial country data to load.
5. Use search and group filters to narrow the visible countries.
6. Use the sticker status filter to focus on all, missing, repeated, or pending stickers.
7. Adjust one or more sticker counts with the increment and decrement controls.
8. Review pending visual changes.
9. Press **Update**.
10. Review the refreshed summaries and country states.
