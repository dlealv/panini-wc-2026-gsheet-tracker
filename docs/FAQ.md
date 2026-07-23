# FAQ

## General Questions

### Why use this tracker instead of an app on the market? 

There are multiple apps on the market with a similar purpose, however, apps are applications with a specific scope and usually do not cover all the formats used by Panini sticker collectors. In some cases, it is necessary to convert the data into the desired format in order to enter it into the app. The advantage of using this Google Sheets tracker is that it makes it easier to adapt the data received for trading with another collector by performing the transformations right inside the tracker itself. Particularly with this tracker, the end users own the document and can easily make any changes or extensions they need. A similar advantage would apply to Excel, but it is not a free service, which is why this tracker represents a great advantage.

### I’m currently using an old version of the tracker. How can I upgrade to the new one?

From the previous tracker, navigate to *Manage Panini* and select *Export all stickers*. Create a copy of the new template and import the stickers using the following: Go to *Manage Panini* and select *Import Data*. Both processes have back compatibility, so you can start using the new version without losing your data.

Alternatively, you can copy the counts from the `Stickers` tab and paste them as values into the new copy of the template file without using the custom menu.

### Is there a way to import the data entering missing stickers instead?
Yes, from version `1.0.3` it is possible via exclusion command (`<>`) you can also use `^` or `!=` for the same purpose. For example if you have all stickers for `MEX` except sticker, `20`, you can enter in the input data box:

```text
<>MEX,20
```

instead of:

```text
<>MEX,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19
```

### Can I use this tracker from a mobile device?

Starting with release `1.1.0`, the Google Sheet Tracker includes a mobile web application that allows users to manage their album from a mobile device. Because Google Apps Script does not provide native support for mobile add-ons, **a one-time setup is required** after making a copy of the tracker template. For setup instructions, see the **Mobile Services** section in the [README](../README.md).

### Can I collect Coca-Cola sticker with this tracker?

Yes, since release `1.1.1` it is possible to collect Coca-Cola stickers. The **Manage Panini** services were also adjusted to include such stickers.

### After copying the Panini template, I don't see the **Manage Panini** menu?

This is usually a timing issue. It may take a few moments for the menu to appear. Simply refresh the page, and the **Manage Panini** menu should become available.

### After copying the Panini template and granting access, I don't see the `appsscript.json` file?

When you copy the Apps Script project, a new local Apps Script project is created. By default, the manifest file from the template project is hidden.

To display it:

1. In Google Sheets, open the **Extensions** menu and select **Apps Script**.
2. In the Apps Script editor, click **Project Settings** (gear icon).
3. Enable the option **Show "appsscript.json" manifest file in editor**.
4. Return to the **Editor** view.

You will now see the [`appsscript.json`](../src/appsscript.json) file. It contains the same settings as the template project, although the fields may appear in a different order.

### After following the instructions in the Mobile Web App link, I don't see the URL?

This is usually a timing issue. It may take a minute or so for Google Apps Script to complete the deployment and generate the Web App URL.

The purpose of this step is simply to provide you with the Web App URL. Alternatively, once the deployment is complete, you can copy the URL directly from the deployment dialog, as shown below:

![Mobile Service: Manage Deployments](../images/manageDeploymentsView.jpg)

### After deploying the Web App, I don't see the application listed?

This is usually a timing issue. Refresh the Apps Script page, then open the **Deploy** drop-down menu in the upper-right corner and select **Manage deployments**. The newly deployed Web App should appear in the list.

### Can I search by sticker number in the Quick sticker entry service?

Yes. Starting with release `1.1.2`, this feature was introduced. You can now search for popular sticker numbers such as `1` or `13` across all country teams using the search box.

If the search text is numeric, it is interpreted as a sticker number search. Otherwise, it is treated as a country code or country name search.

### How can I identify the version of the template or the Apps Script project?

Starting with release `1.1.2`, version information is available directly from both products:

- **Google Spreadsheet template:** Open the `About` sheet to view the current template version and the corresponding GitHub release information.
- **Apps Script project:** From the **Manage Panini** custom menu, select **About** to view the current Apps Script version and related project information.

### I don't see the About item in **Manage Panini** custom menu?

If a new release updated the **Manage Panini** menu, you need to refresh your Google Spreadsheet template in order to see it.

### Why are the template version and the Apps Script version different?

