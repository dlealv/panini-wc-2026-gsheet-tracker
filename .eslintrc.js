/*
 * ESLint configuration for Panini WC 2026 GSheet Tracker project.
 * Enforces code quality and style standards across the project, with specific rules for test files.
 * Code Guideline based on StandardJS with customizations for readability, maintainability, and project-specific needs.
 */

module.exports = {
  env: { browser: true, node: true, jest: true },
  extends: ['standard'],
  globals: { google: 'readonly', SpreadsheetApp: 'readonly', Logger: 'readonly' },
  plugins: ['jsdoc', 'sort-class-members', 'the-step-down-rule'],
  rules: {
    indent: ['error', 2],
    'sort-class-members/sort-class-members': ['error', {
      order: ['[properties]', 'constructor', '[getters]',
        '[setters]', '[methods]', '[conventional-private-methods]']
    }],
    'the-step-down-rule/the-step-down-rule': 'error',
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'max-len': ['error', { code: 120 }],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
    'function-call-argument-newline': ['error', 'never'],
    'newline-per-chained-call': 'off',
    // 'newline-per-chained-call': ['error', { ignoreChainWithDepth: 0 }],
    'no-whitespace-before-property': 'error',
    'dot-location': ['error', 'object'],
    'padded-blocks': ['error', 'never', { allowSingleLineBlocks: true }],
    'padding-line-between-statements': [
      'error',
      // 1. NO forced blank line between variable declarations (NEW — keeps grouping clean)
      { blankLine: 'never', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      // 2. Force a blank line AFTER variables before logic starts
      {
        blankLine: 'always',
        prev: ['const', 'let', 'var'],
        next: ['expression', 'block', 'for', 'while', 'switch', 'try']
      },
      // 3. Clean expression spacing
      { blankLine: 'never', prev: 'expression', next: 'expression' }
    ],
    // Clean layout rules: allows single-line blocks while letting our node script fix the geometry
    'jsdoc/multiline-blocks': ['error', { noSingleLineBlocks: false, minimumLengthForMultiline: 120 }],
    'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
    'jsdoc/check-param-names': 'error',
    'jsdoc/require-param-description': 'error',
    'jsdoc/require-jsdoc': [
      'error',
      {
        publicOnly: true,
        require: { FunctionDeclaration: true, MethodDefinition: true }
      }
    ]
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: {
        // allow long test descriptions / datasets
        'max-len': 'off',
        // allow flexible spacing in tests (describe blocks, nested suites, etc.)
        'padding-line-between-statements': 'off',
        // keep tests readable
        'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
        'the-step-down-rule/the-step-down-rule': 'off'
      }
    }
  ]
}
