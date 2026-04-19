//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"
import importPlugin from "eslint-plugin-import-x"
import tseslint from "typescript-eslint"

export default [
  ...tanstackConfig,
  {
    plugins: {
      import: importPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Forbid file extensions on relative imports — use bare specifiers (e.g. './foo', not './foo.js')
      // Exception: TanStack Router auto-generates routeTree.gen — the .gen extension is intentional
      'import/extensions': ['error', 'never', { ignorePackages: true, pattern: { gen: 'always' } }],
      // Enforce T[] over Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
    },
  },
]
