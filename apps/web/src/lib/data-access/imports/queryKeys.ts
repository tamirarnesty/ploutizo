export const importTargetsQueryKey = ['imports', 'targets'] as const;

export const activeImportDraftsQueryKey = ['imports', 'drafts'] as const;

export const importHistoryQueryKey = ['imports', 'history'] as const;

export const importDraftQueryKey = (id: string | null) =>
  ['imports', 'draft', id] as const;
