import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

export const useRevokeInvitation = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch(`/api/households/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'org-invitations'),
      }),
  });
};
