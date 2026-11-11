//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config';
import testingLibrary from 'eslint-plugin-testing-library';

import ploutizo from '../../eslint/compound-composition.js';
import {
  reactDoctorRecommended,
  reactDoctorTanstackQuery,
  reactDoctorTanstackStart,
} from '../../eslint/react-doctor.js';

const primitiveImportBan = {
  group: ['@base-ui/react', '@base-ui/react/*', '@radix-ui/*'],
  message:
    'Import UI primitives from @ploutizo/ui, not @base-ui/react or @radix-ui.',
};

const overlayImportBan = [
  {
    name: '@ploutizo/ui/components/dialog',
    importNames: ['Dialog', 'DialogContent', 'DialogTitle'],
    message:
      'Use AppDialog from @/components/overlays/AppDialog so the dialog has a required title.',
  },
  {
    name: '@ploutizo/ui/components/sheet',
    importNames: ['Sheet', 'SheetContent', 'SheetTitle'],
    message:
      'Use AppSheet from @/components/overlays/AppSheet so the sheet has a required title.',
  },
];

const clerkImportBan = [
  {
    name: '@clerk/tanstack-react-start',
    importNames: ['auth'],
    message:
      'auth() is not isomorphic. Use getHouseholdBearer from lib/access.',
  },
  {
    name: '@clerk/tanstack-react-start/server',
    message:
      'Clerk server auth() is not isomorphic. Use getHouseholdBearer from lib/access.',
  },
];

export default [
  { ignores: ['.output/**', 'dist/**', '.vinxi/**'] },
  ...tanstackConfig,
  reactDoctorRecommended,
  reactDoctorTanstackStart,
  reactDoctorTanstackQuery,
  {
    plugins: { ploutizo },
    rules: {
      // Forbid file extensions on relative imports — use bare specifiers (e.g. './foo', not './foo.js')
      // Exception: TanStack Router auto-generates routeTree.gen — the .gen extension is intentional
      // Exception: TanStack Start server-only modules use the .server suffix
      'import/extensions': [
        'error',
        'never',
        { ignorePackages: true, pattern: { gen: 'always', server: 'always' } },
      ],
      // Enforce T[] over Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // Enforce import order: 1) third-party 2) @ploutizo/* workspace 3) @/ absolute 4) relative
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
      'ploutizo/compound-composition': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [...clerkImportBan, ...overlayImportBan],
          patterns: [primitiveImportBan],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/queryClient.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Do not call fetch() in apps/web. Use apiFetch or apiSend from lib/queryClient.ts.',
        },
      ],
    },
  },
  {
    files: ['src/start.ts', 'src/lib/access/resolve.server.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/lib/data-access/**/*.ts', 'src/lib/data-access/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              importNames: ['useQuery', 'useInfiniteQuery', 'useMutation'],
              message:
                'Use useHouseholdQuery, useHouseholdInfiniteQuery, or useHouseholdMutation from useHouseholdQuery.ts.',
            },
          ],
          patterns: [primitiveImportBan],
        },
      ],
    },
  },
  {
    files: ['src/lib/data-access/useHouseholdQuery.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: [
      'src/components/overlays/AppDialog.tsx',
      'src/components/overlays/AppSheet.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [primitiveImportBan],
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      // Official React config does not enable this; fireEvent can ignore
      // disabled / pointer-events, so in-flight click tests can lie.
      'testing-library/prefer-user-event': 'error',
    },
  },
  {
    files: ['eslint.config.js'],
    rules: {
      // Node ESM requires the .js extension for repo-root shared ESLint presets.
      'import/extensions': 'off',
    },
  },
];
