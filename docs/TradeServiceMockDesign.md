# Trade Service Mock Design

## 1. Purpose

This document defines the proposed user interface for the Trade service.

It complements the functional requirements described in [TradeServiceRequirements.md](TradeServiceRequirements.md) by illustrating the user interface, screen layout, and user interactions for both desktop and mobile implementations.

The mockups presented in this document are intended to:

- Visualize the trade workflow.
- Define the organization of user interface elements.
- Ensure a consistent user experience across desktop and mobile devices.
- Serve as a reference during implementation.

Business rules, validation logic, trade matching, and spreadsheet updates are defined in [TradeServiceRequirements.md](TradeServiceRequirements.md) and are not repeated in this document.

## 2. Desktop Mockups

### 2.1 Trade dialog

The **Trade dialog** is displayed when the user selects **Trade** from the **Manage Panini** custom menu.

This is the main view of the Trade service. It allows the user to:

- Generate a QR code containing **the user's** trade information for another collector to scan.
- Provide another collector's trade information manually.
- Import another collector's trade information from a QR code image.
- Validate the provided information before generating a trade proposal.

The dialog has two states:

- **Initial state**, displayed when the dialog is first opened.
- **Validated state**, displayed after the user enters or imports trade information and performs validation.

The dialog remains open throughout the import and validation process.

#### Initial state

When the dialog is first displayed, the **Missing** and **Repeats** sections are empty.

Example layout:

```text
+----------------------------------------------------------------+
| Trade stickers                                        [ Close ]|
+----------------------------------------------------------------+
|                                                                |
| [ Generate my QR code ]                                        |
|                                                                |
| ------------------------------------------------------------   |
| Import another collector's information      [ Upload QR image ]|
| ------------------------------------------------------------   |
|                                                                |
| Missing                                                        |
| +------------------------------------------------------------+ |
| |                                                            | |
| |                                                            | |
| +------------------------------------------------------------+ |
|                                                                |
| Repeats                                                        |
| +------------------------------------------------------------+ |
| |                                                            | |
| |                                                            | |
| +------------------------------------------------------------+ |
|                                                                |
| Messages                                                       |
| +------------------------------------------------------------+ |
| | No validation messages.                                    | |
| +------------------------------------------------------------+ |
|                                                                |
|                [ Validate ] [ Continue ]                       |
+----------------------------------------------------------------+
```

#### Validated state

After the user enters trade information manually or imports it from a QR code image, the same dialog displays the imported information together with the validation results.

Example layout:

```text
+----------------------------------------------------------------+
| Trade stickers                                        [ Close ]|
+----------------------------------------------------------------+
|                                                                |
| [ Generate my QR code ]                                        |
|                                                                |
| ------------------------------------------------------------   |
| Import another collector's information      [ Upload QR image ]|
| ------------------------------------------------------------   |
|                                                                |
| Missing                                                        |
| +------------------------------------------------------------+ |
| | MEX,1,5,12-13                                              | |
| | FWC,2,8,17-18                                              | |
| +------------------------------------------------------------+ |
|                                                                |
| Repeats                                                        |
| +------------------------------------------------------------+ |
| | MEX,4(2),8-9(3),17(5)                                      | |
| | FWC,6(2),14(4)                                             | |
| | <>BRA,1-18                                                 | |
| +------------------------------------------------------------+ |
|                                                                |
| Messages                                                       |
| +------------------------------------------------------------+ |
| | Information, warnings, and errors are displayed here.      | |
| +------------------------------------------------------------+ |
|                                                                |
|                [ Validate ] [ Continue ]                       |
+----------------------------------------------------------------+
```

User interface elements:

- **Generate my QR code**
  - Displays a QR code generated from the user's current trade information.

- **Upload QR image**
  - Allows the user to select an image containing another collector's QR code.
  - Automatically populates the **Missing** and **Repeats** fields after a successful scan.

- **Missing**
  - Multi-line text area containing another collector's missing stickers.
  - Allows the user to review, edit, copy, or paste the information.

- **Repeats**
  - Multi-line text area containing another collector's available stickers for trade.
  - Allows the user to review, edit, copy, or paste the information.

- **Validate**
  - Processes the current content using the existing import validation logic implemented in `src/ImportService.gs`.
  - Updates the **Messages** section with the validation results.
  - Prevents continuing while blocking errors exist.

- **Messages**
  - Displays information, warnings, and errors generated during validation.
  - Uses the same message format and visual style as the existing Import and Export services.

- **Continue**
  - Proceeds to the **Trade proposal** view when no blocking validation errors exist.
  - If only warnings are present, selecting **Continue** indicates acceptance of those warnings.

- **Close**
  - Closes the Trade dialog without applying any changes.

