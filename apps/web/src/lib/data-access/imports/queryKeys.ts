export const importTargetsQueryKey = ['imports', 'targets'] as const;

export const activeImportDraftsQueryKeyRoot = ['imports', 'drafts'] as const;

export const activeImportDraftsQueryKey = (orgId: string) =>
  [...activeImportDraftsQueryKeyRoot, orgId] as const;

export const importHistoryQueryKey = ['imports', 'history'] as const;

export const importHistoryPageQueryKey = (limit: number) =>
  [...importHistoryQueryKey, 'page', limit] as const;

export const importHistoryInfiniteQueryKey = (limit: number) =>
  [...importHistoryQueryKey, 'infinite', limit] as const;

export const importDraftQueryKey = (id: string | null) =>
  ['imports', 'draft', id] as const;

export const importPreparedQueryKey = (id: string) =>
  ['imports', 'prepared', id] as const;
