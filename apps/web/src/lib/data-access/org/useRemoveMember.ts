import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';

export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (memberId: string) =>
      apiSend(`/api/households/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: ['members'],
      }),
  });
};
