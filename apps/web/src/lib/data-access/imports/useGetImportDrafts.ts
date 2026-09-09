import { useQuery } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import { activeImportDraftsQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchActiveImportDrafts = async (): Promise<
  ImportDraftSummary[]
> => {
  const r = await apiFetch<{ data: ImportDraftSummary[] }>(
    '/api/imports/drafts'
  );
  return r.data;
};

export const useGetImportDrafts = (): UseQueryResult<ImportDraftSummary[]> =>
  useQuery({
    queryKey: activeImportDraftsQueryKey,
    queryFn: fetchActiveImportDrafts,
  });
