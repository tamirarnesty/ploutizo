import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ImportHistoryPage } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import {
  importHistoryInfiniteQueryKey,
  importHistoryPageQueryKey,
} from './queryKeys';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query';

export const IMPORT_HUB_HISTORY_LIMIT = 5;
export const IMPORT_HISTORY_PAGE_SIZE = 20;

export const fetchImportHistoryPage = async (input: {
  limit: number;
  cursor?: string;
}): Promise<ImportHistoryPage> => {
  const qs = new URLSearchParams();
  qs.set('limit', String(input.limit));
  if (input.cursor) qs.set('cursor', input.cursor);
  return apiFetch<ImportHistoryPage>(`/api/imports/history?${qs.toString()}`);
};

export const useGetImportHistory = (
  limit = IMPORT_HUB_HISTORY_LIMIT
): UseQueryResult<ImportHistoryPage> =>
  useQuery({
    queryKey: importHistoryPageQueryKey(limit),
    queryFn: () => fetchImportHistoryPage({ limit }),
  });

export const useGetImportHistoryInfinite = (
  limit = IMPORT_HISTORY_PAGE_SIZE
): UseInfiniteQueryResult<InfiniteData<ImportHistoryPage>, Error> =>
  useInfiniteQuery({
    queryKey: importHistoryInfiniteQueryKey(limit),
    queryFn: ({ pageParam }) =>
      fetchImportHistoryPage({
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
