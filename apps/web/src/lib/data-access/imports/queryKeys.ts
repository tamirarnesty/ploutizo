export const importTargetsQueryKey = () => ['imports', 'targets'];

export const activeImportDraftsQueryKey = () => ['imports', 'drafts'];

export const importHistoryQueryKey = () => ['imports', 'history'];

export const importHistoryPageQueryKey = (limit: number) => [
  'imports',
  'history',
  'page',
  limit,
];

export const importHistoryInfiniteQueryKey = (limit: number) => [
  'imports',
  'history',
  'infinite',
  limit,
];

export const importDraftQueryKey = (id: string | null) => [
  'imports',
  'draft',
  id,
];

export const importPreparedQueryKey = (id: string) => [
  'imports',
  'prepared',
  id,
];
