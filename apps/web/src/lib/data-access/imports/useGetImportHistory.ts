import { useQuery } from '@tanstack/react-query';
import type { ImportHistoryItem } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import { importHistoryQueryKey } from './queryKeys';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchImportHistory = async (): Promise<ImportHistoryItem[]> => {
  const r = await apiFetch<{
    data: ImportHistoryItem[];
    nextCursor: string | null;
  }>('/api/imports/history');
  return r.data;
};

export const useGetImportHistory = (): UseQueryResult<ImportHistoryItem[]> =>
  useQuery({
    queryKey: importHistoryQueryKey,
    queryFn: fetchImportHistory,
  });
