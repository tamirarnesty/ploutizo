import { useQuery } from '@tanstack/react-query';
import type { AccountMember } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchAccountMembers = async (
  accountId: string
): Promise<AccountMember[]> => {
  const r = await apiFetch<{ data: AccountMember[] }>(
    `/api/accounts/${accountId}/members`
  );
  return r.data;
};

export const useGetAccountMembers = (
  accountId: string | null
): UseQueryResult<AccountMember[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery({
    queryKey: householdQueryKey(access, 'account-members', accountId),
    queryFn: () => fetchAccountMembers(accountId as string),
    enabled: accountId !== null,
  });
};
