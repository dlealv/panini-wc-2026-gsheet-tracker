
# #️⃣ Coding Style Guidelines

GAS project — all JavaScript must be Google Apps Script compatible.

Additional conventions beyond this file: [.eslintrc.js](https://github.com/dlealv/panini-wc-2026-gsheet-tracker/blob/main/.eslintrc.js)

## Structure

- Encapsulate script logic into files and classes. Each class should have a clear, single responsibility. Use multiple classes when the problem domain naturally separates into distinct concerns.
- As a general guideline, no method body should exceed approximately 20 lines (excluding comment lines) — roughly one screen. Refactor into sub-methods when approaching this limit.
  - If a helper is simple and used only within one method, define it as an inner function.
  - If the helper has significant responsibility and requires documentation to understand it, make it a private method instead.
- Private methods use an underscore prefix (`_foo()`).

>[!NOTE]
> For project folder organization, check Github project or [TechnicalArchitecture](docs/TechnicalArchitecture.md).

## Testing

- The project uses Jest, running under Node.js.
- Organize tests with one top-level `describe` block per class, and a nested `describe` block per method/function within it.
- For integration tests, use a separate `describe` block that can combine calls across different methods/functions, or even different classes.
- Rely on the mock data defined in `test/utils/testKernel.js`. This file emulates GAS interactions and validates results against the expected data (`TEST_DATA`).
- **Test only public methods on classes, and only `@export`-tagged functions in `*Helpers.html`/`*Render.html` files.** A private (`_foo()`) method's behavior is verified through the public/exported method that calls it, never with a `describe` block of its own - regardless of how much logic the private method has.
- Testable classes are identified by adding `@export` tag in the JSDOC section for `*.gs` files.
- Static methods are usually the GAS entry point and just delegate to a non-static method - test the delegation there (that it calls through correctly), and put the detailed behavior tests in the non-static method's own `describe` block. Test static methods first, ahead of the non-static ones.
- Organize tests in the same order the classes/methods appear in the source file.
- When a method has multiple variants to test (e.g. different import modes), prefix the test description accordingly (`update mode:`, `clean_all mode:`) and group related tests together.
- Each testable source file should have a corresponding unit test file.
- Separate consecutive `describe` blocks with a blank line - the one exception to the "avoid blank lines" rule
  under Formatting, which is otherwise about source files, not test files.
- No line blank line separation between test functions.

## Naming conventions

- Primitive `const` variable: `UPPER_CASE`
- Object/array `const` binding, `let` variable, function/method: `lowerCamelCase`
- Class: `PascalCase`
- Record/object-literal field names: assume the record's own context, don't repeat it in the field name. A country
  record's identifier field is `code`, not `countryCode`; its display name field is `name`, not `countryName` - the record already says what it's about, so a field name doesn't need to say it again. This applies to fields returned/consumed as data (e.g. `{code, name, group, flag, counts}`); it does NOT extend to every local variable or function parameter - `_buildStickerViews(countryCode, counts)` keeps `countryCode` as a parameter name, since a bare `code` there would be ambiguous next to `counts`/other locals in scope, and parameters aren't "records."

## Formatting

- Maximum 120 characters per line, including leading whitespace and comment markers — applies to code, JSDoc blocks, and inline comments.
- Do not add a semicolon (`;`) at the end of a statement unless necessary.
- Always use braces `{}` for `if`/`else` blocks, even for single-line bodies: `if (x === 1) { return }`
- Avoid a return statement that performs several calculations inline — it's difficult to debug. Instead assign to a
  `result` variable, then return it:
  ```js
  const result = ... // <- easy to debug
  return result
  ```
- Avoid blank lines inside the body of the methods/functions — they make the code unnecessarily large. Prefer a `//` line comment explaining the next block instead. Modern editors highlight structure with syntax coloring, so blank lines aren't needed for visual separation.
- Use a single blank line to separate consecutive methods/functions and between classes.
- Avoid padding/argument-per-line expansion. Prefer a single line that maximizes use of the 120-character limit over wrapping one argument per line.
- Don't use decorative section banners, e.g.:
  ```js
  //======================
  // Section name
  //======================
  ```
  Use a single line instead: `// PRIVATE METHODS`

## Inline comments

- Add an inline comment to explain non-obvious logic blocks.
- Placement rule:
  - If the comment fits on the same line as the opening `{` within 120 characters, place it after `{` on that line.
  - If it does not fit, place it on the line immediately before the block opens.

## JSDoc documentation

- All public methods and non-trivial private methods must have a JSDoc block comment describing purpose, using tags
  such as `@param` and `@return`.
- Do not use blank lines between paragraphs inside a JSDoc block.
- Short, single-purpose methods may use a concise single-line `/** ... */` JSDoc comment (not expanded to multiple
  lines) if it fits within the line length limit.
- Type-level and class-attribute comments use `/** ... */` style to allow easy expansion.
- Provide fully documented source code (JSDoc) for the first version of a file, and update the JSDoc (purpose or
  contract) on every subsequent change.
- All files should have a preamble section on top of the file:
  - First line: full name path of the file, it helps to provide context of the file when sharing it. 
  - Second line: a blank line. Next:
  - Document purpose of the file, relevant aspects, common information, notes. No adornments, no blank lines.

## HTML files

- All files should have a preamble section on top of the file:
  - First line: full name path of the file, it helps to provide context of the file when sharing it. 
  - Second line: a blank line. Next:
  - Document purpose of the file, relevant aspects, common information, notes. No adornments, no blank lines.
- Add a comment identifying large `<div>`/block elements so collapsed code is still identifiable, e.g.:
  ```html
  <div class="section"><!-- section: Action -->
      <div class="section-title">Actions</div>
  </div><!-- /section: Action -->
  ```

## Markdown files

- The 120-character line limit under Formatting applies to code, JSDoc, and inline comments only — never to prose in `*.md` files (`CLAUDE.md`, `CHANGELOG.md`, `docs/*.md`). Write each paragraph and each list item as a single, unwrapped line, however long. Editors soft-wrap markdown to the width of the view automatically, so a hard line break gains nothing and just adds noise to diffs. A blank line still separates paragraphs/list items as usual; only the manual mid-paragraph wrapping is disallowed.

## Delivering file updates (for AI tools)

- If changes are limited to at most two places in a file, provide those changes as targeted diffs/snippets.
- For more than two changes, provide the full, documented source file instead — to avoid copy/paste errors.

## Change control

- Track relevant changes in the code in `CHANGELOG.md` file for a new release entry usually on top of the file and associated to future or not determined data, such as `2026-08-XX`. Keep the same structure as previous releases organized by product: **Google Spreadsheet template** and **Apps Script** and keep the changes organized by folders and files. Folder and files organized in alphabetical order.
- Nested folder information organized as they are in Github, for example: first `src/html`, then the content in `src` folder.
- Track changes as you implement the changes in the code, not at the end, it is difficult to remember the changes and it ends up having a no precise changelog entry.
- Document root folder information at the end same as for any Github project.

Here is a template for a new release changelog entry:

```text
## [X.X.X] YYYY-MM-DD

### Overview

### Google Spreadsheet template

#### Added

#### Changes

### Fixed

### Apps Script

#### Added

#### Changes

### Fixed
```

## Final remark

>[!IMPORTANT]
>In summary: professional, well-documented, and compact code.