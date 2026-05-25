import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export const useRestoreTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/transactions/${id}/restore`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
};
