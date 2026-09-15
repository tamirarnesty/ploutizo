import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';

export const useRemoveMember = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/api/households/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'members'),
      }),
  });
};
