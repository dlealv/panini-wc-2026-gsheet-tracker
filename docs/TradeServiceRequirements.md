# Panini FIFA WC 2026 Trade Service Requirements

## 1. Purpose

Provide an Apps Script-based Trade service that allows Panini FIFA World Cup 2026 collectors to compare sticker collections, identify possible sticker exchanges, confirm a trade, and automatically update the user's sticker counts.

The service provides an alternative workflow to the existing `Trade` spreadsheet tab. Instead of manually comparing collections and updating formulas, the service provides a guided workflow through the `Manage Panini` custom menu.

The service must allow collectors to:

- Share their missing stickers and Repeats with another collector.
- Import another collector's trade information.
- Compare both collections automatically.
- Identify possible sticker exchanges in both directions.
- Prioritize received stickers based on collection completion.
- Review and confirm the final trade quantities.
- Automatically update the `COUNTS` named range after confirmation.

The service simplifies the trade workflow by replacing manual comparison and manual count updates with a guided trade proposal and confirmation process.

The Trade service must reuse the existing spreadsheet data model, business rules, repository layer, and Import/Export logic already implemented by the tracker, including:

- Named ranges (`COUNTRIES`, `COUNTS`, and `DONE`).
- Sticker count interpretation and special stickers (`FWC` and `CC`).
- `StickerSheetRepository` for spreadsheet access.
- Existing Import/Export logic for generating and normalizing trade information.

The service does not replace the collector's decision process. It identifies possible exchanges and prepares a proposed trade, but the final trade confirmation always belongs to the user.

---

## 2. Scope

This service covers:

- Opening the Trade service from the `Manage Panini` custom menu.
- Generating the user's trade information and QR code.
- Receiving another collector's trade information through:
  - Manual input.
  - QR code image upload.
  - Mobile QR code capture.
- Validating and normalizing another collector's trade information.
- Comparing both collections to identify possible sticker exchanges.
- Supporting equal and unbalanced trade quantities.
- Sorting received stickers by album order or album completion percentage (`DONE` named range).
- Confirming the final trade quantities.
- Updating the user's sticker counts in the `COUNTS` named range after confirmation.
- Preserving spreadsheet formatting by writing values only to `COUNTS`.

The service does not cover:

- Negotiation between collectors.
- Determining trade value or fairness.
- Payment or compensation for unbalanced trades.
- Trade history.
- Updating another collector's spreadsheet.
- Updating ranges outside `COUNTS`.
- Replacing the existing `Trade` spreadsheet tab.

The service does not cover:

- Negotiation between collectors before confirming a trade.
- Determining the monetary value or fairness of a trade.
- Payment or compensation for unbalanced trades.
- Maintaining trade history.
- Updating another collector's spreadsheet.
- Updating spreadsheet ranges outside `COUNTS`.
- Replacing the existing `Trade` spreadsheet tab.

---

## 3. Definitions

For the purposes of this document, the following terms are used:

- **Trade information**: The subset of a collector's collection shared for trading. It contains Missing stickers and Repeats.

- **Missing stickers**: Valid stickers whose count is equal to `0`.

- **Repeats**: Stickers whose count is greater than `1`. One copy is retained to complete the album, and additional copies are available for exchange.

- **Balanced trade**: A trade where both collectors exchange the same number of stickers.

- **Unbalanced trade**: A trade where one collector exchanges more stickers than the other. The difference is agreed between collectors outside the scope of this service.

---

## 4. Relationship with Existing Services

The Trade service is an Apps Script alternative workflow to the existing `Trade` spreadsheet tab. The existing spreadsheet-based Trade tab remains unchanged. The Trade service must reuse existing application services and business rules instead of duplicating functionality.

### Export Service

The Trade service uses the existing Export Shared Stickers logic from `src/ExportService.gs` to generate the user's trade information:

- Missing stickers.
- Repeats.

### Import Service

The Trade service uses the existing Import logic from `src/ImportService.gs` to:

- Parse input information.
- Validate sticker data.
- Normalize trade information.

### StickerSheetRepository

All spreadsheet access must use `StickerSheetRepository`. The Trade service must not access spreadsheet ranges directly when repository methods are available.

### Quick Sticker Entry

Quick Sticker Entry and Trade are independent services. Quick Sticker Entry updates sticker counts manually. Trade updates sticker counts only after a confirmed exchange. Both services share the same spreadsheet data model and repository layer.

---

