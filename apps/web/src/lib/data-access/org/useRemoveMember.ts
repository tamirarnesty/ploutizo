import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/api/households/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: ['members'],
      }),
  });
};
