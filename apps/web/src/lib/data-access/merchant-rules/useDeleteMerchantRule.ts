import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export const deleteMerchantRule = async (id: string): Promise<undefined> => {
  return apiFetch<undefined>(`/api/merchant-rules/${id}`, { method: 'DELETE' });
};

export const useDeleteMerchantRule = () => {
  const qc = useQueryClient();
  return useMutation({
    // Use apiFetch (not raw fetch) so Clerk bearer token is injected automatically
    mutationFn: deleteMerchantRule,
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  });
};
