import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export const useRevokeInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch(`/api/households/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: ['org-invitations'] }),
  });
};
