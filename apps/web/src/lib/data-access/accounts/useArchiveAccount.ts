import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { Account } from '@ploutizo/types';

export const archiveAccount = async (id: string): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>(`/api/accounts/${id}/archive`, {
    method: 'DELETE',
  });
  return r.data;
};

export const useArchiveAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveAccount,
    onSettled: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
};
