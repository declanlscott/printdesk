import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    sortTailwindcss: {},
    sortImports: {
      newlinesBetween: false,
      groups: [
        "value-builtin",
        { newlinesBetween: true },
        "value-external",
        { newlinesBetween: true },
        ["value-parent", "value-sibling", "value-index"],
        { newlinesBetween: true },
        "type-builtin",
        "type-external",
        "type-parent",
        "type-sibling",
        "type-index",
      ],
    },
    ignorePatterns: [
      "node_modules",
      "routeTree.gen.ts",
      "dist",
      ".sst",
      "migrations",
      "sst-env.d.ts",
    ],
  },
  lint: {
    plugins: ["eslint", "unicorn", "typescript", "react", "react-perf"],
    jsPlugins: [
      "@tanstack/eslint-plugin-router",
      "eslint-plugin-drizzle",
      { name: "react-hooks-js", specifier: "eslint-plugin-react-hooks" },
    ],
    categories: {
      correctness: "error",
      suspicious: "error",
      pedantic: "off",
      perf: "warn",
      style: "off",
      restriction: "error",
    },
    rules: {
      "eslint/no-new": "off",
      "eslint/no-param-reassign": "off",
      "eslint/no-shadow": "off",
      "eslint/no-undefined": "off",
      "eslint/no-underscore-dangle": "off",
      "eslint/no-use-before-define": "off",
      "react/forbid-component-props": "off",
      "react/jsx-filename-extension": "off",
      "react/react-in-jsx-scope": "off",
      "typescript/no-namespace": "off",
      "typescript/explicit-function-return-type": "off",
      "typescript/explicit-module-boundary-types": "off",
      "typescript/no-invalid-void-type": "off",
      "unicorn/no-array-reduce": "off",
    },
    ignorePatterns: ["**/sst-env.d.ts", "**/routeTree.gen.ts"],
  },
});
