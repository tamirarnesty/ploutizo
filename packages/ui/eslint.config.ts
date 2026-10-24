import { tanstackConfig } from '@tanstack/eslint-config';

import { reactDoctorRecommended } from '../../eslint/react-doctor.js';

export default [
  {
    ignores: ['eslint.config.ts', 'vitest.config.ts'],
  },
  ...tanstackConfig,
  reactDoctorRecommended,
  {
    rules: {
      'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
      'import/extensions': ['error', 'never'],
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
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
      'func-style': ['error', 'expression'],
    },
  },
  {
    files: ['src/components/reui/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/array-type': 'off',
      'import/no-duplicates': 'off',
      'import/consistent-type-specifier-style': 'off',
      'no-shadow': 'off',
      'func-style': 'off',
    },
  },
  {
    files: ['src/components/reui/**/*.tsx'],
    ignores: ['src/components/reui/data-grid/**'],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'react-doctor/effect-needs-cleanup': 'off',
      'react-doctor/no-effect-with-fresh-deps': 'off',
      'react-doctor/no-ref-current-in-render': 'off',
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
