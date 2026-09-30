import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { accountSchema, dataEnvelope } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchAccounts = async (
  includeArchived = false,
  signal?: AbortSignal
): Promise<Account[]> => {
  const qs = includeArchived ? '?include=archived' : '';
  const r = await apiFetch(
    `/api/accounts${qs}`,
    dataEnvelope(z.array(accountSchema)),
    { signal }
  );
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
