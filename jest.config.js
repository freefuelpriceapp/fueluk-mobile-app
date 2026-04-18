module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/lib/__tests__/**/*.test.js"],
  transform: { "^.+\.jsx?$": ["babel-jest", { configFile: "./babel.config.test.js" }] },
};
