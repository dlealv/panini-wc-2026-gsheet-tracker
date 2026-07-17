# Quick Sticker Entry UI Mock Design

## Purpose

Describe the expected Quick Sticker Entry dialog structure, visual behavior, and interaction flow for the current batch-update version of the service.

This mock design reflects the current UI direction shown in the latest screen captures:
- search by team code or country name.
- group dropdown.
- button-style sticker status filters.
- legend with count colors and state indicators.
- top-right **Update** action.
- dialog-level message area.
- scrollable country list.
- local pending changes before batch update.
- loading, empty, success, and error feedback states.

---

## Dialog layout

### Initial loaded layout

```text
+----------------------------------------------------------------------------------------------------------------------+
| Quick Sticker Entry                                                                                             [X]  |
+----------------------------------------------------------------------------------------------------------------------+
|                                                                                                       [ Update ]     |
|                                                                                                                      |
| [ Search by team code or country name__________________ ] [ All groups v ] [All] [Missing] [Repeated] [Pending]      |
|                                                                                                                      |
| [ ] Missing   [■] Owned x1   [■] Repeated x2   [■] Repeated x3   [■] Repeated x4   [■] Repeated x5+                  |
| [•] Pending changes   [■] Complete team                                                                              |
+----------------------------------------------------------------------------------------------------------------------+
| Ready.                                                                                                               |
+----------------------------------------------------------------------------------------------------------------------+
| +------------------------------------------------------------------------------------------------------------------+ |
| | [flag] FWC                                                     Owned: 7/20  Missing: 13  Repeated: 0  35%        | |
| |                                                                                                                  | |
| | [ 0 (0) ] [ 1 (1) ] [ 2 (0) ] [ 3 (0) ] [ 4 (0) ] [ 5 (0) ] [ 6 (1) ] [ 7 (0) ]                                  | |
| | [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ]                                  | |
| |                                                                                                                  | |
| | [ 8 (0) ] [ 9 (0) ] [10 (0) ] [11 (0) ] [12 (1) ] [13 (1) ] [14 (0) ] [15 (1) ]                                  | |
| | [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ]                                  | |
| |                                                                                                                  | |
| | [16 (1) ] [17 (0) ] [18 (1) ] [19 (0) ]                                                                          | |
| | [  -  + ] [  -  + ] [  -  + ] [  -  + ]                                                                          | |
| +------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                      |
| +------------------------------------------------------------------------------------------------------------------+ |
| | [flag] MEX                                                      Owned: 8/20  Missing: 12  Repeated: 0  40%       | |
| |                                                                                                                  | |
| | [CREST] [ 1 (0) ] [ 2 (0) ] [ 3 (0) ] [ 4 (1) ] [ 5 (0) ] [ 6 (0) ] [ 7 (1) ] [ 8 (0) ]                          | |
| |         [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ] [  -  + ]                          | |
| |                                                                                                                  | |
| | [ 9 (0) ] [10 (0) ] [11 (1) ] [12 (1) ] [TEAM] [13 (1) ] [14 (1) ] [15 (1) ] [16 (0) ]                           | |
| | [  -  + ] [  -  + ] [  -  + ] [  -  + ]        [  -  + ] [  -  + ] [  -  + ] [  -  + ]                           | |
| |                                                                                                                  | |
| | [17 (0) ] [18 (1) ] [19 (0) ] [20 (0) ]                                                                          | |
| | [  -  + ] [  -  + ] [  -  + ] [  -  + ]                                                                          | |
| +------------------------------------------------------------------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------------------------+
```

---

## Focused TEAM and CREST example

This example reflects the actual card pattern from the current UI and explicitly shows the `TEAM` label on sticker `13` for country teams only.

```text
+----------------------+
| TEAM                 |
|       13 (1)         |
|      [ - ] [ + ]     |
+----------------------+
```

This example reflects the actual card pattern from the current UI and explicitly shows the `CREST` label on sticker `1` for country teams only.

```text
+----------------------+
| CREST                |
|       1 (1)          |
|      [ - ] [ + ]     |
+----------------------+
```

---

## Empty result layout

```text
+----------------------------------------------------------------------------------------------------------------------+
| Quick Sticker Entry                                                                                             [X]  |
+----------------------------------------------------------------------------------------------------------------------+
|                                                                                                       [ Update ]     |
|                                                                                                                      |
| [ zzz__________________________________ ] [ Group B v ] [All] [Missing] [Repeated] [Pending]                         |
|                                                                                                                      |
| [ ] Missing   [■] Owned x1   [■] Repeated x2   [■] Repeated x3   [■] Repeated x4   [■] Repeated x5+                  |
| [•] Pending changes   [■] Complete team                                                                              |
+----------------------------------------------------------------------------------------------------------------------+
| No countries match the current search and filter criteria.                                                           |
+----------------------------------------------------------------------------------------------------------------------+
| [empty country list area]                                                                                            |
+----------------------------------------------------------------------------------------------------------------------+
```

