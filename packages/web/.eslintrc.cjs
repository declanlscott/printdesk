/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "../../.eslintrc.cjs",
    "plugin:react-hooks/recommended",
    "plugin:@tanstack/eslint-plugin-router/recommended",
    "plugin:@tanstack/eslint-plugin-query/recommended"
  ],
  ignorePatterns: [
    "vite-env.d.ts"
  ],
  env: {
    browser: true,
    es2020: true,
  },
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": "warn",
  },
};
