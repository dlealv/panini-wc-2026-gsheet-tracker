# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and this project uses simple release-based entries focused on user-visible features, project structure, and documentation.

---

## [1.1.5] 2026-08-16

### Overview
Unified the data model across all services, with a standard sticker representation documented in `TechnicalArchitecture.md`. Expanded `StickerSheetRepository` with additional, more flexible methods that centralize Google Spreadsheet access, so the service layer can rely on it directly instead of reading named ranges itself.

Improved the `clasp.zsh` script: test configuration (`scriptId`, `deploymentId`, `deploymentName`) is now read from a local, gitignored config file instead of being hardcoded in tracked files. The script now takes named options - `--env PREFIX` to select a profile by prefix (`scripts/PREFIX_clasp.cfg.zsh`) or `--file PATH` to point at a config file directly - replacing the previous positional arguments.

### Google Spreadsheet template

### Added

No added a new element to the template.

#### Changes

- Under `Conf` tab (hidden) corrected the range of `COUNTRY_NAMES` pointing to the correct column.

#### Fixed

- `COUNTRY_NAMES` named range pointed to the incorrect column, so searching by country name in Quick entry service, didn't provide a correct result. After fix the search works as expected.

### Apps Script

#### Added

- Under `docs` folder:
  - `CodeStyleGuideline.md`: Coding style used in this project.

- Under `scripts` folder:
  - `ENV_clasp.cfg.zsh`: Tracked template (placeholder values only) for `clasp.zsh`'s `--env`/`--file` configuration files, providing `SCRIPT_ID`, `DEPLOYMENT_ID`, and `DEPLOYMENT_NAME`.


#### Changed

