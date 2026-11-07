import { accountSchema, dataEnvelope } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { invalidateImportTargetsQuery } from '@/lib/data-access/imports/invalidateImportTargetsQuery';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiFetch } from '@/lib/queryClient';

export const archiveAccount = async (id: string): Promise<Account> => {
  const r = await apiFetch(
    `/api/accounts/${id}/archive`,
    dataEnvelope(accountSchema),
    { method: 'DELETE' }
  );
  return r.data;
};

export const useArchiveAccount = () =>
  useInvalidatingMutation(archiveAccount, [
    ['accounts'],
    invalidateImportTargetsQuery,
  ]);
