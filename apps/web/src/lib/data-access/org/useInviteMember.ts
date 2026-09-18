import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

export const useInviteMember = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (email: string) =>
      apiFetch('/api/households/invitations', {
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