- Under the `docs` folder:
  - `TechnicalArchitecture.md`:
    - Added a new `4. Data Model: Sticker & Country Representation` section - the canonical `Map<number,number>` in-memory shape (with dense-vs-sparse examples), the wire-safe `[{number,count}]` array shape and why a plain object keyed by sticker number is never safe on the `google.script.run` boundary even with `JSON.stringify`, the `code`/`name`/`number` field-naming table, the Trade exception (`Object<countryCode, number[]>` and why it's safe), and a 4-point rule for any future method touching this data. Sections 4-7 renumbered to 5-8 to make room; no other cross-references in the document needed updating.
    - Added a "Local Clasp Configuration" subsection under the `clasp.zsh` docs explaining the `--env`/`--file` config-file mechanism (see `scripts` folder below); updated the argument descriptions, directory tree, CI example, and `deploy:test`/`deploy:all` usage examples to match; corrected the scriptId rollback description (now resets to the `__SCRIPT_ID__` placeholder, not "original staging credentials" - there's no longer a real value to restore).

- Under the `.github` folder:
  - `workflows/deploy.yml`: added a step that writes a temporary clasp config file to `$RUNNER_TEMP` from the `PRODUCTION_SCRIPT_ID`/`PRODUCTION_DEPLOYMENT_ID` secrets (mirroring the existing `~/.clasprc.json` step's "write a secret to a file just before use" pattern), since `clasp.zsh` now always requires `--env`/`--file` and production credentials can never live in a tracked `scripts/*_clasp.cfg.zsh` file under any name. `push`/`deploy` steps updated to pass `--file` pointing at it.

- Under the `image` folder;
  - Updated `exportSharedStickersView.jpg` to include the totals added for each data section.

- Under the `scripts` folder:
  - `.clasp.json.template`: Relocated from the repo root (`git mv`, same filename) - confirmed via investigation that `.clasp.json` is never actually created in the repo root (the script always builds it inside an isolated `/tmp/clasp_run_$$/` workspace), so this only changes where the source template lives. Its hardcoded real `scriptId` value replaced with a `__SCRIPT_ID__` placeholder token, mirroring the existing `__ROOT_DIR__` token.
  - `clasp.zsh`:
    - Removed the hardcoded real `TEST_DEPLOYMENT_ID` value (a real Web App deployment ID that was tracked in this public repo).
    - Every invocation now requires an explicit `--env PREFIX` (loads `scripts/PREFIX_clasp.cfg.zsh`) or `--file PATH` (loads `PATH` directly - a bare filename resolves under `scripts/`, anything containing `/` is used as given, relative or absolute) - there is no bare/default invocation. Missing both, or giving both, is a hard error. A config file - rather than individual scriptId/deploymentId flags on the command line - is deliberate: both values are long, opaque, easily-confused strings, so naming each one inside a file makes it self-labeling and keeps both out of shell history and process listings entirely. Implemented via new `parse_options()`/`resolve_config_path()`/`resolve_and_load_config()` helpers, called once near the top of `main`, before any temp workspace is created.
    - Config file format is `SCRIPT_ID`/`DEPLOYMENT_ID`/`DEPLOYMENT_NAME` (all three required regardless of command - `pull`/`push` only use `SCRIPT_ID`), sourced directly into globals of the same name. Each profile states its own deployment name directly, replacing the old `TEST_DEPLOYMENT_NAME`/`PROD_DEPLOYMENT_NAME` constants and a name-prefix flag with a single, simpler mechanism.
    - `update_script_id()`/`deploy_before()` simplified accordingly - `SCRIPT_ID`/`DEPLOYMENT_ID`/`DEPLOYMENT_NAME` are already resolved and validated by the time either function runs, so neither needs its own fallback/resolution logic anymore; `deploy_before()` is now just a log line.
    - `on_exit()` always calls `update_script_id "rollback"`; the `trap on_exit EXIT INT TERM` registration stays positioned right after the temp workspace is created (`init_clasp_config`), so any later failure still cleans it up.
    - Self-locates `CLASP_TEMPLATE`/`SCRIPT_DIR` via `${0:A:h}` (reusing the exact idiom `create_zip_backup()` already used for `BACKUP_DIR`) instead of a bare relative path that only worked because every caller happens to `cd` to repo root first.
    - Removed the now-dead `# cspell:ignore AKfycbyo ...` comment (whitelisted the removed hardcoded string). `show_help()` rewritten for the `--env`/`--file` contract, including the config file format and examples.
    - The startup log now prints a `[CONFIG]` line with `LOG_LEVEL`/`DRY_RUN`/`CMD`/`OPTION` (e.g. `OPTION='--env TEST'` or `OPTION='--file <path>'`, showing which of `--env`/`--file` was used and its value), followed by a second `[CONFIG]` line with the resolved values from the loaded config file: `scriptId=...` for `pull`/`push`, plus `scriptId`/`deploymentId`/`deploymentName` for `deploy`. Shown unconditionally at `LOG_LEVEL=0`, in both dry-run and real runs. Previously the resolved config-file values were only visible at `LOG_LEVEL=1` (via `.clasp.json` state dumps) or, for `deploy`, only the deployment ID - never the scriptId for `pull`/`push` at all. Lets a terse run still confirm which project/deployment is actually being targeted before trusting the result. `deploy`'s `[DRY RUN] Would create new version...` message also now includes the deployment name, not just the ID.
    - Console output at the default `LOG_LEVEL=0` is now terse: exactly one result line per completed pipeline step (e.g. `[PREP] Workspace environment for production build deployment created.`, `[BACKUP] SUCCESS. Created: ...`, `[CLASP] Push process completed successfully.`, `[CLEANUP] completed`), instead of narrating every intermediate action. Added a general-purpose `log(level, message)` helper - prints only when `LOG_LEVEL >= level` - and routed every step-starting/intermediate message (and error/warning message) through it, replacing the previous mix of unconditional `echo` calls and one-off `LOG_LEVEL` checks. `LOG_LEVEL=1` still shows the full previous detail, including raw `clasp` command output and simulated per-file DRY RUN actions, now also routed through the same helper. `deploy_after()`'s/`pull_after()`'s completion line and `cleanup_workspace()` call were reordered so the terse completion line always prints before the terse `[CLEANUP] completed` line, matching `push`'s existing order (its cleanup already happened via the exit trap, after `push_after()` returns).
  - `ENV_clasp.cfg.zsh` (new, tracked): template for `clasp.zsh`'s config files - placeholder values only, safe to commit. Real profiles (`scripts/*_clasp.cfg.zsh`, e.g. `TEST_clasp.cfg.zsh`) are gitignored and created locally by copying this template.


- Under the `src/html` folder: 
  - Comment audit: Added comments for all html files to easy identify html blocks such as sections or view. For example using this format: `<!-- view/section: X -->` on start of the block and `<!-- /view/section: X -->` on the end of the block identifying the section or the view.
  - `ExportView.html`
    - Comment audit - top-level blocks with no comments at all.
  - `ImportView.html`: Comment audit
  - `MobileHome.html`: Comment audit
  - `QuickEntryHelpers.html`:
    - `commitPendingUpdates()` and `_applyPendingStickerUpdate()` no longer write a `label` field onto sticker objects - that field was removed from the canonical sticker shape in the `QuickEntryService.gs` step above; `QuickEntryRender.html` now builds the label text fresh on every render instead of trusting a stored value.
    - Pending-update record field renames (`countryCode`→`code`, `stickerNumber`→`number`).
    - `getPendingUpdates()` now groups the flat `state.pendingUpdates` map (`"code|number" -> count`, itself unchanged) into the new `[{code, stickers:[{number,count}]}]` shape before returning, using an internal `Map` for the grouping step (order-preserving, never crosses any boundary itself - converted to a plain array before the function returns, consistent with this project's "Map internal, plain shape at the wire" pattern used everywhere else).
    - `commitPendingUpdates()` updated to iterate the new nested `update.stickers` array per country instead of reading `.number`/`.count` directly off a flat `update`.
    - Fixed the same class of bug as `applyPendingUpdates()` above: `updatePendingChangesMessage()`'s "Pending changes: N" count used `getPendingUpdates(...).length`, which would have silently become the number of countries with pending edits instead of the number of pending sticker edits. Changed to `Object.keys(state.pendingUpdates || {}).length`, which reads the still-flat internal state directly and doesn't depend on `getPendingUpdates()`'s (now grouped) output shape at all.
  - `QuickEntryRender.html`:
    - `_buildStickerCard()`'s badge lookup changed from the removed per-sticker `sticker.iconLabel` to the new country-level sparse lookup, `country.iconLabels && country.iconLabels[sticker.number]` (guarded for fixtures/countries that omit `iconLabels`). Its label text changed from `sticker.label || sticker.number` to an inline `` `${sticker.number} (${sticker.count})` `` build, since `label` no longer exists on the sticker.
    - Removed `_getStickerCountClass()` (dead code - zero call sites, a near-duplicate of the actually-used `_getStickerColorClass()`).
  - `QuickEntryView.html`: Comment audit several top-level blocks with no comments at all.
  - `TradeView.html`: Comment audit.

- Under the `src` folder:
  - `Code.gs`: Added `@see` references pointing at the documented service method to every GAS entry point that was previously undocumented or only partially documented (`previewStickerData`, `importStickerData`, `exportAllStickerData`, `exportSharedStickerData`, `getQuickEntryInitialData`, `applyQuickEntryUpdates`, all five Trade wrappers, and their five mobile-context counterparts). `Code.gs` functions are thin passthroughs, so this avoids duplicating (and risking drift from) the full type/example docs already added to the underlying service methods, following the same `@see` pattern `ImportService.importStickerData()` already used.
  - `Commons.gs` (`StickerSheetRepository`):
    - Renamed `COUNTRIES_RANGE_NAME` to `COUNTRY_CODES_RANGE_NAME` and `getCountriesRange()` to `getCountryCodesRange()` to clarify that the named range only contains country codes.
    - `getCountryCounts()` is no longer its own class method - `getStickerCount()` is its only caller, so it's now an inner function scoped inside `getStickerCount()` itself; the "no count data found" guard lives there too, so a COUNTS/COUNTRIES range-size mismatch throws a clear message instead of a raw `TypeError`.
    - Added `getCountryCodes()`, returning the set of valid normalized country codes in album order (`COUNTRIES` named range order), read directly instead of routing through `getCountries()`.
    - `updateStickerCounts()`/`_applyCountUpdates()`: the per-country `counts` payload is a `Map<number,number>` instead of a plain object, so callers no longer depend on JS object key ordering. `clean_all` mode sources the codes to clear from `getCountryCodes()` instead of `getCountries()`.
    - `_normalizeCountryRow(country, values)` simplified to `_normalizeCountryRow(code, values)`, since it only ever used `country.code`.
    - Removed the public `getCountryMap()` method (and the dead `row` field it produced). Replaced with a private `_getCountryIndex(code)`, which looks up a country's row position via a lazily-built, cached `Map<string,number>` (`countryIndexByCode`) - only the position is cached, never count values, since `getStickerCount()` still re-reads the COUNTS range fresh every call. `_normalizeCountryCode()` now validates existence via `getCountryCodes().has(code)`.
    - `getCountries()`/`getStickerCount()`: `counts` is the canonical dense `Map<number,number>` (one entry per sticker slot 0-20, including zero counts) instead of a plain positional `Array<number>`.
    - Country record field renamed `countryName` → `name`.
    - Removed `_groupUpdatesByCountry()` (dead code, zero call sites).
    - Added `getFlagIcons()`/`getDone()`, two positional-array getters (one entry per row, in sheet order, never filtered, cached) mirroring the existing pattern used for other named-range-derived data.
    - `getCountries()` gained a full options bag: `getCountries({ onlyVisible = false, includeName = true, includeGroup = true, includeFlag = true, includeIcon = false, includeDone = false } = {})`. `onlyVisible` narrows each country's `counts` Map to only the sticker numbers visible for that country's type (`getCountryBounds()`) - e.g. `FWC`'s Map has entries `0-19`, not the full `0-20`. `includeIcon`/`includeDone` zip in the `FLAG_ICONS`/`DONE` ranges by row position. `includeName`/`includeGroup`/`includeFlag` default `true`, so a bare `getCountries()` call is unchanged from before. The narrowing/zipping is a cheap in-memory operation over already-cached data (no extra range reads); the exact-default shape is still returned from a cache slot (`this.countries`/`this.visibleCountries`, preserving reference-identity for callers that mutate the result), while any other option combination is computed fresh per call.
    - Added `getBoundsForCountry(code)`, a static helper returning one country's `[min,max]` sticker bounds (falling back to the shared `'TEAM'` range), consolidating the `bounds.get(code) || bounds.get('TEAM')` lookup that was previously duplicated inline in seven places across `Commons.gs`, `ImportService.gs`, and `QuickEntryService.gs`. `getCountries()`'s `onlyVisible` narrowing, `_normalizeCountryRow()`, and `_applyCountUpdates()` now call it instead of repeating the lookup.
  - `ExportService.gs`:
    - `ExportService`:
      - Updated the call to `getCountriesRange()` to the renamed `getCountryCodesRange()`.
      - `getRows()`/`_buildRows()`'s `counts` field is the canonical dense `Map<number,number>` instead of a plain positional `Array<number>`.
      - `_buildRows()` builds the row model entirely from a single `repo.getCountries({ onlyVisible: true, includeName: false, includeGroup: false, includeFlag: false, includeIcon: true, includeDone: true })` call - no raw named-range access and no per-country COUNTS range read (`getCountryCounts()`, `getStickerCount()`'s inner helper, used to be called once per country, re-reading the whole COUNTS range each time). `onlyVisible: true` means every row's `counts` is already narrowed to that country's valid sticker range before `ExportStickers` ever sees it.
    - `ExportStickers`:
      - Internal sticker/count pairs renamed `{sticker,count}` → `{number,count}` (`filterStickerNumbersBy()`, `_formatStickerNumbers()`, `_compactStickerRanges()`, and their JSDoc), matching the `{number,count}` convention used elsewhere in the codebase. Never crosses the wire - Export's UI-facing payload is a formatted text string, not structured JSON.
      - `exportSharedData()`: section headers now include the total count of distinct repeated/missing sticker numbers across all countries, e.g. `🔄 Repeats (11)` / `❌ Missing (15)`.
      - `filterStickerNumbersBy()` simplified to iterate a row's `counts` Map directly (`for...of`, already in ascending sticker-number order) and classify each entry as owned/missing/repeats - no separate per-position bounds check needed, since `_buildRows()` now hands it an already-narrowed row. `_isExportableSticker()` deleted as a result. Added the `@param` JSDoc this method had been missing.
  - `ImportService.gs`:
    - `ImportService`:
      - `preview()`/`import()` now call `getRepo().getCountryCodes()` instead of the removed `getRepo().getCountryMap()`.
      - `_writeCountries()` is a straight passthrough to `updateStickerCounts()` - `ImportStickers` produces a `Map` natively, so the old conversion adapter is gone.
      - `preview()`: display order is now an explicit, documented step - ascending sticker sort per country, plus country-level album-order sort via `getCountryCodes()` (new behavior; sorting stays out of `ImportStickers`/`LineNormalize` and the HTML layer entirely).
    - `ImportStickers`/`LineNormalize`:
      - Dropped the `options`/`sortStickers` mechanism entirely (`_buildStickerOrder()`, `LineNormalize._sortStickers()` removed) - both classes are now unconditionally order-preserving.
      - Constructors take `countryCodes` (`Set<string>`) instead of the `{row, col}`-shaped `countryMap`, since only code validation was ever needed.
      - `ImportStickers.parse()`/`_parseLine()`/`_parseStickerToken()`: per-country `counts` is a `Map<number,number>` built in encounter order, replacing the `counts:{}` + `stickerOrder:[]` pair. `parse()` no longer returns a `sortStickers` flag.
      - `_validateStickerNumber()`, `_mapTokenToCount()`, and `_getAlbumPositions()` now call `StickerSheetRepository.getBoundsForCountry(code)` instead of each repeating the same `bounds.get(code) || bounds.get('TEAM')` lookup inline.
  - `QuickEntryService.gs`:
    - Documented every method with complete JSDoc (`@param`/`@returns`/`@throws` plus data examples).
    - Field naming consistency: country records' `countryName` → `name`; pending-update records' `countryCode` → `code` and `stickerNumber` → `number`, so an identifier is spelled the same way regardless of which record it appears on. Method/local parameter names that aren't themselves record fields (e.g. `_validateVisibleSticker(countryCode, stickerNumber)`) were left as-is.
    - `applyPendingUpdates()`'s wire-input contract changed from a flat list of per-sticker triples (`[{code, number, count}]`) to grouped-by-country (`[{code, stickers:[{number, count}]}]`), matching the shape `getInitialData()` already returns. `_normalizePendingUpdate()` replaced by `_normalizeCountryUpdate()`/`_normalizeStickerUpdate()` to match the new nesting; `_normalizePendingUpdates()` itself is now a single `.map()` over the grouped input. Fixed the "Updated N sticker value(s)." message, previously computed from `pendingUpdates.length` (silently countries, not stickers, under the new shape) - now sums `counts.size` across the normalized countries.
    - Sticker view model rebuilt around `getCountries({ onlyVisible: true, includeName: true, includeGroup: true, includeFlag: true, includeIcon: false, includeDone: false })`, which delivers each country's `counts` already narrowed to its visible sticker range. `_buildStickerView()`, `_buildStickerViews()`, `_getVisibleStickerNumbers()`, and `_buildNumberRange()` deleted - stickers are built directly from `country.counts` (`Array.from(counts, ([number,count]) => ({number,count}))`), dropping the `status`/`colorClass` fields (dead - `QuickEntryRender.html` recomputes `colorClass` itself and never reads `status`) and `label` (redundant - the HTML already reconstructs an equivalent string). `_validateVisibleSticker()` simplified to a direct min/max bounds comparison via `StickerSheetRepository.getBoundsForCountry(countryCode)`. Added `_buildIconLabels(countryCode)`, a sparse per-country `{1:'CREST', 13:'TEAM'}` lookup, replacing a per-sticker `iconLabel` field that padded most stickers with an empty string. `QuickEntryHelpers.html`/`QuickEntryRender.html` updated to match - see the `src/html` entries below.
  - `TradeService.gs` (`TradeService`; no changes to `TradeCalculation`/`TradeQrHelper` this release):
    - Updated the call to `getCountriesRange()` to the renamed `getCountryCodesRange()`.
    - `_parseStickerInput()`: now calls `getRepo().getCountryCodes()` instead of `getRepo().getCountryMap()`; dropped the `{sortStickers: false}` option since `ImportStickers` is unconditionally order-preserving now.
    - `_buildOtherTradeInfo()`: removed the `sortStickers`/`stickerOrder` branching - reads sticker order directly via `Array.from(country.counts.keys())` against the `Map` `ImportStickers` now always returns.
    - `_buildTradeUpdates()`: accumulator builds a `Map` directly per country, matching the standard shape end-to-end with no separate adapter needed. Its stale JSDoc `@returns` (still describing the old flat `{countryCode,stickerNumber,count}` shape) fixed to match: `{countries:[{code,counts:Map}]}`.
    - `_buildTradeInfo()` updated to read `item.number` instead of `item.sticker`, since it consumes `ExportStickers.filterStickerNumbersBy()`'s output directly.
    - `_getCountryDoneMap()` rebuilt from `repo.getCountryCodes()` (ordered, already-filtered) zipped by index against `repo.getDone()`, instead of raw `getCountryCodesRange().getValues()`/`getDoneRange().getValues()` access - no per-country range re-reads, and no dependency on `getCountries()` for fields (`counts`/`name`/`group`/`flag`) this method never uses.

- Under the `test` folder:
  - `Commons.unit.test.js`:
    - Renamed mocks/describe blocks for `getCountriesRange()`/`countriesRange` to match the `getCountryCodesRange()`/`countryCodeRange` rename.
    - Added a `getCountryCodes()` test suite: normalization, album ordering, caching, empty-range filtering.
    - Removed the `getCountryMap()` describe block (method no longer exists); coverage now implicit through `getStickerCount()`/`updateStickerCounts()`, whose fixtures seed `countryCodes`/`countryIndexByCode` directly.
    - Updated `updateStickerCounts()`/`getCountries()` assertions to `Map`-based `counts`.
    - The former `getCountryCounts()` describe block was folded into `getStickerCount()`'s (row lookup, normalization, and error-case coverage, including the "no count data found" guard) - `getCountryCounts()` is an inner function now, scoped inside `getStickerCount()` and inaccessible anywhere else, so per the "public methods only" testing rule its behavior is exercised entirely through that public entry point instead of its own describe block.
    - Added test coverage for `getFlagIcons()`/`getDone()`: values against the shared fixture, whitespace trimming, invalid/blank-value normalization, caching.
    - Added `getCountries()` coverage for its full options bag: `onlyVisible` bounds per country type (FWC 0-19, CC 1-12, TEAM/MEX 1-20) and separate caching from the dense result; `includeIcon`/`includeDone`/`includeName`/`includeGroup`/`includeFlag` field presence/absence; the exact-default shape returning the cached array (reference-equal) while any other combination returns a fresh array each call; dense and visible calls interleaved in the same execution (both orders) not corrupting each other's cache.
  - `ExportService.unit.test.js`:
    - Renamed `{sticker,count}` fixtures and the `buildCounts()`/`computeDone()` helpers' `pair.sticker` references to `{number,count}`/`pair.number`, matching the `ExportService.gs` rename.
    - `buildCounts(pairs, [min,max])` builds a `Map<number,number>` bounded to one country type's valid sticker range (default `[1,20]`), matching what `getCountries({ onlyVisible: true })` hands `ExportStickers` in production - any pair outside `[min,max]` is ignored. `getRows()`'s structure test updated from `Array.isArray(row.counts)` to `row.counts instanceof Map`.
    - Added coverage for the `exportSharedData()` header totals: exact counts against the shared FWC/MEX fixture, invariance under `isCompact: true`, and `(0)` in both fallback cases (no repeats / album complete).
    - Added coverage proving `_buildRows()` never re-reads the COUNTS range per-country (`getCountryCounts()` is now an inner function of `getStickerCount()`, unreachable from `_buildRows()` entirely, so this asserts on `getCountsRange()`'s call count instead), and that `icon`/`done` land on the correct country (no positional shift).
  - `ImportService.unit.test.js`:
    - `ImportStickers`/`LineNormalize`: updated fixtures to construct with `Set<string>` country codes instead of a `countryMap` object; updated `counts` assertions to `Map`; rewrote the `sortStickers`-option test blocks to confirm the new unconditional order-preserving behavior. Removed the direct `_validateCountryCode()` describe block - the scenario it tested is unreachable via the public `parse()` path (`LineNormalize._extractCountryCode()` already gates on the same check), and remains covered through `LineNormalize.normalizeLine()`'s own tests.
    - `ImportService`: added coverage for `preview()`'s ascending sticker sort and new album-order country sort.
  - `QuickEntryHelpers.unit.test.js`:
    - `getPendingUpdates()`/`commitPendingUpdates()` fixtures and assertions rewritten for the grouped shape, including multi-sticker/multi-country grouping cases.
    - Strengthened `updatePendingChangesMessage()`'s count test with a fixture that distinguishes "count of stickers" from "count of countries" (the previous fixture made both numbers equal).
    - Renamed `countryCode`/`countryName` fields to `code`/`name`, and `stickerNumber` to `number`, throughout.
    - Removed `label` from every fixture/assertion (field no longer exists on the sticker shape).
  - `QuickEntryRender.unit.test.js`:
    - `_buildStickerCard()`'s badge test updated to pass `iconLabels` on the country argument instead of `iconLabel` on the sticker argument; added a no-match case and a test asserting the label text is built from `number`/`count`.
    - Added a `QuickEntryService`/`QuickEntryRender` integration scenarios block, feeding a real country view model from `QuickEntryService.getInitialData()` into `QuickEntryRender.buildCountrySection()` to confirm the produced shape matches what the renderer expects.
  - `QuickEntryService.unit.test.js`:
    - `_normalizePendingUpdates()`/`applyPendingUpdates()` fixtures rewritten for the grouped `[{code, stickers:[{number,count}]}]` input shape and `Map`-based `counts`; added coverage for an empty `stickers` array (rejected) and the sticker-count-vs-country-count message fix.
    - Removed the `_getStickerStatus()`, `_getStickerColorClass()`, and `_buildStickerView()` describe blocks (methods no longer exist); coverage for the new sticker/`iconLabels` shape added through `_buildCountryViewModel()` instead.
    - Renamed `countryCode`/`countryName` fields to `code`/`name`, and `stickerNumber` to `number`, throughout.
    - Added a `QuickEntryService`/`QuickEntryHelpers` integration scenarios block, running a client-side pending-updates map through the real `getPendingUpdates()` → `applyPendingUpdates()` path.
    - Removed all 8 `describe` blocks that tested private methods directly, per the project's "public methods only" testing rule - their behavior is exercised through `getInitialData()`/`applyPendingUpdates()` instead.
  - `TradeService.unit.test.js`: Updated `executeTrade()` assertions to expect `Map`-based `counts` in the `updateStickerCounts()` payload. Renamed the one-off `countryName` fixture field to `name`.
  - `testKernel.js`: `TEST_DATA.countries[].countryName` → `.name`.

- Under the root folder:
  - `.gitignore`:
    - Removed a duplicate `backup/` line.
    - Added `CLAUDE*.md` (wildcard, replacing the old exact-match `CLAUDE.md` entry, so an archived `CLAUDE_<phase>.md` file also stays untracked).
    - Added `scripts/*_clasp.cfg.zsh` with `!scripts/ENV_clasp.cfg.zsh` negated back in - every real `clasp.zsh` config profile is gitignored except the tracked placeholder template (see `scripts` folder below).
  - `package.json`: `clasp:pull`/`clasp:push`/`clasp:deploy`/`deploy:test`/`deploy:all` all default to `--env TEST` when no extra args are given (`${@:---env TEST}`), so the routine local commands stay `npm run clasp:push`/`npm run deploy:test`/etc. - `clasp.zsh` no longer has its own bare-invocation default, so this default now lives one level up, at the npm-script layer, and is still fully overridable (`npm run clasp:push -- --env DAVID`, `-- --file <path>`). Verified the default doesn't double-apply when `deploy:test`/`deploy:all` forward into `clasp:push`/`clasp:deploy`, which each have the same default themselves.
  - `README.md`:
    - Moved the `.clasp.json.template` bullet from "Under root" into "Under the `scripts` folder" (its new location) and added a bullet for the new, tracked `scripts/ENV_clasp.cfg.zsh` template.
    - Updated the **Export shared stickers** example output to match `exportSharedData()`'s new header totals (`🔄 Repeats (15)` / `❌ Missing (15)`) and, in passing, fixed a pre-existing mismatch unrelated to this change: the example showed `🔄 Repeated stickers`/`❌ Missing stickers`, but the code has always emitted `🔄 Repeats`/`❌ Missing`.
  - `cspell.json`: Removed the `.clasp.json.template` entry from `ignorePaths` - the relocated template now contains only placeholder tokens, no real secret string left to whitelist.

#### Fixed

- Adjusted the named range `COUNTRIES` pointing to the correct column in the `Config` hidden tab.
- `scripts/clasp.zsh`'s `is_dry_run()` did a strict string match (`[[ "$DRY_RUN" == "true" ]]`), so any other truthy-looking value - `DRY_RUN=1` in particular - silently evaluated as "not dry run" and ran real `clasp` commands (a real deploy, or a real pull overwriting `src/`) with no `[DRY RUN]` indication anywhere in the output. Found live: a `DRY_RUN=1` deploy actually redeployed the TEST Web App to a new version. Fixed by explicitly recognizing `true`/`1`/`yes`/`on` and `false`/`0`/`no`/`off` (case-insensitive), and - since this flag is safety-critical - treating any other, unrecognized value as a hard error instead of silently defaulting to a real run.

---

## [1.1.4] 2026-08-13

### Overview

Implemented the Trade service for Apps Script. Centralized the Google Spreadsheet writing process in the `StickerSheetRepository` class. Fixed a bug in the Import service where selecting **Update counts clearing country counts** actually executed the **Update counts** option. Fixed Quick entry search by name not returning result. Improved `testKernel.js` to use `TEST_DATA` consistently. Standardized the look and feel by moving common styles to `CommonStyles.html` and `MobileStyles.html`. Updated `panini_fwc2026_roster.csv` with the correct player and sticker names based on the [Panini missing stickers website](https://www.paniniamerica.net/album-fifa-world-cup-2026-official-sticker-collection.html), and updated club information using the player affiliations available when the Panini stickers were published. Updated deployment (`validate.yml`) to include `clean_roster.py` execution to validate roster file before merge to main.

### Google Spreadsheet template

#### Added

- `TRADE_PREFERENCES` named range to store the user's trade preferences for the Trade service, accessible from the **Manage Panini** custom menu.

#### Changes

- Under the `About` tab:
  - Updated the version information.
- Under the `Lookup` tab:
  - Added a new column for `DOB`.
  - Adjusted the formula to include the `DOB` column from the `Roster` tab.
- Under the `Roster` tab:
  - Added the `DOB` column since the Panini roster file now includes the players' dates of birth.
  - Added `Trade Preferences` in column `Q` and configured the `TRADE_PREFERENCES` named range to reference that column.

### Apps Script

#### Added

- Under the `data` folder:
  - `clean_roster.py`: Helper Python script to clean, validate, and standardize the `panini_fwc2026_roster.csv` file.

- Under the `docs` folder:
  - `TradeServiceMockDesign.md`: Mock UI design for the Trade service.
  - `TradeServiceRequirements.md`: Trade service specification.

- Under the `images` folder:
  - Added new images related to the Trade service.

- Under the `src/html` folder:
  - `MobileTradeStyles.html`: Specific CSS styles for the Trade service on mobile devices.
  - `MobileTradeView.html`: Mobile wrapper for `TradeView.html`.
  - `QRUtils.html`: Utility classes for processing and handling QR codes, using BarcodeDetector or jsQR libraries
  - `TradeDialog.html`: Desktop dialog for the Trade service.
  - `TradeStyles.html`: Specific CSS styles for the Trade service.
  - `TradeView.html`: Shared view for the Trade service.

- Under the `src` folder:
  - `TradeService.gs`: Classes for managing the Trade service backend.

- Under the root folder:
  - `.style.yapf`: YAPF configuration file for Python code formatting.

#### Changes

- Under `.github/workflow`
  - `validate.yml`: Added the step to include the validation of the `panini_fwc2026_roster.csv` running `python data/clean_roster.py` if the scripts fails validation, then the deployments stops.

- Under the `data` folder:
  - `panini_fwc2026_roster.csv`:
    - Updated player names and sticker information based on the [Panini missing stickers website](https://www.paniniamerica.net/album-fifa-world-cup-2026-official-sticker-collection.html).
    - Standardized club names and adjusted some club affiliations based on the cutoff date before the World Cup.
    - The file now passes all checks performed by `data/clean_roster.py`.
    - Using the country names as they appear in the album for example: Türkiye, Côte d'Ivoire and Bosnia-Herzegovina.

- Under the `docs` folder:
  - `FAQ.md`:
    - Organized the document into sections.
    - Added a section for the Trade service.
  - `TechnicalArchitecture.md`:
    - Updated the documentation to include the new Trade service.
    - Updated the responsibilities of the `StickerSheetRepository` class.

- Under the `images` folder:
  - Updated some images to include the changes in the `Lookup` and `Roster` tab.

- Under the `scripts` folder:
  - `clasp.zsh`: 
    - Added a timestamp at the beginning of script execution.
    - Added a 4th input argument `CUSTOM_NAME_PREFIX` to allow define the prefix to be used for deployment name. Adjusted the logic for defining the `DEPLOYMENT_NAME` when this additional input argument is present to add as a prefix to the base name (production name).

- Under the `src/html` folder:
  - `AboutView.html`: Updated the release information.
  - `CommonStyles.html`:
    - Centralized common styles used by different services.
    - Moved common components from other style files to this file.
    - Added the `message-section` definition for messages and previews so the output is scrollable.
  - `ExportView.html`:
    - Added a feedback message block inside a section to follow the same pattern as other services.
    - Added the `exportMessageSection` section ID and the `exportMessageSectionEl` variable.
    - Adjusted `renderWarnings()`, `setMessage()`, and `clearExportMessage()` to use the new message section.
    - Moved the message section above the action section.
    - Removed the `mobileMessage` DOM variable because there is no specific message for the mobile service.
    - Removed the `mobileExportTopHint` element because it is not used.
  - `ImportExportStyles.html`:
    - Removed the `.btn-inline` style because it belongs in `CommonStyles.html`.
    - Removed the `.section-title-inline` style because it is not in use.
    - Adjusted the property `min-height` in `#exportText` to ensure the entire dialog is visible.
    - Added a comment to each definition.
  - `ImportHelpers.html`:
    - Updated `getUIState()` and `setBusy()` to read values from the DOM instead of global variables that are not visible outside the IIFE.
  - `ImportView.html`:
    - Adjusted the HTML to standardize the information message block with other services.
    - Documented the specific design of this service, which was intentionally designed to contain all elements inside a single view.
    - Added the `importMessageSection` section and the corresponding `importMessageSectionEl` variable.
    - Adjusted `clearInput()`, `setMessage()`, and `renderWarnings()` to properly use the new DOM variable.
    - Moved the message section above the action section.
  - `MobileExportStyles.html`:
    - Simplified the file by moving common styles to `MobileStyles.html`.
    - Adjusted specific values required by the Export service on mobile devices.
  - `MobileHome.html`:
    - Added the Trade service, including `TradeStyles.html` and `TradeView.html`, and added a new drawer element.
    - Changed the menu order so Quick Entry and Trade appear first.
    - Changed the default menu item to Quick Entry because it is used more frequently than the Import service on mobile devices.
  - `MobileImportStyles.html`:
    - Adjusted styles to accommodate the new design in `MobileImportView.html`.
  - `QuickEntryHelpers.html`:
    - Updated `setMessage()` to set message information based on the changes in the view.
    - Removed deadcode.
  - `QuickEntryStyles.html`:
    - Added the `qe-message` style.
  - `QuickEntryView.html`:
    - Updated message output to use the specific `message info qe-message` style.

- Under the `src` folder: Improved JSDOC documentation, to include examples and additional tags.
  - `Code.gs`:
    - Added Apps Script entry points for the Trade service.
  - `Commons.gs`:
    - Added `updateStickerCounts()` as the entry point for spreadsheet writing processes used by the Trade service.
    - The input is now expected in the canonical form defined by `StickerSheetRepository`.
    - Optimized the method to perform a bulk write of all rows instead of updating the `COUNTS` named range separately for each country.
    - Added attribute: `this.tradePreferences` and method: `getTradePreferences()`.
  - `ExportService.gs`:
    - Renamed `_filterStickerNumbersBy()` to `filterStickerNumbersBy()` because it is a public method now also used by the Trade service.
  - `ImportService.gs`:
    - Updated the `ImportStickers` and `LineNormalize` classes to support configurable sorting behavior through the `options` input argument. This is not required by the Import service but is required by the Trade service.
    - Defined `COUNTRY_CODE_PATTERN` on top of the file, since it is used by more than one class.
    - Defined also the corresponding regular expression `COUNTRY_CODE_REGEX`.
    - `LineNormalize`:
      - Added an optional `options` constructor argument to support configurable normalization behavior.
      - Added support for propagating sorting configuration while keeping the default behavior unchanged.
      - Added support for preserving normalized sticker input order when sorting is disabled.
    - `ImportStickers`:
      - Added an optional `options` constructor argument to support configurable parsing behavior.
      - Added the `sortStickers` output property in `parse()` to indicate whether sticker data is already sorted.
      - Added conditional `stickerOrder` output per country when `sortStickers` is disabled, preserving the normalized input order that is not guaranteed by the `counts` object.
      - Kept the default `sortStickers: true` behavior unchanged to avoid impacting existing import flows.
      - This change enables consumers such as `TradeService` to preserve sticker order when required.
      - Removed the `_writeCountries` method because writing is now delegated to `updateStickerCounts()` through the `StickerSheetRepository` class.
      - Removed the `_clearCountries` and `_clearAllCounts` methods because clearing is now handled by `updateStickerCounts()` in `StickerSheetRepository`.

- Under the `test/utils` folder:
  - `testKernel.js`:
    - Added implementations for `getStickerCount()`, `getTradePreferences()`, `updateStickerCounts()` in the `MockStickerSheetRepository` class.
    - Adjusted `TEST_DATA` to represent the same data as `initializeSpreadsheetAppMock()`, making `TEST_DATA` the source of truth.
    - Exported `TEST_DATA` to make it available for modification in specific tests.
    - Removed `MockStickerSheetRepository` since it is not required, mocking only the data and specific gsheet function, no need to mock the entire class.
    - Updated `initializeSpreadsheetAppMock()` method to get as an input argument `countries` with default value `TEST_DATA` to have more flexible tests.

- Under the `test` folder:
  - Adjusted regression tests that failed after the changes in `testKernel.js` to use `TEST_DATA` as the source of truth.
  - `Commons.unit.test.js`:
    - Updated the `getCountryCounts()` suite, including the `normalizes country code before lookup` test.
    - Updated tests related to `updateStickerCounts()` after the contract changed.
    - Added tests for the case of `clear_all` after fixing the implementation to restore `0` for non-valid positions.
  - `ExportHelpers.unit.test.js`: 
    - Removed describe related to private functions.
    - Increase coverage for public functions.
  - `ImportHelpers.html.js`:
    - Adjusted tests after modifying the source file.
  - `ImportService.unit.test.js`:
    - Removed repetitive tests and tests related to Export services.
    - Updated the `sheet writes` suite, including the `export contains no zero values` test.
    - Added specific suites for `LineNormalize` and `ImportStickers` to validate behavior when the `options` input argument is provided.
    - Added coverage for `sortStickers` behavior, including conditional `stickerOrder` output and preservation of input order when sorting is disabled.
    - Added more detailed coverage for all Import modes.
  - `QuickEntryHelpers.unit.test.js`: 
    - Added tests to improve coverage.
    - Removed tests related to private functions.
  - `QuickEntryService.unit.test.js`:
    - Updated tests for `applyPendingUpdates()` and `_normalizePendingUpdates()` because the `updateStickerCounts()` contract in `StickerSheetRepository` changed.
    - Added a specific test for `getVisibleCountries` for this case: `returns filtered visible countries search by name` to include the specific case of country name search.
    - Added additional tess to improve coverage.

- Under the root folder:
  - `.gitignore`:
    - Added `panini_fwc2026_roster_clean.csv` because it is a working file generated during the cleanup process for `panini_fwc2026_roster.csv`.
  - `cspell.json`:
    - Added `data/clean_roster.py` to the ignored files.
    - Added `data/panini_fwc2026_roster*.csv` to ignored files.
    - Added additional word exceptions to the code spell checker.
  - `package.json`: Updated the definition of `deploy:test` and `deploy:all` to correctly accept optional input arguments.
  - `TODO.md`:
    - Added the Trade service and the refactoring of the data model to unify it.
  - `README.md`:
    - Added a section describing the Trade service.
    - Updated the list of files.
    - Updated test coverage information.
    - Added minor decoration and reviewed wording.

#### Fixed

- Import service:
  - Fixed an issue with the **Update counts clearing country counts** option, which was incorrectly executing **Update counts**.
  - The issue was caused by `ImportHelpers.html` relying on global variables that were not in the scope of the IIFE.
  - The helper now reads the required values from the DOM instead of relying on unavailable global variables.
  - Because the `mode` variable was not defined in the expected scope, the code incorrectly fell back to the default `update` mode.
  - Fixed that import service under `clear_all` didn't restore `0`s for non-valid sticker positions.
- Quick entry service:
  - Search by name didn't return the expected result, for example `bos` returns no result, expected to return `BIH`.
- `package.json`: Adjusted the script task `deploy:test` and `deploy:all` to work as expected with optional input arguments.

---

## [1.1.3] 2026-07-25

### Overview

Google Spreadsheet tracker: implemented a roster lookup feature based on the Panini FIFA World Cup 2026 roster file. Updated the project documentation to include the new lookup functionality. Minor project configuration changes were also made to include configuration files in the GitHub repository. Fixed repeated and %-repeats calculation in `Reports` tab, to include user selection value in INCLUDE CC.

### Google Spreadsheet template

#### Added

- `Roster` tab to the Google Spreadsheet template to load the Panini sticker roster file from the GitHub repository.
- `Lookup` tab to the Google Spreadsheet template to perform lookup searches against the data loaded in the `Roster` tab.

- Under the `data` folder:
  - `panini_fwc2026_roster.csv`: Roster file containing detailed information for each sticker, including player name, country, club, and position. It also includes information for special stickers (`FWC` and `CC`). This file is used to populate the `Roster` tab and provides the data used by the `Lookup` tab.

- Under the `images` folder:
  - `lookupTabView.jpg`: Screenshot of the `Lookup` tab.
  - `rosterTabView.jpg`: Screenshot of the `Roster` tab.

- Under the root folder:
  - Added the `data` folder to store static project data.

#### Changes

- Under the `Reports` tab:
  - Now the calculation of percentage of repeats is based on total repeats, before it was based on unique repeats. It makes more sense to calculate total repeats and its percentage based on total repeats.

- Under the `images` folder: Standardized image file names related to the Google Spreadsheet template by consistently including `Tab` in the file names:
  - `aboutTabView.jpg`: Updated the screenshot to show the corresponding tab.
  - `reportsView.jpg`: Renamed to `reportsTabView.jpg` and updated the screenshot to show the corresponding tab.
  - `stickersView.jpg`: Renamed to `stickersTabView.jpg`.
  - `swapCompactView.jpg`: Renamed to `swapCompactTabView.jpg` and updated the screenshot to show the corresponding tab.
  - `tradeTabView.jpg`: Updated the screenshot to show the corresponding tab.

- Under the `docs` folder:
  - `FAQ.md`: 
    - Added questions related to the roster lookup functionality.
    - Reorganized some question, in a way it makes more sense for the reader.
  - `TechnicalArchitecture.md`: Updated the folder structure to include the `data` and `.vscode` folders.

- Under the root folder:
  - `.gitignore`: Removed the `.vscode/` entry because `settings.json` is now part of the project configuration.
  - `cspell.json`: Added the Code Spell Checker (ID: `streetsidesoftware.code-spell-checker`) configuration file to exclude `panini_fwc2026_roster.csv` from spell checking because it contains many non-ASCII characters.
  - `README.md`:
    - Added the *Roster Lookup Service* section describing the new lookup functionality in the Google Spreadsheet template.
    - Added the *Google Spreadsheet Tables* section documenting the spreadsheet tables used by the template.
    - Updated the *Named functions* section to include the `NORMALIZE` named function.
  - `TODO.md`: Added the Panini sticker roster repository and roster lookup feature, and marked both tasks as completed.

#### Fixed

- In `Reports` tab:
  - The calculation of repeats and it percentage didn't take into account the decision `INCLUDE CC` value. Now the formula considers the value selected by the user.
  - Changed the label from `Repeated` to `Repeats`.

### Apps Script

No changes were made to the Apps Script source code. This release only includes updates to the GitHub project (documentation, configuration files, and static data) plus changes in the Google Spreadsheet template. Therefore, the Apps Script release version remains unchanged.

---

## [1.1.2] 2026-07-23

### Overview
The Quick Entry service now supports searching by sticker number in addition to country/team search using the search box. Refactored the Import service by splitting responsibilities into dedicated `ImportView.html` and `ImportHelp.html` files. Simplified `MobileImportView.html` by reusing helper functions from `ImportHelpers.html`. Refactored all `*View.html` and `MobileHome.html` files to use Immediately Invoked Function Expressions (IIFE), exposing only the required public functions through the global scope (`window.*`). Using font-size variables defined in `CommonStyles.html` and `MobileStyles.html` across all `*Styles.html` files. Import service now clears any previous validation output while doing the next validation.

### Google Spreadsheet template
- Added sheet `About` to provide information about the template versioning and version documentation.

### Apps Script

#### Added
- Under `images` folder:
  - `aboutTabView.jpg`: Show the version information the Google Spreadsheet template in the `About` tab.
  - `aboutView.jpg`: Show the about screen in the Apps Script project.
- Under `src/html` folder:
  - `AboutView.html`: About view to apps script metadata information including the version.
  - `AboutDialog.html`: Dialog for the About page, to follow the same pattern.
  - `ImportView.html`: Extracted the view portion from `ImportDialog.html`. This view remains specific to the desktop version.
  - `ImportHelp.html`: Extracted the format help modal from `ImportDialog.html`, including the related JavaScript functions: `openHelpModal()` and `closeHelpModal()`.
  - `MobileAboutView.html`: Wrapper for about screen for mobile services.

#### Changes

- Under the `doc` folder:
  - `FAQ.md`:
    - Added the question: "Can I search by sticker number in the Quick Entry service?".
    - Added the question: "How can I identify the version of the template or the Apps Script project?".
    - Added the question: "Why are the template version and the Apps Script version different?".
    - Added the question: "I don't see the About item in **Manage Panini** custom menu?".
  - `TechnicalArchitecture.md`:
    - Updated sections *4. UI Layer Engineering Rules* and *5. System Architecture* to document the Import service refactor with the new files: `ImportView.html` and `ImportHelp.html`. Documented the use of Immediately Invoked Function Expressions (IIFE) to expose only required functions.
    - Applied minor wording improvements in section *7. Continuous Integration (CI) Deployment Blueprint*.
- Under `images` folder:
  - `mobileWebAppLinkDeployView.jpg` renamed to `webAppLinkInstructionsView.jpg`. Updated the image, now the `Close` button was removed.
  - `mobileWebAppLinkURLView.jpg` renamed to `webAppLinkDeployedView.jpg`. Updated the image, now the `Close` button was removed.
  - `managePaniniMenuView.jpg`: Update the screenshot to show `About` menu item.

- Under `src/html` folder:
  - `CommonStyles.html`: 
    - Added the style for the About screen.
    - Added font-size variables based on T-shirt size.
    - Added `dialog-actions` to have a common styles for actions buttons.
  - `ExportHelpers.html`:
    - Removed the `setMessage()` function because it was not used internally and was no longer used by `ExportView.html`.
    - Removed the `applyModeUI()` method because it is no longer used (dead code).
  - `ExportView.html`:
    - Moved functions exposed through the global scope (`window.*`) to the top of the controller section.
    - Refactored the `setMessage()` function by defining the `messageEl` DOM reference explicitly.
    - Added the `exportCloseButtonEl` DOM reference to control the visibility of the Close button. The button is displayed only in the desktop dialog version.
  - `ImportExportStyles.html`: 
    - Now using the font-size variables defined in `CommonStyles.html`. 
  - `ImportDialog.html`:
    - Moved the view markup and JavaScript controller logic to `ImportView.html`, following the same structure used by other shared services.
    - Moved the help format modal and related javascript functions into the dedicated `ImportHelp.html` file to improve maintainability.
    - Added `defaultMode` configuration injection so the import mode is controlled through JavaScript instead of being embedded in the view.
  - `ImportView.html`:
    - Standardized DOM variable names by adding the `El` suffix.
    - Added IIFE encapsulation and exposed only public functions required by HTML bindings through `window.*`.
    - Moved on top the public functions (`window.*`).
  - `MobileExportView.html`:
    - Added IIFE encapsulation and exposed only the public functions required by `MobileHome.html` through `window.*`.
  - `MobileHome.html`:
    - Added IIFE encapsulation and exposed only the functions required by HTML bindings through `window.*`.
    - Added `About` menu item, injected `AboutView.html`.
  - `MobileImportStyles.html`: 
    - Now the property: `#view-import .format-hint` used the font-size defined in the `MobileStyles.html`.
  - `MobileImportView.html`:
    - Removed the Cancel button because it does not apply to the mobile design approach.
    - Standardize DOM variables adding the `El` suffix.
    - Added a wrapper `setMessage()` for `Import.setMessage`.
    - Moved public functions (`window.*`) on top.
  - `MobileQuickEntryStyles.html`: Now using font-size variables defined in `MobileStyles.html`.
  - `MobileQuickEntryView.html`:
    - Updated the placeholder message to indicate that the search box also supports sticker number searches.
    - Added IIFE encapsulation and exposed only the public functions required by `MobileHome.html` through `window.*`.
  - `MobileStyles.html`: 
    - Added mobile specific style for about screen for mobile service.
    - Added new font-size variables (`--text-4xs`, `--text-3xs`) to ensure all style definitions the general font-size variables.
  - `MobileLinkDialog.html`:
    - Renamed to: `WebAppLinkDialog.html` since `Mobile` prefix is used for mobile service, this is a desktop dialog.
    - Removed the `Close` button at the button since the x on top-right is enough and there is no other action at the bottom to do.
  - `QuickEntryDialog.html`:
    - Renamed: `initializeQuickEntry()` to `initializeQuickEntryView()` so all `initialize*` functions follow the same naming convention, having the `View` suffix.
  - `QuickEntryHelpers.html`:
    - Updated the search logic to support both country/team searches and numeric sticker searches.
    - Replaced the state property `teamSearchText` with `searchText`.
    - Replaced `_matchesTeamSearch()` with `_applySearch()`, which now handles both country/team and sticker number search logic.
    - Added `_isNumericSearch()` to identify numeric search input.
    - Updated `getVisibleCountries()` to adjust the filtering and search pipeline.
    - Renamed `_filterCountryStickers` to `_filterByStickerStatus` because the function only filters by sticker status and does not perform searching.
    - Removed `_matchesTeamSearch()` because search handling is now centralized in `_applySearch()`.
    - Added `_applySearch()` to process both numeric and team/country search cases.
  - `QuickEntryRender.html`:
    - Corrected the source file name reference in the file header.
  - `QuickEntryStyles.html`:
    - Adjusted the width of the `filters` property to accommodate the longer search box placeholder text.
    - Now using font-size variable defined in `CommonStyles.html`.
  - `QuickEntryView.html`:
    - Updated the search placeholder text to indicate sticker number search support.
    - Renamed the state property `teamSearchText` to `searchText` because the search now supports sticker numbers.
    - Updated `handleStatusFilterChange()` to clear the informational message.
    - Updated `handleFiltersChange()` to clear the informational message.
    - Renamed `showMessage()` to `setMessage()` for consistency with the other services.
    - Added documentation comments for the HTML code.
    - Standardized DOM variable names by adding the `El` suffix.
    - Organize the functions to follow the step-down rule organization.
    - Added IIFE encapsulation and exposed only public functions required by HTML bindings through `window.*`.

- Under `src` folder:
  - `Code.gs`: 
    - Added the logic for the About screen.
    - Updated the window dimensions of Mobile Web App link window to adjust them depending on the text shown.

- Under `test` folder:
  - `ExportHelpers.unit.test.js`:
    - Removed the test suite for `setMessage()` because the function was removed from the source code.
  - `QuickEntryHelpers.unit.test.js`:
    - Updated tests to reflect renamed functions.
    - Added numeric search coverage to the `getVisibleCountries()` test suite.

- Under the root folder:
  - `CHANGELOG.md`: Changed the reporting format. Now there are two dedicated sections: Google Spreadsheet template and Apps Script, so it is clear the changes on specific artifacts and they are treated as two products. This new structure was propagated to the entire document (previous changelog entries).
  - `README.md`:
    - Added a new section: *Product version information* to indicate how the version information is provided for Google Spreadsheet template and for Apps Script project.
  - `TODO.md`: 
    - Check: Search by sticker number
    - Check: Show product version

#### Fix
- Removed Close/Cancel buttons from the mobile Import and Export implementations because these actions do not apply to the mobile navigation model.
- In import service while doing a validation the previous output was not cleared, now after successive validation when the validation starts it clears the previous validation output, once the validation is finished, the generates the new validation output.

---

## [1.1.1] 2026-07-19

### Overview

The Google Sheets Panini template now supports Coca-Cola stickers. The template and backend were updated to handle Coca-Cola stickers using the country code `CC`. For `*Helpers.html` and `*Render.html` files, an underscore prefix was added to private functions. The corresponding tests were updated to reflect the renamed functions. Fixed an issue in the Quick Entry service where the mobile layout rendered stickers in a single column instead of the configured five-column layout.

### Google Spreadsheet template

- `Sticker` tab:
  - Renamed the Numbers columns to Stickers.
  - Added a new row at the end to include Coca-Cola stickers.
  - The Country column now uses the `COUNTRIES` named range.
  - The calculation of the **Done** column now uses the `COUNTS` named range.
  - The calculation of the **%** column now uses the `DONE` and `P_COMPLETION` named ranges to calculate the correct completion percentage based on the maximum number of stickers for each country.
  - The calculation of the **Miss** column now considers `MAX_STICKERS` for a more precise calculation based on the maximum number of stickers for each country.
  - The calculation of the **Rep** column now uses the `COUNTS` named range.
  - Adjusted conditional formatting for **Done**, **%**, **Miss**, and **Rep** to include the Coca-Cola row.
  - Adjusted conditional formatting for count values to prevent expansion to additional rows in the future and adjusted the range to include Coca-Cola sticker counts.
  - Added the `MISSING` named range for the **Miss** column.
  - Added the `P_COMPLETION` named range for the completion percentage of each country. It is now calculated considering the maximum possible stickers for each country.
  - Adjusted the named ranges `TOTAL_*_STICKERS` to point to the correct cells after adding the Coca-Cola row. Adjusted the formulas to use the new named ranges.
  - Added the `REPEATS` named range for the **Rep** column.
  - All calculations in the `Stickers` tab now use the defined named ranges.

- `Reports` tab:
  - Added a drop-down under the metrics section to allow users to decide whether to include Coca-Cola stickers, since not all users collect them. Most calculated fields in the metrics section now depend on this selection.
  - Adjusted conditional formatting.
  - Adjusted the chart range to include Coca-Cola stickers.
  - Adjusted the pivot table range to include Coca-Cola stickers.
  - Adjusted the formula for missing stickers to use the `COUNTRIES` and `FLAG_ICONS` named ranges.
  - Team Completed now uses `P_COMPLETION` to correctly calculate completed teams considering that not all teams have `20` stickers.

- `Trade` tab:
  - Adjusted the formulas so both input columns derive from a common input range to avoid inconsistencies caused by different row counts. Both inputs now derive from the `input` let variable.
  - Adjusted the formula for TOTAL in the **INPUT** section to calculate correctly using the `CLEAN_STICKER_LINE` named function.

- Named functions:
  - `CLEAN_STICKER_LINE`: Extended the function to remove `A-B(X)` ranges as well.

- `Conf` tab (hidden):
  - Added a new row with Coca-Cola information.
  - Adjusted the named range to include Coca-Cola.
  - Adjusted the formula that generates flags to ensure the Coca-Cola flag appears as a square.
  - The `GROUPS` named range now points to the `Conf` tab instead of the `Sticker` tab.
  - Added the **Max Stickers** column, representing the maximum number of possible stickers for each country.
  - Added the `MAX_STICKERS` named range for the **Max Stickers** column.

### Apps Script

#### Added

- Under the `examples` folder: Added more specific sample files for the Export all stickers and Export shared stickers services:
  - `panini-stickers-all.txt`: Sample output of the Export all stickers service.
  - `panini-stickers-all_flagTrue_compactTrue.txt`: Sample output of the Export all stickers service with the **Flag** and **Compact (using ranges)** checkboxes activated.
  - `panini-stickers-shared.txt`: Sample output of the Export shared stickers service.
  - `panini-stickers-shared_flagTrue_compactTrue.txt`: Sample output of the Export shared stickers service with the **Flag** and **Compact (using ranges)** checkboxes activated.

#### Changes

- Under the `docs` folder:
  - `ImportServiceRequirements.md`: 
    - Added requirements for Coca-Cola stickers.
    - Adjusted the syntax definition of the Format 1, and 2
  - `ExportServiceRequirements.md`: Updated references from non-`FWC` notation to country teams.
  - `QuickEntryServiceMockDesign.md`: Added specific requirements for Coca-Cola stickers and updated references from non-`FWC` notation to country teams.
  - `QuickEntryServiceRequirements.md`: Added specific requirements for Coca-Cola stickers, updated references from non-`FWC` notation to country teams, and removed outdated sections at the end.

- Under the `examples` folder: Removed previous sample files and replaced them with more specific sample files.

- Under the `images` folder:
  - `reportsView.jpg`: Updated to show Coca-Cola data and the drop-down allowing users to select whether to include `CC` stickers in statistics.
  - `stickerView.jpg`: Updated to include the Coca-Cola row.
  - `importFormatHelp.jpg`: Updated the view to fix the syntax of Format 2.
  - `mobileWebAppLinkDeployView.jpg`: Updated the view to include the instruction or Description.

- Under the `src` folder:
  - `Commons.gs`:
    - Defined file-level constant variables and corresponding static getters. Since GAS V8 does not support static class fields, this provides a consistent workaround for shared constants.
    - Changes in `StickerSheetRepository`:
      - Added the following static getters: `getCountryBounds()`, `getStickerMin()`, `getStickerMax()`, and `getMaxRows()`.
      - `getCountryBounds()`: Handles country sticker ranges, including the special cases for `FWC` and Coca-Cola.
      - Refactored `_updateCountryCounts()` to use `getCountryBounds()` for range validation.
      - `_buildCountryRecord()` now handles optional fields such as group and flag.
      - Refactored constant attributes into static getters and updated the rest of the class accordingly.

  - `QuickEntryService.gs`:
    - The constructor now accepts an input argument `ss` used for mobile services.
    - Adjusted the class to support special countries such as `FWC` and Coca-Cola.
    - `_getStickerIconLabel()`: Now uses `StickerSheetRepository.getCountryBounds()` to determine whether the country is a team and assign the special labels `TEAM` or `CREST`.
    - `_getVisibleStickerNumbers()`: Now uses `StickerSheetRepository.getCountryBounds()` to determine the visible sticker range for special countries such as `FWC` and Coca-Cola.

  - `ImportService.gs`:
    - Adjusted the classes to support Coca-Cola stickers.
    - `LineNormalize` class:
      - Added static attributes `COUNTRY_CODE_PATTERN` and `FORMAT2_COUNTRY_REGEX` to centralize country validation patterns. These patterns now support Coca-Cola stickers.
      - `_extractCountryCode()`: Adjusted to support Coca-Cola stickers.
      - `_normalizeToken()`: Adjusted to support Coca-Cola stickers.
      - `_getAlbumPositions()`: Now validates ranges using `StickerSheetRepository.getCountryBounds()`.
    - `ImportSticker` class:
      - `_validateCountryCode()`: Now validates Coca-Cola country codes.
      - `_validateStickerNumber()`: Now uses static methods from `StickerSheetRepository` to validate sticker numbers and generate customized warnings showing the correct valid range, including non-team countries.
      - `_mapTokenToCount()`: Improved documentation and refactored to use static methods from `StickerSheetRepository`.
    - `ImportService` class:
      - `_writeCountries()`: Now uses country-specific bounds from `StickerSheetRepository.getCountryBounds()`.

  - `ExportService.gs`:
    - Updated to use the new static getters from `StickerSheetRepository`.
    - `_normalizeCountsRow()`: Now uses static methods from `StickerSheetRepository`.
    - `_isExportableSticker()`: Now uses a static method from `StickerSheetRepository`.

- Under the `src/html` folder:
  - `ImportHelpers.html`:
    - Added the `@public` tag to exported namespace functions.
    - Renamed `getPayloadFromState()` to `_getPayloadFromState()` since it is private and moved it after the exported functions.
    - Renamed `renderPreviewData()` to `_renderPreviewData()` since it is private and moved it after the exported functions.

  - `ImportDialog.html`:
    - Ensures both `preview()` and `importData()` clear validation warnings by calling `renderWarnings([])`.
    - Adjusted the notation of Format 2 in help dialog. Adjusted the width of the dialog.

  - `ExportHelpers.html`:
    - Renamed `getUIState()` to `_getUIState()` since it is private and moved it after the exported functions.

  - `QuickEntryHelpers.html`:
    - Added `applyLayout()` to the namespace exports and tagged it as `@public`. This fixes the mobile Quick Entry layout, which previously rendered stickers in a single column.
    - Added an underscore prefix to the following private functions and moved them after public functions: `matchesTeamSearch()`, `matchesGroupFilter()`, `applyPendingCountryUpdates()`, `filterCountryStickers()`, `buildCountrySummary()`, `buildPendingKey()`, `renderPreview()`, `clearPreview()`, `setBusy()`.
    - Removed the unused `buildExportFileName()` method.

  - `QuickEntryRender.html`:
    - Added an underscore prefix to all private functions.

- Under the `test` folder:
  - `Commons.unit.test.js`:
    - Defined the `MAX_ROWS` constant to avoid hardcoded values across multiple tests.

  - `ImportService.unit.test.js`:
    - Under the `ImportService` test suite:
      - Updated the `out-of-bound sticker zeroing` suite to handle Coca-Cola stickers.
      - Updated the `parse() success paths` suite to handle Coca-Cola stickers.
      - Added a `parse error handling` suite.
      - Updated the `integration scenarios` suite to call `_getPayloadFromState()`.
    - Under the `ImportSticker` test suite:
      - Added more test cases to the `parse() error/warning cases` suite.
    - Under the `LineNormalizer` suites:
      - Updated the `normalize` variable to include Coca-Cola.
      - Extended existing tests with Coca-Cola cases.
      - Added new Coca-Cola-specific test cases.

  - `ImportHelpers.unit.test.js`: Added additional tests to increase coverage.

  - `ExportService.unit.test.js`:
    - Renamed the `getUIState()` suite to `_getUIState()` and updated the function calls accordingly.

  - `ExportHelpers.unit.test.js`: Added additional tests to increase coverage.

  - `QuickEntryService.unit.test.js`:
    - Added Coca-Cola test cases for `_getStickerIconLabel()`.
    - Added Coca-Cola test cases for `_getVisibleStickerNumbers()`.

  - `QuickEntryHelpers.html.unit.test.js`:
    - Updated private function calls to use the underscore prefix.
    - Added additional tests to increase coverage.

  - `QuickEntryRender.html.unit.test.js`:
    - Updated private function calls to use the underscore prefix.
    - Added a test suite for `buildCountrySection()`, the only public function in the file.
    - Added additional tests to increase coverage.

- Under the `test/utils` folder:
  - `testKernel.js`:
    - Updated the test data and mocks to support Coca-Cola.
    - `TEST_DATA`: Added the Coca-Cola country.
    - `MockStickerSheetRepository`:
      - Updated the constructor to mock the static getters.
      - `COUNTRY_BOUNDS`: Added the bounds and corresponding getter.
    - `initializeSpreadsheetAppMock()`: Updated to include the Coca-Cola country and defined the `STICKER_COLS` constant.

- Under the root folder:
  - `package.json`:
    - Fixed the `test:file` task so it now works correctly.
    - Fixed the `test:coverage` script task to ensure folders that should not be part of coverage analysis are excluded.

  - `README.md`:
    - Updated the document to include Coca-Cola stickers.
    - Updated the **Named range** section with the new required named ranges.
    - Updated the **Testing** section with information about coverage.
    - Updated the **Files** section to include new `.github` folder files and folders created in previous releases.
    - In `Import Format` adjusted the syntax definition of the Format 1 and 2.

  - `TODO.md`:
    - Marked "Include Coca-Cola stickers" as completed.

#### Fix

- Fixed an issue in the Quick Entry mobile service where stickers were rendered in a single column. The `applyLayout()` function was added to the `QuickEntry` namespace in `QuickEntryHelpers.html`, restoring the configured five-column mobile layout.

---

## [1.1.0] 2026-07-12

### Overview
Mayor version. Implemented mobile services, including all services available in the desktop version: import/export and quick entry. Fixed an issue in Quick Entry where, after clicking Update, the card changes were not persisted. Fixed an issue in Quick Entry where reducing a count to zero was saving a zero value instead of an empty cell in `Stickers` tab.

### Google Spreadsheet template

No significant changes.

### Apps Script

#### Added

- Under the `.github` folder:
  - `actions` folder added

- Under the `.github/action` folder:
  - `setup-project` folder added

- Under the `.github/actions/setup-project`:
  - `action.yml`: It includes the common setup for both `deploy.yml` and `validate.yml` workflows files.

- Under the `.github/workflows` folder:
  - `validate.yml`: Separated the validation process from `deploy.yml` into a validation workflow.

- Under the `image` folder:
  - `mobileQuickentryView.jpg`: Mobile view of the Quick Entry service.
  - `mobileWepAppLinkDeployView.jpg`: Dialog informing the user how to deploy a Web app so it can be run from a mobile device.
  - `mobileWebAppLinkURLView.jpg`: Dialog informing the user after the Web app has been deployed, providing the associated URL to access it from a mobile device.
  - `manageDeploymentsView.jpg`: Google Apps Script window for managing deployments.
  - `newDeploymentView.jpg`: Google Apps Script window to create a new deployment.

- Under the `src/html` folder:
  - `ExportView.html`: 
    - View for export services (both desktop and mobile). Extracted the view portion and functions from `ExportDialog.html`.
    - Added `Export` namespace to called functions from `ExportHelpers.html` file.
  - `QuickEntryView.html`: 
    - View for the quick sticker entry service, now used by both desktop and mobile versions. Moved the view portion and functions from `QuickEntryDialog.html`.
    - Added `QuickEntry` namespace to called functions from `QuickEntryHelpers.html` file.
    - Added `QuickEntryRender` namespace to called functions from `QuickEntryHelpers.html` file.

    - Added a shared `getLayout()` helper to retrieve the active layout configuration.
    - Updated initialization to apply the configured layout before rendering the sticker grid.
    - Replaced hardcoded layout assumptions with the shared layout configuration.
    - Updated rendering logic to use the configured number of stickers per row for both desktop and mobile.

  - `MobileHome.html`: Mobile entry point including the navigation drawer, view switching system, and injected views through includes.
  - `MobileImportView.html`: Simplified view for the mobile import service.

  - `MobileExportView.html`: View for both export services. Acts as a wrapper.
  - `MobileStyles.html`: Mobile-specific CSS styles common to all mobile services.
  - `MobileQuickEntryView.html`: Specific view for the mobile Quick Entry service. It acts as a wrapper.
    - Added mobile-specific Quick Entry layout configuration using `window.quickEntryLayout`.
    - Configured the mobile album view to display 5 stickers per row.
    - Simplified layout initialization by defining the mobile layout in the mobile entry point instead of relying on runtime device detection.
  - `MobileLinkDialog.html`: New service providing user instructions on how to deploy the GAS project as a Web app.
  - `MobileImportStyles.html`: CSS-specific styles for the mobile import service.
  - `MobileExportStyles.html`: CSS-specific styles for the mobile export service.
  - `MobileQuickEntryStyles.html`: CSS-specific styles for the mobile Quick Entry service. Changes compared with the desktop styles:
    - Removed the hardcoded `--stickers-per-row` CSS variable so the layout is controlled dynamically.
    - Updated last-row and compact-grid width calculations to use the shared `--stickers-per-row` variable.
    - Increased sticker number/count font size for improved readability.
    - Increased country summary font size and spacing.
    - Increased spacing between increment and decrement buttons.
    - Increased button font size for easier touch interaction.
    - Reduced sticker card padding and internal spacing to better utilize the available screen width.
    - Increased the pending-change indicator size.
    - Increased legend font size while preserving the responsive layout.
    - Added documentation describing the shared sticker grid sizing behavior.

#### Changes

- Under the `.github/workflows` folder:
  - `deploy.yml`: 
    - Updated to include deployment of the Web app to enable mobile services.
    - Included `paths`, to restrict the CI just for source code changes.
    - Improved inline documentation of the file.

- Under the `doc` folder:
  - `FAQ.md`: 
    - Updated the answer to the question: "Can I import stickers from a mobile phone?" since mobile support is now provided in this release.
    - Added additional questions related possible issues the user may encounter when copy the Google Sheet template or deploying the Web app for using mobile services.

  - `TechnicalArchitecture.md`:
    - Included the mobile architecture as part of the technical architecture documentation.
    - Provided more details about the `clasp.zsh` script, including the new `deploy` action required to deploy the mobile solution.
    - Indicated when to use `deploy:test` and `deploy:all` script tasks.
    - Detailed CI pipeline with the new setup using composition via `action.yml` and having two workflows: `deploy.yml` and `validate.yml`.
    
  - `GoogleAccessStepByStep.md`: Spelling and minor corrections.

- Under the `image` folder: Adjusted some images to remove borders and updated the `inputFormatHelp.jpg` view.

- Under the `scripts` folder:
  - `build.js`: 
    - Adjusted some function definitions to fix `lint` errors after changing the `lint` configuration.
    - Added the logic to remove namespace declaration and namespace return.
  - `fix-jsdoc.js`: Adjusted some function definitions to fix `lint` errors after changing the `lint` configuration.
  - `clasp.zsh`:
    - Added a new action, `deploy`, to automate Web app deployment updates by creating a new version and using the same description as the existing deployment. It uses the same architecture as the `push`/`pull` actions. If `scriptId` is not present, it takes the ID from the TEST gsheet (the default value from `.clasp.json.template`). If `deploymentId` is not present, it takes the deployment ID from the TEST gsheet file, hardcoded in the script file.
    - Added help input options, allowing the command `zsh scripts/clasp.zsh -h` to print the help information only. It accepts other variations such as `--help`, `-help`, and `help`.

- Under the `src` folder:
  - `appsscript.json`: Removed the authorization scope `"https://www.googleapis.com/auth/spreadsheets.currentonly"` because the `doGet` service used by the mobile solution cannot work with the `currentonly` scope. It now uses `"https://www.googleapis.com/auth/spreadsheets"` instead.
  - `Code.gs`: Added the mobile-specific entry point and services related to mobile functionality and `doGet` function.
  - `Commons.gs`:
    - Added an optional input parameter to the `StickerSheetRepository` constructor so it can be used by mobile services with the provided input argument.
    - Adjusted the `_updateCountryCounts` method to properly update zero counts as empty cells in applicable cases, while preserving zero values for edge cases (non-valid stickers) when the count is zero.

- Under the `src/html` folder:
  - Removed `Dialog` from file names except for files that are specifically dialog-related. `*Helpers.html` and `*Renders.html` files are no longer specific to dialogs, as they are also used by the mobile solution. Removed `Dialog` from style file names since mobile-specific styles are now identified with the `Mobile` prefix, making it unnecessary to keep `Dialog` in those names.

  - `CommonDialogStyles.html`:
    - Renamed to `CommonStyles.html`. It is now common to all desktop solutions.
    - As part of the overall style review, removed duplicated definitions and moved additional common definitions into this file.

  - `ImportDialog.html`: 
    - Removed `renderWarnings([])` calls from `previewData()` and `importData()` since warnings are now controlled through the UI state (CSS).
    - Added `Import` namespace to called functions from `ImportHelpers.html` file.

  - `ImportDialogHelpers.html`:
    - Renamed to `ImportHelpers.html`.
    - Adjusted the `clearPreview` method so it also clears the output result.
    - Added `Import` namespace to avoid browser scope pollution.

  - `ExportDialog`:
    - Moved the view and JavaScript portion of the file to `ExportView.html` (shared by mobile and desktop).
  - `ExportDialogHelpers.html`: 
    - Renamed to `ExportHelpers.html`.
    - Added `Export` namespace to avoid browser scope pollution.
  - `ImportExportDialogStyles.html`: Renamed to `ImportExportStyles.html`.

  - `QuickEntryDialog.html`:
    - Modified the `applyChanges` method to correctly apply pending changes to the UI view. Reloading the data is no longer required; only the pending sticker status and count need to be updated.
    - Added desktop-specific Quick Entry layout configuration using `window.quickEntryLayout`.
    - Configured the desktop album view to display 8 stickers per row.
    - Moved the view and JavaScript portion to `QuickEntryView.html` since this portion is shared by both desktop and mobile versions.

  - `QuickEntryDialogHelpers.html`:
    - Renamed to `QuickEntryHelpers.html`.
    - Added the `commitPendingUpdates` method, responsible for updating pending changes in the UI view.
    - Removed the declaration `let stickersPerRow = 8` to avoid variable conflicts with mobile services.
    - Refactored rendering helpers to receive the layout configuration explicitly instead of relying on global state.
    - Updated album grid rendering to use `layout.stickersPerRow`.
    - Removed remaining dependencies on the previous global sticker layout implementation.
    - Added `QuickEntry` namespace to avoid browser scope pollution.

  - `QuickEntryDialogRender.html`: 
    - Renamed to `QuickEntryRender.html`.
    - Added `QuickEntryRender` namespace to avoid browser scope pollution.

  - `QuickEntryDialogStyes.html`:
    - Renamed to `QuickEntryStyles.html`.
    - Consolidated some styles and removed duplicated definitions.
    - Updated the documentation for sticker grid sizing to reflect the current CSS Grid/Flexbox implementation.
    - Kept desktop styling unchanged while documenting the shared layout behavior.
    - The `--stickers-per-row` variable is no longer configured through the CSS file. Instead, it is determined by JavaScript code.

- Under the `test` folder:
  - `Commons.unit.test.js`:
    - Added a test for the `StickerSheetRepository` constructor using the input argument.
    - Added tests to verify the issue where, in Quick Sticker Entry, changes were not reflected in the UI after clicking the Update button. The corresponding test initially failed, then the issue was fixed and the test passed afterward.
    - Added additional edge test cases for the `updateStickerCounts` method, which is responsible for this update.

  - `ExportService.unit.test.js`: Fixed `lint` errors related to the `'space-before-function-paren'` rule.
  - `QuickEntryDialogHelpers.unit.test.js`: 
    - Renamed to `QuickEntryHelpers.unit.test.js`.
    - Fixed `lint` errors related to the `'space-before-function-paren'` rule.
  - `QuickEntryDialogRender.unit.test.js`:
    - Renamed to `QuickEntryRender.unit.test.js`.
    - Fixed `lint` errors related to the `'space-before-function-paren'` rule.
    - Added tests for the `commitPendingUpdates` method, responsible for updating pending changes in the UI view.
  - `QuickEntryService.unit.test.js`: Added unit tests for `applyChanges` to help identify the issue where the view did not preserve changes after clicking the Update button.

- Under the `test/utils` folder:
  - `testKernel.js`:
    - In the `initializeSpreadsheetAppMock` function, the `spreadsheetMock` object is no longer recreated for every test. Instead, the same instance is reused.
    - Updated the `updateStickerCounts` mock in the `MockStickerSheetRepository` constructor with more complex behavior.

- Under the `root` folder:
  - `eslintrc.js`: Configured the `'space-before-function-paren'` rule.

  - `package.json`:
    - Added the `clasp:deploy` script task to simplify Web app deployment through `clasp`.
    - Adjusted the `deploy:test` script task to only push into GAS cloud, but not deploying the Web app.
    - Added the `deploy:all` script task to do `deploy:test` and `clasp:deploy`.
    - Removed the dry script task variant since it does not work as originally defined. Documented in `TechnicalArchitecture.md` how to call such script tasks activating dry-run and changing the verbose output level.
    - Adjusted clasp script tasks to avoid including environment variables, allowing them to be provided directly from the command line.

  - `README.md`:
    - Updated the file list to include specific mobile files and updated file names where `Dialog` was removed.
    - Added a new section, **Mobile services**, covering the mobile services.
    - Sorted file sections alphabetically.

  - `TODO.md`: 
    - Added Coca-Cola stickers to the roadmap.
    - Added refactor `MobileImportView.html` to use `ImportHelpers.html` functions.

#### Fix

- Under Quick sticker entry service, when a sticker count was positive and then reduced to zero before updating, the sticker was saved with a zero value instead of an empty cell value. This issue was fixed.

- Under Quick Sticker Entry, when changing a sticker count, the change was correctly propagated to the `Stickers` tab, but after clicking the Update button, the sticker count reverted to the previous value. The count is now correctly preserved after updating.

---

## [1.0.6] 2026-06-21

### Overview
Implemented a mobile services, including all services the desktop version provides: import/export and quick entry. Fixed the issue in Quick Entry that after click on Update, the card change didn't persist. Fixed in Quick entry service when the count is reduced to zero to save empty cell instead of zero value.

### Google Spreadsheet template

No significant changes.

### Apps Script

#### Added

- Under the `image` folder:
  - `mobileQuickentryView.jpg`: Mobile view of the quick entry service.
  - `mobileWepAppLinkDeployView.jpg`: Dialog to inform the user how to deploy a Web app so it can be ran from a mobile device.
  - `mobileWebAppLinkURLView.jpg`: Dialog to inform the user after Web app being deployed with the associated URL to use the URL from a mobile device.
  - `manageDeploymentsView.jpg`: Google Appscript window for managing the deployments.

- Under the `src/html` folder:
  - `ExportView.html`: View for export services (both desktop and mobile). Extracted the view portion and functions from `ExportDialog.html`.
  - `QuickEntryView.html`: View for quick sticker entry service, now being used for desktop and mobile versions. Moved the view portion and functions from `QuickEntryDialog.html`.
    - Added a shared `getLayout()` helper to retrieve the active layout configuration.
    - Updated initialization to apply the configured layout before rendering the sticker grid.
    - Replaced hardcoded layout assumptions with the shared layout configuration.
    - Updated rendering logic to use the configured number of stickers per row for both desktop and mobile.

  - `MobileHome.html`: Mobile entry point which includes navigation drawer, view switching system, injected view via include.
  - `MobileImportView.html`: Simplified view for mobile import service.
  - `MobileExportView.html`: View for both export services. It acts as a wrapper.
  - `MobileStyles.html`: Mobile CCS specific styles, common to all mobile services.
  - `MobileQuickEntryView.html`: Specific view for mobile quick entry service. It is just a wrapper.
    - Added mobile-specific Quick Entry layout configuration using `window.quickEntryLayout`.
    - Configured the mobile album view to display 5 stickers per row.
    - Simplified layout initialization by defining the mobile layout in the mobile entry point instead of relying on runtime device detection.
  - `MobileLinkDialog.html`: New service to provide user's instructions on how to deploy as Web App the GAS project.
  - `MobileImportStyles.html`: CCS specific styles for mobile import service.
  - `MobileExportStyles.html`: CCS specific styles for mobile export service.
  - `MobileQuickEntryStyles.html`: CCS specific styles for mobile Quick entry service. Changes with respect the desktop styles:
    - Removed the hardcoded `--stickers-per-row` CSS variable so the layout is controlled dynamically.
    - Updated last-row and compact-grid width calculations to use the shared `--stickers-per-row` variable.
    - Increased sticker number/count font size for improved readability.
    - Increased country summary font size and spacing.
    - Increased spacing between increment and decrement buttons.
    - Increased button font size for easier touch interaction.
    - Reduced sticker card padding and internal spacing to better utilize the available screen width.
    - Increased the pending-change indicator size.
    - Increased legend font size while preserving the responsive layout.
    - Added documentation describing the shared sticker grid sizing behavior.

#### Changes

- Under the `.github/workflows` folder:
  - `deploy.yml`: Updated to include the deploy of the Web app to enable mobile services.

- Under the `doc` folder:
  - `FAQ.md`: Update the answer of the question: Can I import stickers from a mobile phone?, since now from this release a mobile support is provided.
  - `TechnicalArchitecture.md`:
    - Included the mobile architecture as part of the technical architecture documentation.
    - Provide more details about `clasp.zsh` script. Including the new action: `deploy` required to deploy the mobile solution.

- Under the `image` folder: Adjusted some of the images to remove the borders and updated `inputFormatHelp.jpg` view.

- Under the `scripts` folder:
  - `build.js`: Adjusted some functions definition to fix the `lint` errors after changing `lint` configuration.
  - `fix-jsdoc.js`: Adjusted some functions definition to fix the `lint` errors after changing `lint` configuration.
  - `clasp.zsh`: 
    - Added a new action `deploy` to automate the Web App deployment update, creating a new version and using the same description as the existing deployment. It uses the same architecture as `push/pull` actions. If the scriptId is not present it takes the id from TEST gsheet (default value from `.clasp.json.template`) and if `deploymentId` is not present it takes the deployment id from the TEST gsheet file, hardcoded in the script file.
    - Added the help input options, so you can call `zsh scripts/clasp.zsh -h` to print out the help. It accepts other variations such as `--help|-help|help`

- Under the `src` folder:
  - `appsscript.json` removed the authorization scope: `"https://www.googleapis.com/auth/spreadsheets.currentonly"` since `doGet` service used for mobile solution, can't work with `currentonly` scope. Instead using `"https://www.googleapis.com/auth/spreadsheets"`.
  - `Code.gs`: Added mobile specific entry point and services related to mobile service.
  - `Commons.gs`: 
    - Added an optional input parameter to `StickerSheetRepository` constructor so it can be used for mobile services with
  the input argument.
    - Adjusted the method `_updateCountryCounts` to properly update zero count as empty cell in the cases it applies and zero value for edge cases (non-valid stickers) when the count is zero.

- Under the `src/html` folder:
  - Removed `Dialog` in files names except for the dialog file. `*Helpers.html`, `*Renders.html` are not specific of the dialog any more, they are also used for the mobile solution. Removed from the style file names, since we have specific styles files for mobile service identified by `Mobile` prefix, there is no need to keep `Dialog` in the names for such cases.

  - `CommonDialogStyles.html`: 
    - Renamed to `CommonStyles.html`. It is common to all desktop solutions.
    - As part of the overall style review, removed duplicated, moved to this file additional common definitions.

  - `ImportDialog.html`: Removed `renderWarnings([])` calls in `previewData()` and in `importData()` since now it is controlled via UI state (CSS).
  - `ImportDialogHelpers.html`: 
    - Renamed to `ImportHelpers.html`.
    - Adjusted the method `clearPreview` so it clears also the output result.

  - `ExportDialog`: 
    - Moved the view and javascript portion of the file to `ExportView.html` (shared with mobile and desktop).
  - `ExportDialogHelpers.html`: Renamed as `ExportHelpers.html`.
  - `ImportExportDialogStyles.html`: Renamed to `ImportExportStyles.html`.
 
  - `QuickEntryDialog.html`: 
    - Modified the method `applyChanges` to correctly apply pending changes to the UI view, no need to reload the data again, just to change the status of the pending stickers and update the count.
    - Added desktop-specific Quick Entry layout configuration using `window.quickEntryLayout`.
    - Configured the desktop album view to display 8 stickers per row.
    - The view and javascript portion was moved to `QuickEntryView.html` since this portion is common to both desktop and mobile version.

  - `QuickEntryDialogHelpers.html`: 
    - Renamed as `QuickEntryHelpers.html`.
    - Added the method `commitPendingUpdates` in charge of updating the pending changes in the UI view.
    - Removed the declaration `let stickersPerRow = 8` to avoid any variable conflict resolution with mobile services.
    - Refactored rendering helpers to receive the layout configuration explicitly instead of relying on global state.
    - Updated album grid rendering to use `layout.stickersPerRow`.
    - Removed remaining dependencies on the previous global sticker layout implementation.
  - `QuickEntryDialogRenders.html`: Renamed as `QuickEntryRenders.html`.
  - `QuickEntryDialogStyes.html`: 
    - Renamed as `QuickEntryStyles.html`.
    - Consolidated some styles and remove duplicated
    - Updated the documentation for sticker grid sizing to reflect the current CSS Grid/Flexbox implementation.
    - Kept desktop styling unchanged while documenting the shared layout behavior.
    - Now the variable `--stickers-per-row` is not configured via CCS file. Instead it is determined by javascript code.

- Under the `test` folder:
  - `Commons.unit.test.js`: 
    - Added a test for constructor of `StickerSheetRepository` using the input argument.
    - Added the tests to verify the issue that in quick sticker entry after pushing Update button, the changes where not reflected in the UI. The corresponding test added failed, then fixed the issue and after that the tests didn't fail. Adding also additional edge test cases for `updateStickerCounts` method, that is in charge of this update.
  - `ExportService.unit.test.js`: Fix `lint` error related to `'space-before-function-paren'` rule.
  - `QuickEntryDialogHelper.unit.test.js`: Fix `lint` error related to `'space-before-function-paren'` rule.
  - `QuickEntryDialogRender.unit.test.js`: 
    - Fix `lint` error related to `'space-before-function-paren'` rule.
    - Added the tests for the method `commitPendingUpdates` in charge of updating the pending changes in the UI view.
  - `QuickEntryService.unit.test.js`: added tests for `applyChanges` unit tests, trying to identify the issue that after click on Update button the view doesn't keep the changes.

- Under the `test/utils` folder:
  - `testKernel.js`: 
    - In `initializeSpreadsheetAppMock` function the mock `spreadsheetMock` is not recreated on every test, instead it use the same instance.
    - Updated the mock for `updateStickerCounts` in `MockStickerSheetRepository` constructor with a more complex behavior.

- Under the `root` folder:
  - `eslintrc.js`: Configured the rule: `'space-before-function-paren'`.

  - `package.json`: 
    - Added the script task: `clasp:deploy` to simplify the clasp deploy of the Web App. 
    - Removed the dry script task variant, since it doesn't work in the way it is defined.
    - Adjusted clasp script task without including environment variables, so they can be called directly from the command line.

  - `README.md`: 
    - Updated the list of files to include specific mobile files and updated the file name where the `Dialog` was removed.
    - Added a new section **Mobile services** to cover mobile services.
    - Sorted file section in alphabetical order

#### Fix
- Under Quick sticker entry when sticker count is positive and then reduce the count to zero and update, then sticker is updated to zero value, instead it should be updated to empty cell value. It was fixed.
- Under Quick sticker entry the when changing the sticker count the change propagated to the `Stickers` tab, but after click on Update button, the sticker count restored the previous value. Now the count is correct after update.


## [1.0.6] 2026-06-21

### Overview
Minor corrections in the documentation (documents and source code). Added CI github integration. Updated the documentation of `TechnicalArchitecture.md` to include CI github integration.

### Google Spreadsheet template
 - `Reports` tab: 
    - Reported repeated stickers and unique repeated stickers in the same cell. Unique in parenthesis.
    - Now stickers bought the number of stickers and cost are reported in a single cell to make space for other variables.
    - Adjusted conditional formatting for repeated stickers, to check for repeated stickers greater than zero (red) and equal to zero (green).
    - Reordered the columns of the pivot table to mach the same order as in `Stickers` tab.

#### Added
- `.github` folder used to store workflow and deployment process
- `.github/workflows` where to store the `*.yml` files.
- `.github/workflows/deploy.yml`: CI deployment file using Github secrets.

#### Changes

- Under the `src` folder:
  - `ImportService.gs`: Removed unnecessary attributes, added `getRepo()` to lazy initialize `this.repo`. Removed `_getCountryMap()` the same can be achieved with `this.getRepo().getCountryMap()`.
  - `ExportService.gs`: Removed unnecessary attributes, added `getRepo()` to lazy initialize `this.repo`.

- Under the `test` folder:
  - `ImportService.unit.test.js`: Added suit tests for `getRepo`.
  - `ExportService.unit.test.js`: Added suit tests for `getRepo` and `getRows()`.

- under the `doc` folder:
  - `FAQ.md`: minor corrections in I’m currently using an old version of the tracker. How can I upgrade to the new one? question.
  - `ImportServiceRequirements`: Added the `.md` extension.
  - `TechnicalArchitecture.md`: 
    - Provided detail steps for Continuous Integration (CI) Deployment Blueprint.
    - Added a FAQ section.

- under root:
  - `.gitignore`: removed `package-lock.json`, since it is needed for CI github integration.
  - `package.json`: 
    - Adjusted the script task `deploy:prod` and renamed as `deploy:test`, since production deploy will be done via Github CI.
    - Added engine setting to specify node version `18.x`.
    - Added clasp push/pull dry-run option and adjusted the existing ones to include `DRY_RUN=false`.
  - `README.md`: 
    - Added **Named functions** section. Minor corrections in **Named ranges** section.
    - Moved the note about country code from the top to section **Track your collection**.
    - Minor corrections in Import/Export services and in **Input format** section.
  - `CHANGELOG.md`: Added the changes for version `1.0.6`.

  #### Fixed
- No fixes addressed.

---

## [1.0.5] 2026-06-16

### Overview
No new functionality was added. Optimized the backend code. Split responsibilities across source files in both the front-end and back-end. Refactored the `StickerSheetRepository` class to implement lazy initialization through getters. The Import service now supports colon (`:`) and whitespace as a delimiter and converts them to a comma (`,`) delimiter as part of the pre-normalization process.

### Google Spreadsheet template
 - Added sort criteria in `Swap Compact View` tab for needed stickers in a similar way the `Trade` tab has.
 - Added the Team Completed information to the `Reports` tab.

### Apps Script

#### Added

- Under the `src` folder:
  - `ImportService.gs`: Backend of the Import service as part of `ImportExportService.gs` split.
  - `ExportService.gs`: Backend of the Export service as part of `ImportExportService.gs` split.  
 
- Under the `src/html` folder:
  - `ImportDialog.html`: Dialog for import services as part of `ImportExportDialog.html` split.
  - `ExportDialog.html`: Dialog for export services as part of `ImportExportDialog.html` split.
  - `ImportDialogHelpers.html`: Pure functions (testable) related to import dialog logic as part of `ImportExportDialogHelpers.html` split.
  - `ExportDialogHelpers.html`: Pure functions (testable) related to export dialog logic as part of `ImportExportDialogHelpers.html` split.  

- Under the `test` folder:
  - `ImportDialogHelpers.unit.test.js`: test file for `ImportDialogHelpers.gs` as part of `ImportExportDialogHelpers.unit.test.js` split.
  - `ExportDialogHelpers.unit.test.js`: test file for `ExportDialogHelpers.gs` as part of `ImportExportDialogHelpers.unit.test.js` split.

#### Changed

- Under the `src` folder:
  - `ImportExportService.gs`: 
    - Removed the file and split the service into `ImportService.gs` and `ExportService.gs`. 
    - `ImportExportService` class renamed as `ImportService` and `ExportService` for each service.
    - `ExportService` class was renamed as `ExportStickers` to be consistent with `ImportService/ImportStickers` classes.
    - Renamed `exportStickerData` to `exportAllStickerData` in `ExportService` class.
    - Renamed `InputLineNormalize` class to `LineNormalize` since all the classes in this file are related to Import service.
    - In `LineNormalize` class, adjusted the method: `_normalizeDelimiters`, and `_stripNonAsciiAndUpperCase` to allow white and colon (`:`) as delimiters. All of them converted to comma (`,`) delimiters.
  - `Code.gs`: 
    - Refactored to separate the Import and Export dialogs and updated menu calls to use dedicated functions for each dialog.
  - `QuickEntryService.gs`: Updated to use the getters defined in `StickerSheetRepository`.

- Under the `src/html` folder:
  - `ImportExportDialog.html`: Removed and split the logic into `ImportDialog.html` and `ExportDialog.html`, providing dedicated dialogs for each function. Export file prefixes are now specific to each export type.
  - `ImportExportDialogHelpers.html`: Removed and split the logic into `ImportDialogHelpers.html` and `ExportDialogHelpers.html`, providing dedicated helpers for each dialog. Each helper file now handles a specific `payload` for its corresponding dialog. Updated the `buildExportFileName` method to generate export file prefixes specific to each export type.
  - `ImportExportDialogStyles.html`: Updated the header comment.
  - `QuickEntryDialogRender.html`: Added @export tag to include additional functions to be tested.
  - `QuickEntryDialogHelpers.html`: Added @export tag to include additional functions to be tested. In `applyPendingStickerUpdate`, `getVisibleCountries` made the functions defensive against `null/undefined` value.

- Under the `test` folder:
  - `ImportExportService.unit.test.js`: Removed and split by back-end test service: `ImportService.unit.test.js` and `ExportService.unit.test.js`. Added specific tests for white space and colon (`:`) delimiters for `LineNormalize` class test cases.
  - `ImportExportDialogHelpers.unit.test.js`: Removed the file and split the tests into `ImportDialogHelpers.unit.test.js` and `ExportDialogHelpers.unit.test.js`. Adjusted tests to consider specific payload for each service.
  - `Commons.unit.test`: Redesigned the testing strategy to focus only on public methods and removed tests related to private methods. Added coverage for all public methods, including getters.
  - `QuickEntryDialogRender.unit.test.js`: Added additional tests to increase coverage.
  - `QuickEntryDialogHelpers.unit.test.js`: Added a mock DOM to increase coverage by adding tests for DOM specific functions. Removed the dependency with `utils/testKernel.js`, since it is not required.
  - `utils/testKernel.gs`: Minor adjustments to mock data to accommodate the new tests.
  - `fixtures` folder removed (including its contents), as it was no longer in use. All required mocks are now created in `utils/testKernel.js`.

- Under the `doc` folder:
  - `FAQ.md`: Questions added:
    - Why use this tracker instead of an app on the market?
    - I’m currently using an old version of the tracker. How can I upgrade to the new one?
  - `ImportExportServiceRequirements.md`: Removed and split the requirements by service: `ImportServiceRequirements.md` and `ExportServiceRequirements.md`. Included colon (`:`) as a supported delimiter in the pre-normalization process as part of Import Service requirements.

- Under the root folder:
  - `package.json`: Added a new script, `test:file`, to simplify running a single test file. Usage: `npm run test:file -- Commons.unit.test.js`.
  - `README.md`: 
    - Updated the image of `Swap Compact View` to include sorting criteria for needed stickers.
    - Updated **Common rules** section to include colon (`:`) as delimiter as part of pre-normalization process.
    - Adjusted the list of files in **Files** section.
  - `TODO.md`: Remove the item related to include Google form, since after analysis it is not possible due to the way the Gsheet tracker is distributed.

#### Fixed
- No fixes addressed.

---

## [1.0.4] 2026-06-11

### Overview
Added a new export service, `Export shared stickers`, inside **Panini Manage**. Renamed the previous service, `Export Stickers`, to `Export all stickers`. The new service facilitates sticker swapping among collectors by generating a list of repeated stickers and missing (needed) stickers. `ImportExportService` now uses `StickerSheetRepository`, removing duplicated functionality.

### Google Spreadsheet template

No significant changes.

### Apps Script

#### Added

- `src/html/ImportExportDialogStyles.html`: Extracted from `src/html/ImportExportDialog.html` the `<style>` block into a dedicated file. Centralizes dialog-specific styling and improves maintainability.

- `src/html/QuickEntryDialogStyles.html`: Extracted from `src/html/QuickEntryDialog.html` the `<style>` block into a dedicated file. Keeps sticker grid, card, and dialog-specific styles isolated from markup.

- `src/html/CommonDialogStyles.html`: Extracted shared styles used across dialogs into a single file. Centralized theme variables, form controls, messages, and button styling. Standardized use of `.btn` across dialogs.

#### Changes
- Google sheet tracker:
  - Improved `CLEAN_STICKER_LINE` named function to expand numeric ranges (e.g. `1-3 → 1,2,3`, `1-3-5 → 1,2,3,4,5`) for better trade input handling.
  - Added conditional formatting to highlight invalid or ranged input in the `Trades` tab.
  - Added named range `FLAGS` to point to country flag in the `Conf` tab. Updated the formula to populate country flag in `Stickers` tab to use the new named range defined.

- `src` folder:
  - `ImportExportService.gs`:
    - Renamed export service to `exportAll` to support multiple export modes.
    - Added shared sticker export service (`export_shared` mode).
    - Introduced `ExportService` class to consolidate export logic.
    - Moved export logic from `ImportExport` class into `ExportService`.
    - Renamed `ImportStickerParser` → `ImportService` for consistency.
    - Added support for new checkbox-based export options.
    - Simplified the class and constructor by introducing `this.repo` (`StickerSheetRepository`). Removed duplicated attributes and `_buildCountryMap`, since country lookup logic is now delegated to the repository.

  - `Code.gs`:
    - Updated `onOpen` menu structure for new export services.
    - Updated dialog title handling in `showImportExportDialog_`.
    - Renamed `exportStickerData` → `exportAllStickerData`.
    - Added new entry point `exportSharedStickerData`.
    - Standardized export modes: `export_all`, `export_shared`.

  - `Commons.gs`:
    - Simplified the logic because the `FLAGS_URL` named range already contains the URL. Simplified `_buildCountryRecord`, updated `getCountries`, and removed `_extractFlagValue`, `_isUrl`, and `getFormulas`.
    - Added getter methods used by `ImportExportService`.
  
- `src/html` folder:
  - `ImportExportDialog.html`:
    - Moved inline styles to `ImportExportDialogStyles.html`.
    - Added Export shared stickers UI.
    - Improved export-all layout (checkbox ordering, flag naming, output sizing, reduced duplication).

  - `QuickEntryDialog.html`:
    - Moved styles to `QuickEntryDialogStyles.html`.
    - Moved shared styles to `CommonDialogStyles.html`.

  - `QuickEntryDialogRender.html`:
    - Updated increment/decrement buttons to use shared `.btn` + `.btn-sticker` styling for consistency.

- `test` folder:
  - `ImportExportService.unit.test.js`: 
    - Removed dependencies on mock objects from class-level tests. Mocks are now only used when testing `ImportExportService`.
    - Simplified testing of `exportAllData` by introducing the helper function `parseExportAllData`, which converts output into a structured format for easier assertions. Now the suite includes all possible combinations of the configuration options in `exportAllData`.
    - Added helper functions to simplify the testing process `buildCounts` (generate the counts), `computeDone` (calculate dynamically the completion for a given country). Used in testing both export services.
    - Moved shared input data into `beforeAll` for both `exportAllData` and `exportSharedData` suites, resulting in more maintainable and concise tests.
    - Added `parseExportSharedData` to convert `exportSharedData` output into a structured format for easier testing.
    - Added a suite of tests to cover `exportSharedData` service.
    - Improved the `writes correct sticker matrix to sheet` test to verify that sticker values are written to the correct country and positions.
  - `Commons.unit.test.js`: Simplified section comments, removed obsolete tests after the `_buildCountryRecord` refactor, updated tests for the new method signature, and added coverage for additional public and private methods.
  - `ImportExportDialogHelpers.unit.test.js`: Updated tests for the new Export shared stickers service and added coverage for the new checkbox-based user inputs.
  - `QuickEntryService.unit.test.js`: Moved `initTestKernel` initialization into `beforeAll`.
  - `utils/testKernel.js` 
    - Removed unused globals from the test environment and removed `TEST_DATA` from `module.exports`.
    - Converted helper functions used only locally into internal functions.
    - Enhanced `MockStickerSheetRepository` to support the new getters used by `ImportExportService` and `StickerSheetRepository`.

- `doc` Folder:
  - `ImportExportServiceRequirements.md`: Added Export shared stickers service requirements. Standardized menu names, removed ambiguities, provided new definitions, such as sticker definition based on the sticker positions. Removed repeated sections, move all dialog requirements to User Interface requirements section. Standardize headers to group the information within the same top header section.
  - `FAQ.md`: Added a new question about exclusion operator.

- `package.json`: Moved the logic from `test:all` into `test`, ensuring the `build` task is always executed before running tests. Removed the `test:all` script.
- `eslintrc.js`: Override the rule `the-step-down-rule/the-step-down-rule` to turn it off for testing files.
- `.gitignore`: Added `.vscode/`
- `CHANGELOG.md`: Corrected the release date from previous release `1.0.3` from `2027-06-01` to `2026-05-29`. Included the Added section to release `1.0.2` with the new files added related to the testing process.

#### Fixed

- `QuickEntryDialogRender.html`: Restored rendering of special sticker labels (`CREST` for sticker 1 and `TEAM` for sticker 13). Backend already provided `iconLabel`, but UI no longer rendered it due to missing badge injection in `buildStickerCard`.

- `CommonDialogStyles.html`: Updated `--border` color to `#c6cacc` to improve contrast and maintain visual consistency across sticker backgrounds.


## [1.0.3] 2026-06-02

### Overview
This release refactors and rebrand the `ImportExportService` to introduce a more flexible and resilient input parsing pipeline. The system now supports multiple input formats, exclusion operators (to handle missing stickers), improved repeat representations, and structured warnings to inform users about the interpretation and transformation of inputs. Additionally, a new named function `CLEAN_STICKER_LINE` in Google Sheet tracker has been added to support the `GET_TRADES` named function, which extracts the list of stickers from the `INPUT` section in the `Trade` tab. 

### Google Spreadsheet template
- Added a named function `CLEAN_STICKER_LINE` to simplify the process of cleaning the sticker line. This function is used in the named function `GET_TRADES` within the `Trade` tab. Previously, the cleanup process was minimal. Now, instead of just cleaning, the function extracts unique stickers delimited by commas or semi-colons from a raw string input data that contains commas, semi-colons, spaces, repeats notations (`N(X)`, `NxX`, `N(xX)`), and additional noise. This allows users to paste a more flexible input data in the `Stickers` column in the `INPUT` section from the `Trade` tab and still receive the correct list of stickers to be used in the `OUTPUT` section.
- Spreadsheet formulas remain consistent and unaffected when non-valid values are normalized to zero.

### Apps Script

#### Added
- No new files were introduced in this release.
- Existing modules were enhanced with improved parsing, normalization, and expanded test coverage.


#### Changes

- `build/build.js`:
  Refactored build logic to remove hardcoded file and class mappings. Export handling is now driven by `@export` annotations at the class level. This change applies to `*.gs` files. `*.html` export behavior remains unchanged, still relying on explicit function extraction. Reorganized to comply with the `the-step-down-rule` ESLint rule.

- `src/ImportExportService.gs`:
  Major refactor and rebranding of the service architecture:
  - Introduced `InputLineNormalize`, responsible for transforming raw user input into a canonical format.
  - Expanded normalization capabilities:
    - Range expansion (e.g. `A-B`, `A-B(N)`).
    - Removal of consecutive delimiters.
    - Support for semicolon (`;`) separated inputs.
    - Introduction of exclusion operators (`^`, `<>`, `!=`) to represent missing stickers explicitly.
    - Introduction of additional repeat formats such as `NxX`, `N(xX)`, `A-BxX`, `A-B(xX)`.
  - Simplified `StickerInputParser`, delegating most normalization responsibilities to `InputLineNormalize`.
  - Adjusted the service contract in `ImportExportService` to expose parsing warnings to the frontend, enabling user-facing feedback on input transformations.

- `src/html/ImportExportDialog.html`:
  - Import service:
    - Simplified import screen. Format details are now provided via a help icon modal, which opens a lightweight dialog containing the full format reference.
    - Includes all formats and exclusion operator documentation.
    - Includes documentation of the flexible parsing process.
    - Reports warnings to the user.
    - Out-of-range stickers, duplicates, and invalid entries are now reported as warnings and skipped.
    - Duplicate country lines (i.e. multiple lines for the same country) are now reported as warnings and the duplicate line is skipped.
  - Export service:
    - When no data is available to export, the placeholder message indicating an ongoing export process is no longer shown.

- `test/ImportExportService.unit.test.js`:
  Restructured and significantly expanded unit test coverage:
  - Introduced dedicated test sections for `InputLineNormalize` and `StickerInputParser`.
  - Transitioned from monolithic service-level testing to a more granular unit testing strategy.
  - Added a mocked Google Sheets environment to simulate realistic execution scenarios.
  - Improved coverage of import modes, export behavior, and sheet interaction contracts.

- `test/utils/testKernel.js`:
  Simplified and improved test infrastructure:
  - Removed redundant and overly complex mock definitions.
  - Introduced more focused and realistic mocks for Google Sheets interactions.
  - Improved determinism and isolation of test environments.
  - Reorganized to comply with the `the-step-down-rule` ESLint rule.

- `docs/ImportExportServiceRequirements.md`:
  Expanded specification documentation:
  - Added support for additional input formats.
  - Clarified warning semantics and parser behavior.
  - Improved error handling definitions and expected service contracts.
  - Standardized naming conventions and terminology.
  - Document fully aligned with the Import/Export service implementation.

- `.eslintrc.js`: Added  `sort-class-members`, `the-step-down-rule` plugins and the corresponding rules.
- `package.json`: Added convenient task: `lint:file` to run EsLint on a specific file.
- `README.md`: Updated with the changes incorporated in this release.
-  Rest of the source files in `src/`, `test/`, `scripts/` updated comments or format, not structural changes. After changes ensured all 191 tests passed.
-  `CHANGELOG.md`: Corrected tne numbers of previous releases.


#### Fixed
- Fixed incorrect handling of out-of-album stickers (`FWC-20`, non-`FWC-0`) across all import modes.
  Previously, such stickers were not populated as `0` values after import operations.
  The updated implementation ensures:
  - Valid stickers retain their parsed values.
  - Out-of-album stickers are consistently stored as `0`.
  - This process is silent and does not require user input.

---

## [1.0.2] - 2026-05-29

### Overview
Refactored and extended the `ImportExportService` with a more flexible and resilient input parsing pipeline.
The system now supports multiple input formats and provides structured warnings to inform users about how inputs
were interpreted and transformed. Added a testing framework of the Apps script source code.

### Google Spreadsheet template

No significant changes.

### Apps Script

#### Added
- Created the `test` folder.
- Created the `test/fixtures` folder.
- Created the `test/utils` folder.
- Created the `scripts` folder.
- Created the `build` folder for testing purposes. It contains a transformed copy of the source code ready to run under the `Node.js` framework. This folder is generated automatically, used only during testing, and ignored by `git`.
- Under the `test` folder:
  - `Commons.unit.test.js`: Tests for `src/Commons.gs`.
  - `ImportExportDialogHelpers.unit.test.js`: Tests for `src/ImportExportDialogHelpers.html`.
  - `ImportExportService.unit.test.js`: Tests for `src/ImportExportService.gs`.
  - `QuickEntryDialogHelpers.unit.test.js`: Tests for `src/QuickEntryDialogHelpers.html`.
  - `QuickEntryService.unit.test.js`: Tests for `src/QuickEntryService.gs`.
  - `fixtures/createValidRanges.js`: Creates a valid default named-range configuration for repository tests.
  - `utils/testKernel.js`: Global test kernel for GAS unit tests. Creates the mock objects and environment required by the test suite.

- Under the `scripts` folder:
  - `build/build.js`: Creates a testable copy of the `src` folder for execution under Jest.
    - Prepares the `build` folder as the source of files executed by Jest.
    - Converts `*.gs` files into `.js` files in the `build` folder and appends module exports for the classes under test.
    - Converts `*[Helpers|Render].html` files into `html.js` files in the `build` folder and appends module exports for the functions under test.

 - `clasp.zsh`: Zsh script that facilitates synchronization between the `src` folder and the Google Apps Script repository. Provides a controlled pull/push workflow using clasp while preserving the modular local `src/` architecture.
 
  - `fix-jsdoc.js`: Script that consolidates JSDoc comments into a single line when the content fits on one line.

- Under the root folder:
  - `jsconfig.json`: JavaScript project configuration file.
  - `package.json`: Node.js project configuration file (dependencies, scripts, automation tasks, etc.).
  - `.claspignore`: Files and folders excluded from clasp operations.
  - `.eslintignore`: Files and folders excluded from ESLint analysis.
  - `.eslintrc.js`: ESLint configuration file containing project-specific rules.
  - `.gitignore`: Files and folders excluded from version control.

#### Changes
- `src/ImportExportService.gs`: Major refactor of the service architecture:
  - Introduced `InputLineNormalize`, responsible for transforming raw user input into canonical Format 1.
  - Expanded normalization capabilities: range expansion (`A-B`, `A-B(N)`), removal of consecutive delimiters,
    semicolon (`;`) support, and exclusion operators (`^`, `<>`, `!=`) to represent missing stickers.
  - Simplified `StickerInputParser`, delegating normalization to `InputLineNormalize`.
  - Updated service contract to expose parsing warnings to the front-end for user-facing feedback.
- `src/html/ImportExportDialog.html`:
  - Import: simplified the import screen; format details moved to a help icon modal (`ⓘ`) with the full
    format reference including all formats and the exclusion operator; warnings are now surfaced to the user;
    out-of-range stickers are reported as warnings and skipped instead of stopping the import.
  - Export: when there is no data to export the textarea placeholder is cleared so the empty state is
    unambiguous; the status message reports the line count.
- `docs/ImportExportServiceRequirements.md`: Expanded specification — additional input formats, clarified
  warning semantics and parser behavior, improved error handling definitions and service contracts.

#### Fixed
- Incorrect handling of non-valid sticker positions (`FWC` sticker `20`, non-`FWC` sticker `0`) in all
  import modes (`Import data`, `Update counts`, `Update counts clearing country counts`). Non-valid positions
  are now always written as `0` when the row is touched. Valid stickers retain their parsed values, the
  operation is silent (no user action required), and spreadsheet formulas remain unaffected.
- Export Sticker service:
  - when users select to include icon flags (emojis) in the output a comma was added as a delimiter between the
flag icon and the country code. Fixed to match the specification: the delimiter is now a single space.
  - when user select to include icon flags in the output. When the output is a long line. For example, when the country code has many stickers and repeats, lines were not wrapped. Now fixed, long lines are wrapped.
- Import Service: parser failed to parse some scenarios with icon flag (emojis) as part of the syntax. Emojis are decorative elements not part of the data model in Apps Script, so they should be removed before parsing the country line. Now flag icon are excluding before any parsing process.
- Import Service: parser failed to parse some scenarios with icon flag (emojis) as part of the syntax. Emojis are decorative elements not part of the data model in Apps Script, so they should be removed before parsing the country line. Now flag icons are excluded before any parsing process.

---

## [1.0.1] - 2026-05-20

### Overview
Improved Google Spreadsheet template adding flag icons in different tabs. Sorting the output in `Trade` tab. Added the possibility to include flag icons in the export services. Import services, now can handle sticker ranges and flag icons. Quick sticker entry service now include pending action filter. Improve error/warning message to add country context.

### Google Spreadsheet template
- `Conf` (hidden tab)
  - Removed the `TB_COUNTRY` table object because Apps Script doesn’t handle it properly. Instead, defined the columns that are referred to as named ranges.
  - Added flag icons, which are useful when sharing the information in text format. Associated a `FLAG_ICONS` named range.
- `Stickers` tab now refers to the columns from the `Conf` tab.
- `Report` tab added flag icons for each country.
- `Compact Swap View` tab added flag icons for each country.
- `Trade` tab
  - Added flag icons in the **INPUT** and **OUTPUT** sections.
  - The formulas used in the **OUTPUT** section clean the icons portions for the country before calculation.
  - Added a `Cnt` in the **OUTPUT** section for sending stickers, since it is required when there are more matches in the other direction.
  - The conditional formatting for the `Cnt` column now takes the minimum of both `TOTAL`.
  - Optionally allow the user to sort the output based on %-completion (prioritize complete teams first) or by Panini album order (easier to find the sticker).
  - Option to sort the output for Receive Stickers in the `OUTPUT` section.
- The `GET_TRADE` named function doesn’t sort the input data anymore. Now, in the `Trade` tab, the user can sort the result. To find the match, there’s no need to sort the data; the sorting should come after the output.

### Apps Script

#### Added
- `docs/FAQ.md` moved related questions to Google Access/Security for Apps Script
 
#### Changes
  
- `Code.gs` The wrapper for calling import/export services now includes the information to enable or disable the display of flag icons in the export service.
- The `Commons.gs` module has removed the requirement that `COUNTRIES` and `COUNT` should be part of the same tab. 
- The `ImportExportService.gs` file now includes the logic for parsing sticker ranges, such as 1-4 and 1-(2). Additionally, it has been updated to optionally export flag icons and allow the import parser to skip flag icons.
- `ImportExportDialog.html` has been updated to include an icon flag. Added some specific examples, and updated the format specification and rules. For export services, a check box has been added to allow users to include flag icons before the country code in the output. Default flag icons are not exported.
- `QuickEntryDialog.html` now includes the front-end logic for the `Pending` filter.
- `docs/QuickEntryServiceRequirements.md` has been updated to include the requirement for the `Pending` filter.
- `docs/QuickEntryServiceMockDesign.md` has been updated to include the design of the `Pending` filter.
- `README.md` has been updated to document the input range in the import service and flag icons for input and export services, the Pending action in Quick Sticker Entry, and to move significant security/access information for Apps Script to the `FAQ.md` document.

#### Fixed
- When an error is raised during the Import process, the program now provides the country code as a reference instead of a line number when the country code is valid. If the country code is invalid, the line number is referenced in the error message.
- The constraint that the `COUNTRIES` named range has to be defined in `Stickers` tab was removed because it was unnecessary.

---

## [1.0.0] - 2026-05-17

### Overview
First version of the Apps Script project in Github. Added Quick entry service, previously it only included import/export services as part of the Apps Script project.

### Google Spreadsheet template

#### Existing in this release
- Stickers track
- Trade comparison support
- Compact Swap view to facilitate sharing information with other collectors
- Reports and pivot-based progress summaries
- Compact swap view

#### Changes
- Now the `Conf` tab (`TB_COUNTRY`) is used to populate `Ctry`, `Flag`, and `Group` columns in `Stickers` tab.
- Removed unnecessary hidden columns in `Stickers` tab: Country Code, kept only Group as hidden since it is required for the Pivot table in `Reports`.

### Apps Script

#### Added
- Added the **Quick Sticker Entry** service with a visual dialog for updating sticker counts.
  - Added search by team code and country name in Quick Sticker Entry.
  - Added group filtering in Quick Sticker Entry.
  - Added sticker status filters in Quick Sticker Entry for `All`, `Missing`, and `Repeated`.
  - Added local pending-change tracking in Quick Sticker Entry before applying updates.
  - Added batch update behavior through the **Update** button in Quick Sticker Entry.
  - Added sticker-card indicators for pending changes in Quick Sticker Entry.
  - Added visual support for `CREST` and `TEAM` sticker labels in Quick Sticker Entry.
  - Added completion summary per team in Quick Sticker Entry.
- Added `docs/QuickEntryServiceRequirements.md`
- Added `docs/QuickEntryServiceMockDesign.md`
- Added `docs/GoogleAccessStepByStep.md` Steps to carry out to get a copy of the template and getting access to the services under Manage Panini menu
- Added the `appsscript.json` manifest file for the Apps Script project. It delimits the scope of Apps Script project associated with the template.
- Added `Commons.gs` common functionalities to be used by all services: Import, Export, Quick Entry.
- Added `ImportExportService.gs` specific functionalities related to Import/Export services.
- Added `QuickEntryService.gs` specific functionalities for Quick Sticker Entry service.
- Added `QuickEntryDialog.html` form for Quick Entry Service.
- Added `CHANGELOG.md`
- Added to the template file (Google Sheet)
  - Added `Conf` hidden tab to the template and moved the country code column from the `Stickers` tab to the `Conf` tab. The table `TB_COUNTRY` has country
    additional information required for the Apps Script project.
  - Added support for named ranges for the Quick Entry service:
  - `GROUPS`
  - `FLAGS_URL`
  - `COUNTRY_NAMES` 

#### Changed
- Moved technical documentation and requirements documents into the `docs/` folder.
- Renamed and organized the import/export requirements documentation from the previous general requirements file into `docs/ImportExportServiceRequirements.md`.
- Updated `README.md` so the documentation goes by services and uses cases, before it was based on template tabs.
- Updated `README.md` to document the Quick Entry service.
- Updated `README.md` to document Apps Script authorization and the Google unverified app warning.
- Updated `README.md` to include references to official Google documentation.
- Updated `README.md` to clarify the hidden support column used by the Reports Pivot table.
- Updated `Requirements.md` renamed as: `doc/ImportExportServiceRequirements.md` and updated.
- Updated `Code.gs` to remove specific Import/Export functionalities and moved to `ImportExportService.gs` or to `Commons.gs`.
- Updated `ImportDialog.html` renamed as `ImportExportDialog.html` since it includes both services.
- Reorganized the files to separate responsibilities based on the service provided and to keep `Code.gs` for the menu options and wrappers.

#### Fixed
- Fixed export behavior so only valid sticker positions are exported for each country code
