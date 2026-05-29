// test/fixtures/createValidRanges.js

/** Creates valid default named-range configuration for repository tests. Tests may override specific ranges as needed. */

/** */
function createValidRanges (overrides = {}) {
  const defaults = {
    COUNTRIES: { cols: 1 },
    COUNTS: { cols: 21 },
    GROUPS: { cols: 1 },
    FLAGS_URL: { cols: 1 },
    COUNTRY_NAMES: { cols: 1 }
  }

  return {
    ...defaults,
    ...overrides
  }
}

module.exports = {
  createValidRanges
}
