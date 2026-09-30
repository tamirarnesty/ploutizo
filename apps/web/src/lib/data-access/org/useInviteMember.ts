import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';

export const useInviteMember = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (email: string) =>
      apiSend('/api/households/invitations', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSettled: () => {
      void qc.invalidateQueries({
        queryKey: ['members'],
      });
      void qc.invalidateQueries({
        queryKey: ['invitations'],
      });
    },
  });
};
