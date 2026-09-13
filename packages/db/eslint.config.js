// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import importPlugin from 'eslint-plugin-import-x';

export default [
  {
    ignores: ['eslint.config.js', 'vitest.config.ts', 'drizzle/**'],
  },
  ...tanstackConfig,
  {
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // Forbid file extensions on imports — use bare specifiers (e.g. '@/foo', not '@/foo.ts')
      'import/extensions': ['error', 'never', { ignorePackages: true }],
      // Enforce T[] over Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // Enforce import order: 1) third-party 2) @ploutizo/* 3) @/ absolute 4) relative
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
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external', 'object'],
        },
      ],
      // Prefer const arrow functions over function declarations
      'func-style': ['error', 'expression'],
    },
  },
  {
    files: ['scripts/**/*.ts', 'src/__tests__/**/*.ts'],
    rules: {
      // Prefer @/ over parent-relative imports in scripts and tests
      'import/no-relative-parent-imports': 'error',
    },
  },
];
