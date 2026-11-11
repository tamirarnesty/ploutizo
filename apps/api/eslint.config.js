// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';

const orgScopeEqSelector =
  "CallExpression[callee.name='eq'] > MemberExpression.arguments[0][property.name=/^(orgId|organizationId)$/]";

/** Pre-existing eq(table.orgId) call sites. New query modules must use scope.ts builders (ADR 0003). */
const preexistingOrgEqFiles = [
  'src/lib/queries/accounts.ts',
  'src/lib/queries/households.ts',
  'src/lib/queries/import-match-targets.ts',
  'src/lib/queries/import-refund-targets.ts',
  'src/lib/queries/imports.ts',
  'src/lib/queries/merchant-rules.ts',
  'src/lib/queries/settlements.ts',
  'src/lib/queries/tags.ts',
  'src/lib/queries/transactionListSearch.ts',
  'src/lib/queries/transactions.ts',
  'src/services/clerkDbMirror.ts',
];

export default [
  {
    ignores: [
      'eslint.config.js',
      'tsup.config.ts',
      'vitest.config.ts',
      'scripts/**',
    ],
  },
  ...tanstackConfig,
  {
    rules: {
      // Forbid file extensions on relative imports — use bare specifiers (e.g. './foo', not './foo.js')
      'import/extensions': ['error', 'never'],
      // Enforce T[] over Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // Enforce import order: 1) third-party 2) @ploutizo/* workspace 3) relative
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            { pattern: '@ploutizo/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external', 'object'],
        },
      ],
      // Prefer const arrow functions over function declarations
      'func-style': ['error', 'expression'],
      'no-restricted-syntax': [
        'error',
        {
          selector: orgScopeEqSelector,
          message:
            'Do not write eq(table.orgId, …) here. Use a builder from apps/api/src/lib/queries/scope.ts (ADR 0003).',
        },
      ],
    },
  },
  {
    files: ['src/lib/queries/scope.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: preexistingOrgEqFiles,
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.ts', 'src/__tests__/**/*.ts'],
    rules: {
      // Integration tests use eq(table.orgId) for fixture setup and teardown.
      'no-restricted-syntax': 'off',
    },
  },
];
