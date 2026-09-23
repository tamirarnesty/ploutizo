export const importTargetsQueryKey = ['imports', 'targets'] as const;

export const activeImportDraftsQueryKey = ['imports', 'drafts'] as const;

export const importHistoryQueryKey = ['imports', 'history'] as const;

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
