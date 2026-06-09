import { useQuery } from '@tanstack/react-query';
import type { ImportDraftSummary } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import { importHistoryQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportHistory = async (): Promise<ImportDraftSummary[]> => {
  const r = await apiFetch<{ data: ImportDraftSummary[] }>(
    '/api/imports/history'
  );
  return r.data;
};

export const useGetImportHistory = (): UseQueryResult<ImportDraftSummary[]> =>
  useQuery({
    queryKey: importHistoryQueryKey,
    queryFn: fetchImportHistory,
  });
