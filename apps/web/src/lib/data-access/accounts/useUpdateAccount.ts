import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

interface UpdateAccountBody {
  name?: string;
  type?: string;
  institutionId?: string | null;
  lastFour?: string | null;
  statementDueDay?: number | null;
  memberIds?: string[];
}

export const updateAccount = async (
  id: string,
  body: UpdateAccountBody
): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>(`/api/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useUpdateAccount = (id: string) => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAccountBody) => updateAccount(id, body),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: householdQueryKey(access, 'accounts') });
      qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'account-members', id),
      });
    },
  });
};
