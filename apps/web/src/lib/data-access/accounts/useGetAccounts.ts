import { queryOptions, useQuery } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchAccounts = async (
  includeArchived = false
): Promise<Account[]> => {
  const qs = includeArchived ? '?include=archived' : '';
  const r = await apiFetch<{ data: Account[] }>(`/api/accounts${qs}`);
  return r.data;
};

export const accountsQueryKey = (includeArchived = false) =>
  ['accounts', { includeArchived }] as const;

export const accountsQueryOptions = (includeArchived = false) =>
  queryOptions({
    queryKey: accountsQueryKey(includeArchived),
    queryFn: () => fetchAccounts(includeArchived),
  });

export const useGetAccounts = (
  includeArchived = false
): UseQueryResult<Account[]> => {
  return useQuery(accountsQueryOptions(includeArchived));
};
