import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export const useInviteMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/api/households/invitations', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['org-members'] }),
  });
};
