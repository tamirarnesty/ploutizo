import { queryOptions, useInfiniteQuery } from '@tanstack/react-query';
import type { ImportHistoryPage } from '@ploutizo/types';
import { useAccess } from '@/lib/access';
import {
  isHouseholdAccessReady,
  useHouseholdQuery,
} from '@/lib/data-access/useHouseholdQuery';
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

export const fetchImportHistoryPage = async (
  input: {
    limit: number;
    cursor?: string;
  },
  signal?: AbortSignal
): Promise<ImportHistoryPage> => {
  const qs = new URLSearchParams();
  qs.set('limit', String(input.limit));
  if (input.cursor) qs.set('cursor', input.cursor);
  return apiFetch<ImportHistoryPage>(`/api/imports/history?${qs.toString()}`, {
    signal,
  });
};

export const importHistoryPageQueryOptions = (
  limit = IMPORT_HUB_HISTORY_LIMIT
) =>
  queryOptions({
    queryKey: importHistoryPageQueryKey(limit),
    queryFn: ({ signal }) => fetchImportHistoryPage({ limit }, signal),
  });

export const useGetImportHistory = (
  limit = IMPORT_HUB_HISTORY_LIMIT
): UseQueryResult<ImportHistoryPage> => {
  return useHouseholdQuery(importHistoryPageQueryOptions(limit));
};

export const useGetImportHistoryInfinite = (
  limit = IMPORT_HISTORY_PAGE_SIZE
): UseInfiniteQueryResult<InfiniteData<ImportHistoryPage>, Error> => {
  const { isReady, access } = useAccess();
  const householdReady = isHouseholdAccessReady(isReady, access);
  return useInfiniteQuery({
    queryKey: importHistoryInfiniteQueryKey(limit),
    queryFn: ({ signal, pageParam }) =>
      fetchImportHistoryPage(
        {
          limit,
          cursor: pageParam,
        },
        signal
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: householdReady,
  });
};