## 5. Service Entry Points

The Trade service is accessed from the **Manage Panini** custom menu through:

- `Trade`

The service provides:

- A desktop dialog interface.
- A mobile-optimized interface.

The implementation must separate:

- Trade workflow orchestration.
- Trade business logic.
- User interface handling.
- Spreadsheet access.

Desktop and mobile implementations must share the same trade model, validation rules, and business logic while providing layouts optimized for each platform.

---

## 6. User Workflow

The Trade service guides the collector from receiving another collector's trade information to confirming the final exchange and updating sticker counts.

The workflow consists of:

1. Open the Trade service from the `Manage Panini` custom menu.

2. The user may generate a QR code containing their own trade information for sharing with another collector.

3. Import another collector's trade information using:
   - Manual input.
   - QR code image upload.
   - Mobile QR code capture.

4. Validate the imported information.
   - Display validation results generated by the existing `ImportService.gs`.
   - Prevent continuing when blocking errors exist.
   - Allow continuing when only warnings exist and the user accepts them.

5. Generate the user's trade information automatically from the current collection.

6. Compare both collections and generate possible exchanges:
   - Stickers the user can receive.
   - Stickers the user can send.

7. Display the Trade proposal and confirmation view:
   - Review possible exchanges.
   - Select receive and send quantities.
   - Sort received stickers by album order or completion percentage.
   - Confirm the final trade.

8. After confirmation:
   - Update sticker counts in the `COUNTS` named range.
   - Display the result of the update operation.

The service must preserve the current workflow state until the user confirms the trade or exits without applying updates.

---

## 7. Trade Information Exchange

The Trade service supports exchanging trade information between collectors.

Trade information contains only:

- Missing stickers.
- Repeats (stickers available for trade).

The service supports multiple exchange methods, but all methods must produce the same normalized internal trade representation before comparison.

The exchange process must not modify the spreadsheet. It only collects, validates, and prepares trade information for comparison.

Supported exchange methods:

- Manual input.
- QR code image import.
- Mobile QR code capture.
- Generate user's trade QR code.

### 7.1 Manual Input

The service must allow the user to enter another collector's trade information manually. The input areas are:

- **Missing** stickers.
- **Repeats** (available stickers for trade).

The input format must reuse the existing Import service format and validation rules.

Example:

**Missing**

```text
FWC,2,4,8
MEX,1,5,7
ARG,3,9,15
```

**Repeats**

```text
FWC,6(2),10-12(3)
MEX,2(2),11(4)
ARG,8(2),14(5)
```

The examples above are provided only to illustrate the expected input.

The complete input syntax, supported delimiters, repeat notation, ranges, validation rules, and normalization behavior are defined in [ImportServiceRequirements.md](ImportServiceRequirements.md).

The Trade service must reuse the existing parsing and validation logic implemented by `ImportService.gs` rather than implementing a separate parser.

### 7.2 QR Code Import

The service must allow another collector's trade information to be imported from a QR code.

Supported methods:

- Desktop: upload QR code image.
- Mobile: capture QR code using the device camera.

After decoding, the QR content must follow the same validation and normalization process used for manual input.

The imported information must generate the same internal trade model regardless of the exchange method.

### 7.3 Generate My Trade QR Code

The service must allow the user to generate a QR code containing the user's current trade information.

The generated information must be calculated automatically from the current spreadsheet collection.

The QR content contains only:

- Missing stickers.
- Repeats.

The generation process:

- Does not require manual input.
- Does not modify spreadsheet data.
- Does not start the trade comparison workflow.

---

## 8. Trade Data Model

The Trade service compares two normalized trade information models:

- The user's trade information generated from the current collection.
- Another collector's trade information imported through supported exchange methods.

Both sources must be converted into the same internal representation before matching.

The internal trade model contains only:

- Missing stickers.
- Repeats.

The internal model does not store repeat quantities. Each sticker position represents one possible exchange unit.

### 8.1 User's Trade Information

The user's trade information must be generated automatically from the current spreadsheet using the existing Export Shared Stickers logic.

The generated information contains:

- Missing stickers: count equal to `0`.
- Repeats: count greater than `1`.

### 8.2 Other Collector's Trade Information

Another collector's trade information is obtained from imported trade information after validation.

The validated information must be normalized into the same internal model used for the user's collection.

Repeat quantities are only used to identify that a sticker position is available for trade.

Example:

Input:

