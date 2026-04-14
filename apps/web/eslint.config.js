//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      // Forbid file extensions on relative imports — use bare specifiers (e.g. './foo', not './foo.js')
      // Exception: TanStack Router auto-generates routeTree.gen — the .gen extension is intentional
      'import/extensions': ['error', 'never', { ignorePackages: true, pattern: { gen: 'always' } }],
      // Enforce T[] over Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
    },
  },
]
