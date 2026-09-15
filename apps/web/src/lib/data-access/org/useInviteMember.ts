import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

export const useInviteMember = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/api/households/invitations', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSettled: () => {
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'org-members'),
      });
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'org-invitations'),
      });
    },
  });
};