Starting with release `1.1.2`, both the Google Spreadsheet template and the Apps Script project are versioned independently, and each version is displayed within its respective product:

- **Google Spreadsheet template:** **About** sheet.
- **Apps Script project:** **About** menu item.

Both version numbers follow the GitHub release sequence, but they are tracked independently because the Google Spreadsheet template and the Apps Script project evolve separately.

- *Template version:* Updated only when a GitHub release includes changes to the Google Spreadsheet template.
- *Apps Script version:* Updated only when a GitHub release includes changes to the Apps Script source code.

As a result, several version combinations are possible:

1. **Template and Apps Script versions are the same**: The GitHub release contains changes to both the spreadsheet template and the Apps Script project.
2. **The template version is behind the Apps Script version**: The versions were previously aligned, but subsequent releases only included changes to the Apps Script project.
3. **The template version is ahead of the Apps Script version**: The versions were previously aligned, but subsequent releases only included changes to the spreadsheet template.
4. **Both versions are behind the latest GitHub release**: One or more GitHub releases only introduced documentation, build, or other project-related improvements that did not affect either the spreadsheet template or the Apps Script project.

## Google Access/Security Questions

### Why this warning can appear

![Unverified Message](../images/google%20access/unverifiedGoogleMessage.jpg)

Google explains that Apps Script requires user authorization to access private data from Google services. Authorization scopes are determined automatically by scanning the script code, and users can see an authorization dialog when the script is first run. Google also warns that web apps and other scripts that use sensitive scopes are subject to review, and users attempting to authorize them may see a warning screen saying the app is unverified by Google.

This does **not automatically mean the spreadsheet is unsafe or malicious**. It means the script project has not been formally verified by Google through its OAuth app verification flow. Google’s Apps Script verification documentation also explains that projects used only within the same Google Workspace domain or customer are generally exempt, but users outside that domain can see the unverified app screen if the OAuth client has not been verified.

### What this script is used for

The scope of the script is limited by the manifesto file of the project [appsscript.json](appsscript.json) this file clearly specifies it makes changes to the **spreadsheets only** (`"https://www.googleapis.com/auth/spreadsheets"`). This is guarantee that the actions in the **Manage Panini** menu won't affect other resources from your google account. 

> Note: Before version `1.1.0` the scope was more restricted: **this spreadsheet only** (`https://www.googleapis.com/auth/spreadsheets.currentonly`) but for mobile service the app needs to use `doGet()` service which requires a broader scope, i.e.  **spreadsheets only**.

The source code is published in this repository so users can review what the script does before authorizing it.

### How to reproduce the browser authorization screen

If you want to capture the warning screen again for documentation or testing, the most reliable method is:

1. Open an **incognito/private browser window**
2. Sign in with a Google account that has **never authorized** the script
3. Open a fresh copy of the spreadsheet
4. Run **Quick Sticker Entry** or **Import / Export**
5. Capture the Google authorization or unverified-app browser screen if it appears

### Steps to follow to get the Apps Script project up and running
Check the [Step by Step document](docs/GoogleAccessStepByStep.md) that will guide you through the copy and Apps Script access process.

### Can this warning be removed?

For public users, removing the warning usually requires the owner of the Apps Script project to complete Google’s OAuth verification process for the related Google Cloud project. Google explains that verified apps no longer show the unverified app screen to users, and that the verification process may require a configured OAuth consent screen, a verified domain, a homepage URL, a privacy policy URL, and other app details requested by Google. **All this sounds disproportionate for a harmless spreadsheet template like this one**.

Until that verification is completed, some users may continue to see Google’s warning before using scripted features.

### Where to get more informed

For more details, see Google’s official documentation:
- [Authorization for Google Services | Apps Script](https://developers.google.com/apps-script/guides/services/authorization)
- [OAuth Client Verification | Apps Script](https://developers.google.com/apps-script/guides/client-verification)
- [Troubleshoot authentication & authorization issues | Apps Script](https://developers.google.com/apps-script/api/troubleshoot-authentication-authorization)

These documents explain why the authorization dialog appears, why some users may see the unverified-app warning, and what is required to remove the warning for external users.

### Additional note for Google Workspace organizations

Google explains that Apps Script projects used only within the same Google Workspace domain or customer may be exempt from this public verification requirement. That means the warning behavior may differ depending on whether the spreadsheet is being used privately, internally in one organization, or shared publicly with external users.

---
