// script/fix-jsdoc.js
/**
 * JSDoc Single-Line Utility
 *
 * NOTE: WHY THIS SCRIPT IS CODE-BASE NECESSARY
 * ESLint (and `eslint-plugin-jsdoc`) cannot natively auto-fix or collapse
 * plain description blocks across lines during `--fix` due to node boundary
 * constraints. It treats untagged 3-line layouts as immutable structures.
 * This script bridges that gap without risking code corruption.
 *
 * NOTE: Current eslint configuration in .eslintcr.js seems to handle single line JSDocs correctly,
 * but this script serves as a safety net for any edge cases and ensures consistent formatting across
 * the codebase.
 *
 * USAGE:
 *   node scripts/fix-jsdoc.js       -> Dry-Run Mode (Safe preview, no file changes)
 *   node scripts/fix-jsdoc.js --fix -> Fix Mode (Permanently overwrites the files)
 */

const fs = require('fs')
const path = require('path')
// Read command line arguments
const args = process.argv.slice(2)
const IS_FIX_MODE = args.includes('--fix')
const TARGET_DIR = './src'
// Targets three-line JSDocs with no parameters or inner tags
const jsdocRegex = /\/\*\*\r?\n\s*\* ([^\r\n*@]+)\r?\n\s*\*\//g

function processDirectory (dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Error: Target directory '${dir}' does not exist.`)
    return
  }

  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      processDirectory(filePath)
    } else if (file.endsWith('.js') || file.endsWith('.gs')) {
      const content = fs.readFileSync(filePath, 'utf8')
      let match
      let hasChanges = false

      jsdocRegex.lastIndex = 0

      while ((match = jsdocRegex.exec(content)) !== null) {
        const fullMatch = match[0]
        const innerText = match[1].trim()
        const lineNumber = getLineNumber(content, match.index)
        const outputString = `/** ${innerText} */`

        console.log('\n--------------------------------------------')
        console.log(`📍 File:   ${filePath}:${lineNumber}`)
        console.log(`📥 Input:\n${fullMatch}`)
        console.log(`📤 Output: ${outputString}`)
        hasChanges = true
      }

      if (hasChanges && IS_FIX_MODE) {
        const updatedContent = content.replace(jsdocRegex, (m, p1) => `/** ${p1.trim()} */`)

        fs.writeFileSync(filePath, updatedContent, 'utf8')
        console.log(`\n✅ WRITTEN: Applied modifications to ${filePath}`)
      }
    }
  })
}

function getLineNumber (content, index) {
  return content.substring(0, index).split(/\r?\n/).length
}

if (IS_FIX_MODE) {
  console.log('🚀 Starting JSDoc Scan in FIX MODE (Modifying files)...')
} else {
  console.log('🔍 Starting JSDoc Scan in DRY-RUN MODE (Safe preview)...')
}

processDirectory(TARGET_DIR)
console.log('\n✨ Execution complete.')
if (!IS_FIX_MODE) {
  console.log('💡 Review the preview above. To execute these changes, run: node fix-jsdoc.js --fix')
}
