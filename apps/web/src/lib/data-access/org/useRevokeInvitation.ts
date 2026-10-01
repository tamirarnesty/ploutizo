import { useQueryClient } from '@tanstack/react-query';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';

export const useRevokeInvitation = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (invitationId: string) =>
      apiSend(`/api/households/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: ['invitations'],
      }),
  });
};
