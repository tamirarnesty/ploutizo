import { useQueryClient } from '@tanstack/react-query';
import type { Account } from '@ploutizo/types';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

export const archiveAccount = async (id: string): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>(`/api/accounts/${id}/archive`, {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveAccount = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: archiveAccount,
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};
