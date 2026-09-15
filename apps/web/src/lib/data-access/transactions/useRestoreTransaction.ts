import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

export const useRestoreTransaction = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/transactions/${id}/restore`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'transactions'),
      });
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'settlements'),
      });
    },
  });
};
