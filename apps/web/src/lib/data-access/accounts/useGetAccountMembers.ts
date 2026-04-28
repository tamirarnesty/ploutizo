import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AccountMember } from '@ploutizo/types';
import { apiFetch } from '@/lib/queryClient';

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
  return useQuery({
    queryKey: ['account-members', accountId],
    queryFn: () => fetchAccountMembers(accountId as string),
    enabled: accountId !== null,
  });
};