---

## Loading layout

```text
+----------------------------------------------------------------------------------------------------------------------+
| Quick Sticker Entry                                                                                             [X]  |
+----------------------------------------------------------------------------------------------------------------------+
|                                                                                                       [ Update ]     |
|                                                                                                                      |
| [ Search by team code or country name__________________ ] [ All groups v ] [All] [Missing] [Repeated] [Pending]      |
|                                                                                                                      |
| [ ] Missing   [■] Owned x1   [■] Repeated x2   [■] Repeated x3   [■] Repeated x4   [■] Repeated x5+                  |
| [•] Pending changes   [■] Complete team                                                                              |
+----------------------------------------------------------------------------------------------------------------------+
| Loading countries...                                                                                                 |
+----------------------------------------------------------------------------------------------------------------------+
| [loading content area]                                                                                               |
+----------------------------------------------------------------------------------------------------------------------+
```

---

## UI sections

### 1. Header
- Dialog title: `Quick Sticker Entry`.
- close icon button in the top-right corner.

Purpose:
- identify the feature clearly
- provide immediate close access without needing a footer button.

### 2. Top action and filter area
The top control area must include:
- search input with placeholder text similar to `Search by team code or country name`.
- group dropdown with `All groups` as the default option.
- button-style sticker status filters:
  - `All`
  - `Missing`
  - `Repeated`
  - `Pending`
- `Update` button aligned to the right.

Purpose:
- allow quick narrowing of visible countries
- allow quick sticker-state filtering
- keep the batch update action visible and easy to reach

### 3. Legend
Display a compact legend that matches the visual language of the current UI.

Legend items:
- `Missing`
- `Owned x1`
- `Repeated x2`
- `Repeated x3`
- `Repeated x4`
- `Repeated x5+`
- `Pending changes`
- `Complete team`

Purpose:
- Help the user interpret colors, badges, and dot indicators.
- Keep Quick Entry aligned with the legend conventions used in the `Stickers` tab.

### 4. Message area
Display a dialog-level message under the top control panel.

Example messages:
- `Ready.`
- `Loading countries...`
- `Updated 3 sticker value(s).`
- `There are no pending updates to apply.`
- `No countries match the current search and filter criteria.`
- `Update failed.`

### 5. Country list panel
Display a scrollable list of country sections inside a bordered content container.

Behavior:
- Multiple country sections may be visible at once.
- Visible countries depend on search and group filtering.
- Visible sticker cards inside each country depend on the selected sticker status filter.

---

## Country section design

Each country section must display:
- flag or flag placeholder.
- country code.
- optional group indicator beside the country code when used in the title.
- summary aligned on the right:
  - owned
  - missing
  - repeated
  - completion percentage
- a responsive grid of sticker cards for that country.

### Country header example

```text
[flag] MEX · A                                  Owned: 8/20   Missing: 12   Repeated: 0   Complete: 40%
```

### Country behavior
- Country summary must remain visible at the top of the section.
- A complete country must have a visually distinct complete-state style.
- The sticker grid must use only valid sticker positions for that country.
- The section remains visible only if the country matches the active search and group filters.

---

## Sticker card design

Each sticker card must show:
- Optional special label at the top-left area when applicable.
- Sticker number and count in the format `number (count)`.
- Decrement button.
- Increment button.
- Count-based background style.
- Pending-change indicator when applicable.

The sticker number/count text and the increment/decrement controls must be visually centered horizontally inside the card, matching the current UI layout.

### Standard card example

```text
+----------------------+
|                      |
|        4 (1)         |
|      [ - ] [ + ]     |
+----------------------+
```

### CREST card example

```text
+----------------------+
| CREST                |
|        1 (0)         |
|      [ - ] [ + ]     |
+----------------------+
```

### TEAM card example

```text
+----------------------+
| TEAM                 |
|       13 (1)         |
|      [ - ] [ + ]     |
+----------------------+
```

### Pending-change card example

```text
+----------------------+
| TEAM              •  |
|       13 (2)         |
|      [ - ] [ + ]     |
+----------------------+
```
It will be indicated with an orange dot on the top right corner.

---

## Sticker card behavior

Each card must support:
- Increment action.
- Decrement action when the local count is greater than `0`.

### State color behavior
Cards must visually distinguish:
- missing
- owned x1
- repeated x2
- repeated x3
- repeated x4
- repeated x5+
- complete-team section styling
- pending changes indicator

The color coding used by sticker cards must align with the Legend section in the `Stickers` tab.

### Special labels
For country teams:
- Sticker `1` shows `CREST`.
- Sticker `13` shows `TEAM`.

For `FWC` or `CC`:
- no special sticker labels are shown.