```text
MEX,4(2),8(3),15-17(5)
FWC,6(2),14(4)
```

Normalized:

```text
MEX,4,8,15,16-17
FWC,6,14
```

### 8.3 Missing Sticker Rules

A missing sticker represents a sticker position required by the collector.

Missing stickers:

- Represent sticker positions with count `0`.
- Are stored only once.
- Do not contain quantity information.

A repeat represents a sticker position that the collector owns with more than one copy.

Repeat rules:

- Indicates that the sticker position can be offered for trade.
- Repeat quantities do not affect trade calculations.
- Each repeat sticker position represents one possible exchange unit.

Example:

Input:
```text
MEX,4(5)
```

Normalized:
```text
MEX,4
```

The trade process exchanges only one copy of each sticker position.

### 8.5 Trade Information Normalization

Before comparison, both collectors' trade information must be normalized.

Normalization must:

- Remove duplicated sticker entries.
- Convert repeat notation into sticker positions.
- Ignore repeat quantities.
- Remove invalid sticker positions using existing validation rules.

The original imported information must not be modified.

### 8.5 Trade Information Normalization

Before comparison, both trade information sources must be normalized.

Normalization must:

- Remove duplicated sticker entries.
- Convert repeat notation into sticker positions.
- Ignore repeat quantities.
- Remove invalid sticker positions using the validation rules defined in [ImportServiceRequirements](ImportServiceRequirements.md).

The normalized trade information model must contain only valid:

- Missing stickers.
- Repeats.

The original imported information must not be modified.

---

### 8.6 Trade Information Limitations

The trade information model must contain only the information required to identify possible sticker exchanges.

The service must not include:

- Full collection information.
- Sticker counts.
- Repeat quantities.
- Personal collector information.
- Collection progress information from another collector.

The trade comparison process only requires knowing:

- Which stickers the collector needs (Missing).
- Which stickers the collector can offer (Repeats).

Additional collection information must not be exchanged or stored as part of the trade information model.

---

## 9. Trade Matching Process

The Trade service compares both normalized trade models to identify possible sticker exchanges.

The comparison evaluates:

- Stickers the user needs and another collector can provide.
- Stickers another collector needs and the user can provide.

The matching process only identifies possible exchanges.

It does not:

- Modify spreadsheet data.
- Consider sticker value.
- Evaluate trade fairness.
- Consider repeat quantities.

### 9.1 Match Calculation

A receive match exists when:

- The user is missing a sticker.
- Another collector has that sticker in Repeats.

A send match exists when:

- Another collector is missing a sticker.
- The user has that sticker in Repeats.

Each match represents one exchange unit.

### 9.2 Possible Trade Result

The service generates a trade proposal containing:

- Stickers the user can receive.
- Stickers the user can send.
- Maximum possible exchange quantity in each direction.

The service must support:

- Equal trades.
- Unbalanced trades.
- No possible trade matches.

If no matches exist, the user must be informed and the workflow can end without updating the spreadsheet.

### 9.3 Trade Prioritization

The default receive sticker order is:

- Album order.

The user can optionally sort receive stickers by country completion percentage using the `DONE` named range.

Sorting only changes display order.

It does not modify:

- Match results.
- Sticker availability.
- Trade validation rules.

---

## 10. Trade Confirmation

The Trade service must allow the user to review and confirm the proposed exchange before updating the user's sticker counts.

The Trade proposal view provides both:

- Trade proposal review.
- Final trade confirmation.

The service must not update the `COUNTS` named range until the user selects **Confirm trade**.

### 10.1 Trade Proposal Review

The Trade proposal view displays:

- Stickers to receive.
- Stickers to send.
- Total possible matches in each direction.
- Selected trade quantities.
- Validation messages related to the trade operation.

The sticker lists are read-only. The user cannot manually select individual stickers.

The displayed trade can only be modified by changing:

- Stickers to receive quantity.
- Stickers to send quantity.
- Sort by album completion option.

After user makes the changes, they missing and repeats list will be updated after the users requests to refresh the view.

The user must be able to review the proposed exchange and confirm that it matches the agreement with the other collector.

### 10.2 Balanced Trade

A balanced trade occurs when the number of stickers exchanged in both directions is the same.

The default trade quantities are calculated as:

- Minimum value between possible receive matches.
- Minimum value between possible send matches.

Example:

Possible matches:

Receive: 5 stickers  
Send: 3 stickers

Default selection:

Receive: 3 stickers  
Send: 3 stickers

