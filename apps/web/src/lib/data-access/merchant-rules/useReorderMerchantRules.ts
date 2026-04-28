import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';

export const reorderMerchantRules = async (
  orderedIds: string[]
): Promise<{ ok: boolean }> => {
  const r = await apiFetch<{ data: { ok: boolean } }>(
    '/api/merchant-rules/reorder',
    {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    }
  );
  return r.data;
};

export const useReorderMerchantRules = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderMerchantRules,
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  });
};
