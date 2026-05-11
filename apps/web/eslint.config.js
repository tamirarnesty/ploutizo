//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"
import importPlugin from "eslint-plugin-import-x"
import tseslint from "typescript-eslint"

export default [
  { ignores: ['.output/**', 'dist/**', '.vinxi/**'] },
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
      // Enforce import order: 1) third-party 2) @ploutizo/* workspace 3) @/ absolute 4) relative
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          { pattern: '@ploutizo/**', group: 'internal', position: 'before' },
          { pattern: '@/**', group: 'internal', position: 'after' },
        ],
        pathGroupsExcludedImportTypes: ['builtin', 'external', 'object'],
      }],
      // Prefer const arrow functions over function declarations
      'func-style': ['error', 'expression'],
    },
  },
]
