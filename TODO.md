# 🚀 Future Enhancements

- [x] Allow user to include or not flag icons before the country code in the export output.
- [x] Allow input parser to skip optional flag icon before the country code.
- [x] Add Filter in Quick Entry view by pending changes.
- [x] Allow input services to include ranges such as: `1-3`, equivalent to `1,2,3` or even `1-3(2)` equivalent to `1(2),2(2),3(2)`.
- [x] Allow to enter missing data instead of owned data when importing, for example: `<>MEX,20` equivalent to enter: `MEX,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19`
- [x] Allow other forms of representing repeats, such as: `NxX` or `N(xX)` and equivalent for sticker ranges: `A-BxX`, `A-B(xX)`. 
- [x] Add flag icons to the `Reports`, `Compact Swap`, and `Trade` (OUTPUT) tabs.
- [x] Write automated unit tests for testing Apps Script project.
- [x] Reorganize the repository to have the source code in `src` folder. Separate `gs` from `html` or by services. Have a `test` folder for unit testing.
- [x] Add a service in Manage Panini to generate swap info (repeats and missing) in text format including icons. In a way it can be sent in a friendly manner in a text message for example.
- [x] In the `Reports` tab, include repeats. Currently only unique repeats.
- [x] Include Coca-Cola stickers
- [x] Reuse functions in `ImportHelper.html` in `MobileImportView.html` since some of the services are the same. Do it with caution since now it is it working as expected.
- [x] Allow to search by sticker number in Quick Entry service.
- [x] Show product version for gsheet template and for Apps Script project.
- [x] Panini sticker card repository and lookup
- [x] Trade Service Apps Script service to simplify trading process.
- [] Complete refactor to ensure service use the same contract as the input of `updateStickerCounts` in `StickerSheetRepository`, so there is no need to do additional transformation.
