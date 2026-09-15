import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

interface CreateAccountBody {
  name: string;
  type: string;
  institutionId?: string | null;
  lastFour?: string;
  statementDueDay?: number | null;
  memberIds: string[];
}

export const createAccount = async (
  body: CreateAccountBody
): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateAccount = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSettled: () =>
      qc.invalidateQueries({ queryKey: householdQueryKey(access, 'accounts') }),
  });
};
