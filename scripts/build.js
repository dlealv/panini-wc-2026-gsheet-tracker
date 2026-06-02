// script/build.js
/**
 * Builds Google Apps Script files into Node-testable JavaScript.
 *
 * Responsibilities:
 * - converts .gs → .js for Jest execution
 * - extracts HTML helpers into .html.js
 * - injects deterministic test export blocks
 * - preserves source traceability via SOURCE header
 */

const fs = require('fs')
const path = require('path')
const SRC_DIR = path.resolve(__dirname, '../src')
const BUILD_DIR = path.resolve(__dirname, '../build')
/** Export block constants */
const EXPORT_BLOCK_START = '//EXPORT-MODULE-START (AUTO-GENERATED BLOCK)'
const EXPORT_BLOCK_END = '//EXPORT-MODULE-END'

/** Main build process */
function build () {
  console.log('🔨 Building GAS files...\n')
  ensureCleanBuildDir()
  const files = getAllFiles(SRC_DIR)

  files.forEach(fullPath => {
    if (fs.lstatSync(fullPath).isDirectory()) {
      return
    }

    const relPath = path.relative(SRC_DIR, fullPath)
    const fileName = path.basename(fullPath)
    const content = fs.readFileSync(fullPath, 'utf8')

    /** CASE 1: GAS backend files */
    if (fileName.endsWith('.gs')) {
      buildGsFile({ relPath, fileName, content })
      return
    }
    /** CASE 2: HTML helper files */
    if (fileName.endsWith('Helpers.html') || fileName.endsWith('Render.html')) {
      buildHelperFile({ relPath, fileName, content })
    }
  })
  console.log('\n🎉 Build completed.')
}

/** Builds HTML helper files */
function buildHelperFile ({ relPath, fileName, content }) {
  const jsContent = extractHelperJs(content)
  const exported = extractExportsFromTags(jsContent)
  const functionNames = exported.length ? exported : extractExportsFromTags(jsContent)
  const outputFileName = fileName.replace(/\.html$/i, '.html.js')
  const outPath = path.join(BUILD_DIR, outputFileName)
  const header = buildHeader(relPath)
  const output = header + jsContent + '\n' + buildHelpersFooter(functionNames)

  fs.writeFileSync(outPath, output, 'utf8')
  console.log(`🧩 ${relPath} → ${outputFileName}`)
}

/** Extracts JS from HTML safely. Strategy: - remove <script> wrappers only - preserve helper code exactly */
function extractHelperJs (content) {
  return content.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '').trim()
}

/** Builds footer for HTML helper files */
function buildHelpersFooter (exports) {
  if (!exports || exports.length === 0) {
    return buildEmptyExportBlock()
  }
  return buildHelpersExportBlock(exports)
}

/** Builds helper export block Example: const helpers = { ... } module.exports = { helpers } */
function buildHelpersExportBlock (exports) {
  return `
${EXPORT_BLOCK_START}
const helpers = {
  ${exports.join(',\n  ')}
}

if (typeof module !== 'undefined') {
  module.exports = { helpers }
}
${EXPORT_BLOCK_END}
`
}

/** Builds .gs backend files */
function buildGsFile ({ relPath, fileName, content }) {
  const outputFileName = fileName.replace(/\.gs$/i, '.js')
  const outPath = path.join(BUILD_DIR, outputFileName)
  const header = buildHeader(relPath)
  const exports = extractExportsFromTags(content)
  const output = header + content + '\n' + buildGsFooter(exports)

  fs.writeFileSync(outPath, output, 'utf8')
  console.log(`📄 ${relPath} → ${outputFileName}`)
}

/** Builds file header */
function buildHeader (relPath) {
  const normalized = relPath.replace(/\\/g, '/').replace(/^src\//, '')
  return `// SOURCE: src/${normalized}
// AUTO-GENERATED FILE (JEST ONLY) - DO NOT EDIT

`
}

/** Recursively collects all files */
function getAllFiles (dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    if (fs.lstatSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList)
    } else {
      fileList.push(fullPath)
    }
  })

  return fileList
}

/** Cleans build directory */
function ensureCleanBuildDir () {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true })
}

/** Extracts @export tags from source */
function extractExportsFromTags (content) {
  const exported = []
  const exportRegex =
    /\/\*\*[\s\S]*?@export[\s\S]*?\*\/\s*(?:(async\s+)?function\s+([a-zA-Z0-9_]+)|class\s+([a-zA-Z0-9_]+))/g
  let match

  while ((match = exportRegex.exec(content)) !== null) {
    const functionName = match[2]
    const className = match[3]

    exported.push(functionName || className)
  }
  return exported
}

/** Builds footer for GAS backend files */
function buildGsFooter (exports) {
  if (!exports || exports.length === 0) {
    return buildEmptyExportBlock()
  }
  return buildDirectExportBlock(exports)
}

/** Builds empty export block */
function buildEmptyExportBlock () {
  return `
${EXPORT_BLOCK_START}
if (typeof module !== 'undefined') {
  module.exports = {}
}
${EXPORT_BLOCK_END}
`
}

/** Builds direct export block Example: module.exports = { StickerSheetRepository } */
function buildDirectExportBlock (exports) {
  return `
${EXPORT_BLOCK_START}
if (typeof module !== 'undefined') {
  module.exports = {
    ${exports.join(',\n    ')}
  }
}
${EXPORT_BLOCK_END}
`
}

// Main execution
build()
