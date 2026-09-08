const js = require("@eslint/js");
const globals = require("globals");

// Flat config (ESLint 9). Deliberately narrow: this codebase is consistent
// already, so the job here is catching real mistakes - an undefined variable,
// a require that no longer resolves to anything used - not enforcing taste.
// Stylistic rules are left out rather than added and then blanket-disabled.
module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**", "_data/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Express error middleware is identified by arity, so `next` must stay
      // in the signature even when unused. Same for a `next` kept for shape.
      "no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^(next|_)" },
      ],
      // console is the logging layer here, on purpose.
      "no-console": "off",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];
