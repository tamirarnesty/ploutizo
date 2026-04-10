// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  { ignores: ['eslint.config.js', 'tsup.config.ts', 'vitest.config.ts'] },
  ...tanstackConfig,
  {
    rules: {
      // Forbid file extensions on relative imports — use bare specifiers (e.g. './foo', not './foo.js')
      'import/extensions': ['error', 'never'],
    },
  },
]
