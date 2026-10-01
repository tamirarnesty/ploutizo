import { useQueryClient } from '@tanstack/react-query';
import { accountSchema, dataEnvelope } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { invalidateImportTargetsQuery } from '@/lib/data-access/imports/invalidateImportTargetsQuery';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
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
  const r = await apiFetch('/api/accounts', dataEnvelope(accountSchema), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateAccount = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: createAccount,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      invalidateImportTargetsQuery(qc);
    },
  });
};
