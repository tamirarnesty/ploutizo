import { useQueryClient } from '@tanstack/react-query';
import { accountSchema, dataEnvelope } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { invalidateImportTargetsQuery } from '@/lib/data-access/imports/invalidateImportTargetsQuery';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
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
  const r = await apiFetch(`/api/accounts/${id}`, dataEnvelope(accountSchema), {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useUpdateAccount = (id: string) => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: UpdateAccountBody) => updateAccount(id, body),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({
        queryKey: ['account-members', id],
      });
      invalidateImportTargetsQuery(qc);
    },
  });
};
