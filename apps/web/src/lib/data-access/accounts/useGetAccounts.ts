import { queryOptions, useQuery } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchAccounts = async (
  includeArchived = false
): Promise<Account[]> => {
  const qs = includeArchived ? '?include=archived' : '';
  const r = await apiFetch<{ data: Account[] }>(`/api/accounts${qs}`);
  return r.data;
};

export const accountsQueryKey = (
  access: ActiveHouseholdAccess,
  includeArchived = false
) => householdQueryKey(access, 'accounts', { includeArchived });

export const accountsQueryOptions = (
  access: ActiveHouseholdAccess,
  includeArchived = false
) =>
  queryOptions({
    queryKey: accountsQueryKey(access, includeArchived),
    queryFn: () => fetchAccounts(includeArchived),
  });

export const useGetAccounts = (
  includeArchived = false
): UseQueryResult<Account[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery(accountsQueryOptions(access, includeArchived));
};
