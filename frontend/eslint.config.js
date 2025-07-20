// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [js.configs.recommended, prettierConfig, {
  ignores: ["dist/**", "node_modules/**", ".storybook/**", "vite.config.ts"],
}, {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      project: "./tsconfig.json",
      ecmaVersion: 2020,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      document: "readonly",
      window: "readonly",
      console: "readonly",
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
    react: react,
    "react-hooks": reactHooks,
    "react-refresh": reactRefresh,
    prettier: prettier,
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    ...tseslint.configs.strict.rules,
    "@typescript-eslint/no-floating-promises": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "prettier/prettier": "error",
  },
}, ...storybook.configs["flat/recommended"]];