The user can confirm the balanced trade without modifying the quantities.

### 10.3 Unbalanced Trade

The service must support trades where the number of stickers exchanged differs between directions.

The user can create an unbalanced trade by changing either trade quantity:

- Stickers to receive.
- Stickers to send.

The selected quantities must be validated against the available possible trade matches.

The service must not allow:

- Receiving stickers that were not identified as possible matches.
- Sending stickers that were not identified as possible matches.
- Selecting quantities greater than the available matches.

### 10.4 Confirm Trade

The **Confirm trade** action applies the selected trade quantities as the final exchange.

Before applying the trade, the service must validate that the selected trade information is still valid.

After successful confirmation:

- The service updates the user's sticker counts in the `COUNTS` named range.
- The applied trade becomes the new collection state.
- The Messages section displays the result of the trade operation.

If the update fails:

- The service displays an error message.
- The trade is not considered applied.

The user cannot undo the trade from the Trade dialog after confirmation. Spreadsheet undo functionality remains available through the existing spreadsheet behavior.

If the user closes the dialog before selecting **Confirm trade**:

- No spreadsheet updates are performed.
- The current collection data remains unchanged.

---

## 11. COUNTS Update

After the user selects **Confirm trade**, the service must update the user's sticker counts using the `COUNTS` named range.

The update process must apply only the stickers included in the confirmed trade proposal.

The service must not update sticker counts before the confirmation action is completed.

### 11.1 Confirmed Trade Updates

The confirmed trade update must apply the selected exchange quantities:

- Stickers received from the other collector increase the user's sticker count.
- Stickers sent to the other collector decrease the user's sticker count.

The update applies only one copy of each confirmed sticker position.

Repeat quantities from the trade information must not be used during the update.

Example:

Receiving sticker `MEX,4`:

- Current count: `0`
- New count: `1`

Sending sticker `BRA,2`:

- Current count: `3`
- New count: `2`

After the update completes successfully, the `COUNTS` named range represents the user's new collection state.

### 11.2 Update Validation

Before applying the update, the service must verify that:

- The selected stickers are still valid.
- The current counts allow the requested changes.
- The update operation can be completed successfully.

If the validation fails:

- The service must not modify the `COUNTS` named range.
- The Messages section must display the reason for the failure.

### 11.3 Spreadsheet Safety Rules

The Trade service must update only the `COUNTS` named range.

The service must:

- Write values only.
- Preserve existing spreadsheet formatting.
- Avoid modifying formulas.
- Avoid modifying unrelated cells or named ranges.
- Avoid updating another collector's data.
- Use the existing `StickerSheetRepository` class for spreadsheet access.

The update calculation must be:

- Stickers to send: current count minus `1`.
- Stickers to receive: current count plus `1`.

The final write operation must be performed through the `StickerSheetRepository` class.

---

## 12. Errors and Warnings

The Trade service must reuse the existing error and warning handling implemented by the Import and Export services.

Errors and warnings generated during the trade workflow must be displayed in the **Messages** section using the same message format, naming conventions, and visual styles already defined by the existing services.

The Trade service must not duplicate validation logic already implemented by existing services.

The service must handle messages generated during the following stages:

- Importing another collector's trade information.
- Validating trade information.
- Generating trade proposals.
- Confirming and applying the trade update.

Message handling rules:

- Blocking errors must prevent the workflow from continuing.
- Warnings must allow the user to continue after explicitly accepting them through the workflow action.
- Successful operations must provide confirmation feedback to the user.

If the trade update fails:

- The `COUNTS` named range must not be considered updated.
- The failure reason must be displayed in the **Messages** section.

---

## 13. User Interface Requirements

### 13.1 Desktop Trade Dialog

The Trade service must provide a desktop dialog accessible from the `Manage Panini` custom menu.

The desktop dialog must guide the user through:

- Generating the user's trade QR code.
- Providing another collector's trade information.
- Validating imported trade information.
- Reviewing the trade proposal.
- Confirming the final trade.

The desktop dialog must provide:

- Trade information input area.
- Messages area for information, warnings, and errors.
- Actions required to continue, confirm trade, or cancel the workflow.

The desktop implementation must reuse existing application styles and UI conventions whenever possible.

The desktop interface must not modify the spreadsheet through intermediate actions. Spreadsheet updates must only occur after the user selects **Confirm trade**.

### 13.2 Mobile Trade View

