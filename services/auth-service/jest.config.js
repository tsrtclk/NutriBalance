/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testRegex: "\\.spec\\.ts$",
  transform: { "^.+\\.ts$": "ts-jest" },
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@platform/(.*)$": "<rootDir>/../../packages/$1/src",
  },
};
