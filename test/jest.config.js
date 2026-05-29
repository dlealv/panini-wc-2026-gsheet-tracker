/** Jest configuration file */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: [ // Setup file to initialize GAS environment before tests run
    '<rootDir>/setup-gas-env.js'
  ],
  testMatch: [ // Test files are located in the test/ directory and have .test.js extension
    '**/test/**/*.test.js'
  ],
  testPathIgnorePatterns: [ // Ignore node_modules and scripts directories for test discovery
    '/node_modules/',
    'scripts/'
  ],
  modulePathIgnorePatterns: [ // Ignore src directory for module resolution
    'src'
  ]
}
