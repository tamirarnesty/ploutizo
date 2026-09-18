import type { AccountMember } from '@ploutizo/types';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchAccountMembers = async (
  accountId: string,
  signal?: AbortSignal
): Promise<AccountMember[]> => {
  const r = await apiFetch<{ data: AccountMember[] }>(
    `/api/accounts/${accountId}/members`,
    { signal }
  );
  return r.data;
};

export const useGetAccountMembers = (
  accountId: string | null
): UseQueryResult<AccountMember[]> => {
  return useHouseholdQuery({
    queryKey: ['account-members', accountId],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchAccountMembers(accountId as string, signal),
    enabled: accountId !== null,
  });
};