The Trade dialog does not modify the user's collection. It only collects, validates, and prepares another collector's trade information for comparison.

The input format is specified in [ImportServiceRequirements](ImportServiceRequirements.md).

The **Missing** list may contain repeated sticker notation for compatibility with the Import service. However, repeat quantities are ignored and do not participate in the trade matching process.

The **Repeats** list can include repeat notation. If repeat notation is not included, the sticker is assumed to have a repeat count of `2`.

### 2.2 Generate QR Code View

The **Generate QR Code** view is displayed when the user selects **Generate My QR Code** from the Trade dialog.

This view allows the user to share their trade information with another collector by displaying a QR code generated from the current collection data.

Example layout:

```text
+----------------------------------------------------------------+
| Generate trade QR code                                [ Close ]|
+----------------------------------------------------------------+
|                                                                |
| Scan this QR code to import my trade information               |
|                                                                |
|                 +----------------------+                       |
|                 |                      |                       |
|                 |                      |                       |
|                 |       QR CODE        |                       |
|                 |                      |                       |
|                 +----------------------+                       |
|                                                                |
| Messages                                                       |
| +------------------------------------------------------------+ |
| | Trade information generated successfully.                  | |
| | Missing: XX                                                | |
| | Repeats: XX                                                | |
| +------------------------------------------------------------+ |
|                                                                |
|                                      [ Back ]                  |
+----------------------------------------------------------------+
```

User interface elements:

- **QR Code**
  - Displays the generated QR code containing the user's trade information.

- **Messages**
  - Displays the result of the QR code generation process.
  - Shows confirmation information when the trade information is generated successfully.
  - Displays the number of missing stickers and repeats included in the generated trade information.
  - Displays warnings or errors if the QR code generation process cannot be completed.

- **Back**
  - Returns to the Trade dialog without modifying any data.

- **Close**
  - Closes the Trade dialog.

The QR code view is part of the same Trade dialog and does not open a separate modal window.

The generated QR code contains only the trade information required by the Trade service and does not include the complete collection data.

### 2.3 Trade proposal and confirmation view

The **Trade proposal and confirmation view** is displayed after the imported trade information has been validated successfully.

This view displays the possible sticker exchanges identified between both collectors.

The sticker lists displayed in the proposal are read-only. The user cannot directly select or modify individual stickers. The displayed results are updated automatically when the user click the **Refresh** button after changing the trade quantities or sorting option. It ensure all user changes are implemented at once.

Example layout:

```text
+----------------------------------------------------------------+
| Trade proposal                                       [ Close ] |
+----------------------------------------------------------------+
|                                                    [ Refresh ] |
| Stickers to receive (4)                                        |
| [ ] Sort by album completion                                   |
| +------------------------------------------------------------+ |
| | MEX,1,5                                                    | |
| | FWC,2,8                                                    | |
| +------------------------------------------------------------+ |
|                                                                |
| Stickers to send (2)                                           |
| +------------------------------------------------------------+ |
| | MEX,4,8                                                    | |
| +------------------------------------------------------------+ |
|                                                                |
| Stickers to receive: [ 2 ▼ ]   Stickers to send: [ 2 ▼ ]       |
|                                                                |
| Messages                                                       |
| +------------------------------------------------------------+ |
| | Information, warnings, and errors are displayed here.      | |
| +------------------------------------------------------------+ |
|                                                                |
|                  [ Back ]   [ Confirm trade]                   |
+----------------------------------------------------------------+
```

The default values for **Stickers to receive** and **Stickers to send** are calculated using the minimum number of available matches between both trade directions.

The available values in each dropdown range from `1` to the maximum trade quantity available for that direction.

User interface elements:

- **Stickers to receive (X)**
  - Displays the stickers the user can receive from the trade proposal.
  - The number in parenthesis indicates the total number of possible receive matches.
  - The displayed list is limited according to the selected receive quantity.
  - The displayed list is reordered when **Sort by album completion** is selected.
  - Changes to the displayed list are applied only after the user clicks the **Refresh** button.

- **Sort by album completion**
  - When selected, sorts the received stickers using the user's existing collection completion information.
  - When not selected, stickers are displayed using the default album order.
  - Changes to this option are applied only after the user clicks the **Refresh** button.

- **Stickers to send (X)**
  - Displays the stickers the user can send as part of the trade proposal.
  - The number in parenthesis indicates the total number of possible send matches.
  - The displayed list is limited according to the selected send quantity.
  - Changes to the displayed list are applied only after the user clicks the **Refresh** button.

- **Trade quantity dropdowns**
  - Allow selecting the number of stickers to receive and send.
  - The available values range from `1` to the maximum trade quantity available in each direction.
  - The default value is the balanced trade quantity.
  - Changing a dropdown updates the corresponding sticker list after the user clicks the **Refresh** button.

