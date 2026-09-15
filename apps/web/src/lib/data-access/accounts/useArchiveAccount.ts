import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

export const archiveAccount = async (id: string): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>(`/api/accounts/${id}/archive`, {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveAccount = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveAccount,
    onSettled: () =>
      qc.invalidateQueries({ queryKey: householdQueryKey(access, 'accounts') }),
  });
};
