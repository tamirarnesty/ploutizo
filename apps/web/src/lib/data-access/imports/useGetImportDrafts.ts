import { useQuery } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const activeImportDraftsQueryKey = ['imports', 'drafts'] as const;
export const importHistoryQueryKey = ['imports', 'history'] as const;

export const fetchActiveImportDrafts = async (): Promise<
  ImportDraftSummary[]
> => {
  const r = await apiFetch<{ data: ImportDraftSummary[] }>(
    '/api/imports/drafts'
  );
  return r.data;
};

export const fetchImportHistory = async (): Promise<ImportDraftSummary[]> => {
  const r = await apiFetch<{ data: ImportDraftSummary[] }>(
    '/api/imports/history'
  );
  return r.data;
};

export const useGetImportDrafts = (): UseQueryResult<ImportDraftSummary[]> =>
  useQuery({
    queryKey: activeImportDraftsQueryKey,
    queryFn: fetchActiveImportDrafts,
  });

export const useGetImportHistory = (): UseQueryResult<ImportDraftSummary[]> =>
  useQuery({
    queryKey: importHistoryQueryKey,
    queryFn: fetchImportHistory,
  });
