import { useQueryClient } from '@tanstack/react-query';
import { accountSchema, dataEnvelope } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { invalidateImportTargetsQuery } from '@/lib/data-access/imports/invalidateImportTargetsQuery';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

export const archiveAccount = async (id: string): Promise<Account> => {
  const r = await apiFetch(
    `/api/accounts/${id}/archive`,
    dataEnvelope(accountSchema),
    { method: 'DELETE' }
  );
  return r.data;
};

export const useArchiveAccount = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: archiveAccount,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      invalidateImportTargetsQuery(qc);
    },
  });
};