### Pending marker behavior
- A pending-change marker appears only when the local count differs from the persisted spreadsheet value.
- If local edits return the sticker count to its original persisted value, the pending marker disappears.
- The marker must refresh immediately after each increment or decrement action.

### Local refresh behavior
After each local click:
- The displayed count updates immediately.
- The card background style updates immediately.
- The pending marker recalculates immediately.
- The country summary recalculates immediately.
- The selected sticker filter is reapplied immediately.

If the active sticker filter no longer matches the updated sticker card, the card must disappear from the filtered view.

This must also apply to the `Pending` filter. If a sticker no longer has a pending change, it must immediately disappear from that filtered view.

---

## Filter behavior

### Search input
- Supports incremental search by country code and country name.
- Matching is case-insensitive.
- Partial matches are allowed.

### Group dropdown
- Includes `All groups`.
- Includes one option per available group code.
- Filters visible country sections only.

### Sticker filter buttons
Available filters:
- `All`
- `Missing`
- `Repeated`
- `Pending`

Behavior:
- `All` shows all valid sticker cards.
- `Missing` shows only stickers with count `0`.
- `Repeated` shows only stickers with count greater than `1`.
- `Pending` shows only stickers whose local count differs from the persisted spreadsheet count.

The `Pending` filter must use the same condition as the pending-change dot displayed on the sticker card.

If a local edit is reverted so that the local count again matches the persisted spreadsheet count, that sticker must stop matching the `Pending` filter immediately.

### Filter persistence
The current search text, group selection, and sticker filter selection must remain active while:
- The user changes local counts.
- The user applies pending updates.
- The dialog refreshes after a successful update.

---

## Country-specific sticker rules

### For `FWC`
- Show stickers `0..19`.
- So not show sticker `20`.
- Do not show special labels like `CREST` or `TEAM`.

### For `CC`
- Show stickers `1..12`.
- Do not show stickers `0,`, `13`-`20`.
- Do not show special labels like `CREST` or `TEAM`.

### For country teams`
- Show stickers `1..20`.
- Do not show sticker `0`.
- Show `CREST` on sticker `1`.
- Show `TEAM` on sticker `13`.

Invalid sticker positions used internally by the spreadsheet must not be shown in the Quick Sticker Entry UI.

---

## Interaction flows

### Open dialog
1. User selects `Manage Panini -> Quick sticker Entry`.
2. Dialog opens.
3. The loading message is shown.
4. Initial country data is loaded.
5. Search controls, legend, message area, and country list are rendered.
6. Message changes to `Ready.` unless another state applies.

### Search countries
1. User types into the search field.
2. Visible countries refresh immediately.
3. No spreadsheet write is performed.
4. If no country matches, the no-results message is shown.

### Change group
1. User selects a group in the dropdown.
2. Visible countries refresh immediately.
3. No spreadsheet write is performed.
4. If no country matches, the no-results message is shown.

### Change sticker filter
1. User clicks `All`, `Missing`, `Repeated`, or `Pending`.
2. Visible sticker cards refresh immediately inside all visible country sections.
3. No spreadsheet write is performed.

### Increment sticker
1. User clicks `+`.
2. Local count increases by `1`.
3. Card count, background style, pending marker, and country summary update immediately.
4. Active sticker filter is reapplied.
5. No spreadsheet write is performed.

### Decrement sticker
1. User clicks `-`.
2. Local count decreases by `1`, but never below `0`.
3. Card count, background style, pending marker, and country summary update immediately.
4. Active sticker filter is reapplied.
5. No spreadsheet write is performed.

### Revert pending change
1. User changes a sticker count locally.
2. The pending marker appears.
3. User changes the same sticker back to its original persisted value.
4. The pending marker disappears.
5. That sticker is removed from the pending update set.
6. If the `Pending` filter is active, that sticker disappears from view immediately.

### Apply updates
1. User clicks **Update**.
2. If there are no pending changes, a clear message is shown.
3. Otherwise a saving message is shown.
4. Pending updates are sent in batch to the backend service.
5. On success:
   - updated values are persisted in `COUNTS`.
   - pending markers are cleared.
   - summaries refresh.
   - active search and filters remain applied.
   - a success message is shown.
6. On failure:
   - local pending state remains available.
   - an error message is shown.

---

## Recommended decisions

- Use a dialog instead of a sidebar for more width.
- Use a country-list layout instead of a single-country selector flow.
- Do not write to the spreadsheet on each click.
- Batch updates through the top-right **Update** button.
- Use button-style sticker filters instead of a dropdown.
- Include search by country code and country name.
- Include group filtering.
- Include legend items for color and state interpretation.
- Include a pending-change dot indicator.
- Include the `Pending` sticker filter.
- Include loading and empty-result states.
- Show `TEAM` for sticker `13` and `CREST` for sticker `1` for team countries.
- Show sticky country summary headers

---