- **Balanced trade default**
  - The default quantity for both dropdowns is calculated as the minimum value between the available receive matches and send matches.
  - This creates an equal trade by default while allowing the user to select an unbalanced trade by changing either dropdown.

Example:

```text
Matches:

Stickers to receive: 5
Stickers to send:    3

Default selection:

Stickers to receive: [ 3 ▼ ]
Stickers to send:    [ 3 ▼ ]
```

This creates an equal trade by default while allowing the user to select an unbalanced trade by changing either dropdown.

- **Messages**
  - Displays information, warnings, and errors related to the current trade proposal.
  - Displays the result of the trade operation after selecting **Confirm trade**.

- **Refresh**
  - Updates the **Stickers to receive (X)** and **Stickers to send (X)** lists based on the selected **Sort by album completion** option and the selected trade quantities.
  - Applies all pending user changes to the trade proposal.
  - Ensures that the displayed sticker quantities match the selected dropdown values.

- **Back**
  - Returns to the Trade dialog while preserving the current imported trade information.

- **Confirm trade**
  - Confirms the selected trade quantities as the final exchange.
  - Updates the user's sticker counts in the `COUNTS` named range.
  - Updates the **Messages** section with the result of the trade operation.
  - This action cannot be undone from the Trade dialog.

- **Close**
  - Closes the Trade dialog and cancels the trade workflow.

> Note: After the trade is applied, spreadsheet-level undo functionality may be available depending on the Google Sheets state. The Trade service does not manage or provide an undo operation.

---

## 3. Mobile Workflow

The mobile Trade workflow provides the same trade functionality as the desktop implementation with an optimized user interface for mobile devices.

The mobile implementation supports the same trade information input methods available on desktop:

- Manually entering or pasting another collector's trade information.
- Capturing another collector's QR code using the device camera.

The mobile-specific functionality is capturing another collector's trade information using the device camera.

The mobile workflow consists of:

- Opening the Trade service from the **Manage Panini** custom menu.
- Providing another collector's trade information:
  - Manually entering or pasting the information.
  - Capturing a QR code using the device camera.
- Reviewing and validating another collector's trade information.
- Reviewing the trade proposal.
- Confirming the final trade.

### 3.1 Trade view

The **Trade view** is displayed when the user opens the Trade service on a mobile device.

The view provides the same trade workflow available in the desktop implementation, adapted for mobile interaction.

The mobile Trade view differs from the desktop implementation in the following way:

- The **Upload QR image** action is replaced by **Capture QR code**.
- **Capture QR code** is an optional input method that opens the device camera to scan another collector's QR code directly.
- The user can continue using manual input by copying and pasting another collector's trade information.

After QR code capture:

- The QR content is decoded.
- The trade information is validated using the same validation process used by the desktop implementation.
- If validation succeeds, the user is redirected to the **Trade proposal and confirmation view**.
- If blocking validation errors are detected, the user is redirected to review the information before continuing.

The Trade view does not implement separate mobile trade rules. It reuses the same trade model, validation logic, and business rules defined for the desktop implementation.

### 3.2 Capture QR code

The **Capture QR code** view is displayed when the user selects **Capture QR code** to import another collector's trade information using the device camera.

This view allows the user to scan a QR code generated by another collector's Trade service.

Example layout:

```text
+------------------------------------------------+
| Capture QR code                       [ Close ]|
+------------------------------------------------+
|                                                |
|                                                |
|              +----------------+                |
|              |                |                |
|              |  Camera area   |                |
|              |                |                |
|              +----------------+                |
|                                                |
| Point the camera at the collector QR code.     |
|                                                |
|                                                |
|                    [ Cancel ]                  |
+------------------------------------------------+
```

User interface elements:

- **Camera area**
  - Displays the device camera preview.
  - Allows the user to capture another collector's QR code.

- **Cancel**
  - Closes the QR capture view without importing information.

After a QR code is successfully captured:

- The QR content is decoded.
- The imported trade information is processed using the same validation flow as manual input and QR image upload.
- If the information is valid and no blocking errors are detected, the user is redirected directly to the **Trade proposal and confirmation view**.
- If blocking errors are detected, the user is redirected to the **Trade View** to review and correct the imported information.
- If only warnings are present, the user can continue to the **Trade proposal and confirmation view** after accepting the warnings.

The QR capture process does not modify the user's collection.

---

## 4. Implementation Notes

The Trade mockup uses the existing application services and shared components.

The implementation must reuse:

- Existing Import and Export service logic.
- The `StickerSheetRepository` for spreadsheet access.
- The same trade data model and validation rules across desktop and mobile workflows.

The mockup does not define backend implementation details.