import { accountSchema, dataEnvelope } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { invalidateImportTargetsQuery } from '@/lib/data-access/imports/invalidateImportTargetsQuery';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
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

export const useUpdateAccount = (id: string) =>
  useInvalidatingMutation(
    (body: UpdateAccountBody) => updateAccount(id, body),
    [['accounts'], ['account-members', id], invalidateImportTargetsQuery]
  );
