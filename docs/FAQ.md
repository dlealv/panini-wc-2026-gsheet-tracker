# FAQ

## General Questions

### I’m currently using an old version of the tracker. How can I upgrade to the new one?

From the previous tracker, go to *Manage Panini* and select *Export Stickers*. Make a copy of the new template and import the stickers: *Manage Panini* → *Import Data*. Both processes have back compatibility, so you can start using the new version without losing your data.

### Is there a way to import the data entering missing stickers instead?
Yes, from version `1.0.3` it is possible via exclusion command (`<>`) you can also use `^` or `!=` for the same purpose. For example if you have all stickers for `MEX` except sticker, `20`, you can enter in the input data box:

```text
<>MEX,20
```

instead of:

```text
<>MEX,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19
```
---

## Google Access/Security Questions

### Why this warning can appear

Google explains that Apps Script requires user authorization to access private data from Google services. Authorization scopes are determined automatically by scanning the script code, and users can see an authorization dialog when the script is first run. Google also warns that web apps and other scripts that use sensitive scopes are subject to review, and users attempting to authorize them may see a warning screen saying the app is unverified by Google.

This does **not automatically mean the spreadsheet is unsafe or malicious**. It means the script project has not been formally verified by Google through its OAuth app verification flow. Google’s Apps Script verification documentation also explains that projects used only within the same Google Workspace domain or customer are generally exempt, but users outside that domain can see the unverified app screen if the OAuth client has not been verified.

### What this script is used for

The scope of the script is limited by the manifesto file of the project [appsscript.json](appsscript.json) this file clearly specifies it makes changes to the **current template only**. This is guarantee that the actions in the **Manage Panini** menu won't affect other resources from your google account.

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
