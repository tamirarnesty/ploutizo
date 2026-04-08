import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/consistent-type-specifier-style": ["error", "prefer-inline"],
    },
  },
  {
    // ReUI components are third-party vendor files — suppress rules that
    // require invasive changes to code we don't own.
    files: ["src/components/reui/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/prefer-for-of": "off",
      "import/no-duplicates": "off",
      "import/consistent-type-specifier-style": "off",
      "no-shadow": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]
