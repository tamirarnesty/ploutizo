import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export const useRemoveMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/api/households/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['org-members'] }),
  });
};
