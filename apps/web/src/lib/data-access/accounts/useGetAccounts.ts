import { queryOptions } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchAccounts = async (
  includeArchived = false,
  signal?: AbortSignal
): Promise<Account[]> => {
  const qs = includeArchived ? '?include=archived' : '';
  const r = await apiFetch<{ data: Account[] }>(`/api/accounts${qs}`, {
    signal,
  });
  return r.data;
};

export const accountsQueryKey = (includeArchived = false) => [
  'accounts',
  { includeArchived },
];

export const accountsQueryOptions = (includeArchived = false) =>
  queryOptions({
    queryKey: accountsQueryKey(includeArchived),
    queryFn: ({ signal }) => fetchAccounts(includeArchived, signal),
  });

export const useGetAccounts = (
  includeArchived = false
): UseQueryResult<Account[]> => {
  return useHouseholdQuery(accountsQueryOptions(includeArchived));
};
