import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

export const useRestoreTransaction = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/transactions/${id}/restore`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      void qc.invalidateQueries({
        queryKey: ['transactions'],
      });
      void qc.invalidateQueries({
        queryKey: ['settlements'],
      });
    },
  });
};
