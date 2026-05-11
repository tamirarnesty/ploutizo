import { tanstackConfig } from '@tanstack/eslint-config';

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
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
          pathGroupsExcludedImportTypes: [
            'builtin',
            'external',
            'object',
            'type',
          ],
        },
      ],
      // Prefer const arrow functions over function declarations
      'func-style': ['error', 'expression'],
    },
  },
  {
    // ReUI components are third-party vendor files — suppress rules that
    // require invasive changes to code we don't own.
    files: ['src/components/reui/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/array-type': 'off',
      'import/no-duplicates': 'off',
      'import/consistent-type-specifier-style': 'off',
      'no-shadow': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'func-style': 'off',
    },
  },
  {
    // shadcn-generated components — do not modify, suppress func-style.
    files: ['src/components/*.tsx'],
    rules: {
      'func-style': 'off',
    },
  },
];
