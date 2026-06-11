module.exports = {
  testEnvironment: "node",
  testMatch: [
    "**/src/lib/__tests__/**/*.test.js",
    "**/src/screens/__tests__/**/*.test.js",
  ],
  transform: { "^.+\.jsx?$": ["babel-jest", { configFile: "./babel.config.test.js" }] },
  moduleNameMapper: {
    // Stub out binary / image assets so Jest (Node env) can require() them
    "\\.(png|jpg|jpeg|gif|webp|svg)$": "<rootDir>/src/lib/__mocks__/fileMock.js",
  },
};