The mobile Trade service must provide the same trade workflow, business rules, and trade functionality as the desktop implementation.

The mobile-specific functionality is:

- Capturing another collector's QR code using the device camera.

The mobile workflow must also support manual input of another collector's trade information.

The mobile implementation must reuse the same:

- Trade data model.
- Validation rules.
- Matching logic.
- Confirmation process.

Spreadsheet updates must only occur after the user selects **Confirm trade**.

### 13.3 Trade Information Input

The Trade service must allow the user to provide another collector's trade information through:

- Manual input.
- QR code image upload.
- Mobile QR code capture.

Manual input must provide separate sections for:

- Missing stickers.
- Repeats.

After the information is provided, the Trade service must process it using the existing import and validation logic.

The user interface must display validation results in the Messages section.

The user must be able to correct invalid information before continuing with the trade workflow.

### 13.4 QR Code Features

The Trade service must support QR code exchange as an alternative method for sharing trade information.

The QR code functionality must support:

- Generating a QR code containing the user's trade information.
- Importing another collector's trade information from a QR code image.
- Capturing another collector's QR code using the mobile device camera.

The QR payload must contain only the information required for trading:

- Missing stickers.
- Repeats.

The QR representation should prioritize:

- Compact data representation.
- Reliable encoding and decoding.
- Compatibility between generated and scanned QR codes.

QR code data must not include information that can be generated from the user's spreadsheet collection.

Decoded QR information must follow the same validation and normalization process as manual input.

### 13.5 Trade proposal and confirmation view

The Trade proposal view must display the possible sticker exchanges generated by the matching process.

The view must display:

- Stickers to receive.
- Stickers to send.
- Total possible matches in each direction.
- Selected trade quantities.

The sticker lists are read-only.

The user must be able to:

- Change the number of stickers to receive.
- Change the number of stickers to send.
- Sort stickers to receive by album order or collection completion percentage.

Changing trade quantities must automatically update the corresponding sticker lists.

The displayed proposal must represent only the current possible trade and must not modify the user's collection.

The view must provide a **Confirm trade** action that applies the selected exchange.

### 13.6 Trade Confirmation

The Trade proposal view also acts as the trade confirmation step.

The user confirms the final exchange by selecting **Confirm trade**.

Before confirmation, the user must be able to review:

- Stickers to receive.
- Stickers to send.
- Selected quantities.
- Trade balance.

The service must clearly indicate that confirming the operation will update the user's sticker counts in the `COUNTS` named range.

The Trade service must not update the user's collection until the user explicitly selects **Confirm trade**.

### 13.7 Loading, Empty, Success, and Error States

The Trade service must provide clear feedback during each stage of the workflow.

The user interface must handle:

- Loading state:
  - Display while processing imported trade information.
  - Display while generating trade proposals.
  - Display while applying confirmed updates.
  - Prevent duplicate actions while processing.

- Empty state:
  - Display when no imported trade information is available.
  - Display when no possible trade matches are found.

- Success state:
  - Display after trade information is successfully generated or imported.
  - Display after a trade is successfully applied.

- Error and warning states:
  - Display validation and operation messages in the Messages section.
  - Follow the same message format, naming conventions, and visual styles defined by existing services.

The user interface must provide enough information for the user to understand the current workflow state and required next action.

---

## 14. Technical Design Guidelines

The implementation must follow the existing application architecture and reuse existing services and components whenever possible.

### 14.1 Trade Service Responsibilities

The Trade service is responsible for:

- Managing the trade workflow.
- Coordinating existing import/export functionality.
- Generating and normalizing trade information models.
- Comparing collector trade information.
- Generating trade proposals.
- Handling user confirmation.
- Requesting collection updates through the repository layer.

The Trade service must not duplicate:

- Existing spreadsheet access logic.
- Existing import parsing and validation logic.
- Existing export trade information generation logic.

### 14.2 StickerSheetRepository Usage

All spreadsheet access must be performed through the existing `StickerSheetRepository` class.

The Trade service must not access spreadsheet ranges directly when repository methods are available.

The repository layer must be responsible for applying updates to the `COUNTS` named range.

### 14.3 Client and Backend Separation

The implementation must separate:

- User interface handling.
- Trade business logic.
- Spreadsheet access.

The client side must only:

- Handle user interaction.
- Display trade information.
- Display validation and operation messages.

Trade processing, validation coordination, and spreadsheet updates must be handled by the server-side Apps Script service layer.

---