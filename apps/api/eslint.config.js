// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  { ignores: ['eslint.config.js', 'tsup.config.ts', 'vitest.config.ts'] },
  ...tanstackConfig,
  {
    rules: {
      // Forbid file extensions on relative imports — use bare specifiers (e.g. './foo', not './foo.js')
      'import/extensions': ['error', 'never'],
      // Enforce T[] over Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // Enforce import order: 1) third-party 2) @ploutizo/* workspace 3) relative
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          { pattern: '@ploutizo/**', group: 'internal', position: 'before' },
        ],
        pathGroupsExcludedImportTypes: ['builtin', 'external', 'object', 'type'],
      }],
      // Prefer const arrow functions over function declarations
      'func-style': ['error', 'expression'],
    },
  },
]
