import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderByIds } from '@/lib/reorderByIds';
import { apiFetch } from '@/lib/queryClient';
import type { MerchantRule } from './useGetMerchantRules';

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
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['merchant-rules'] });
      const previous = qc.getQueryData<MerchantRule[]>(['merchant-rules']);
      if (previous) {
        qc.setQueryData(['merchant-rules'], reorderByIds(previous, orderedIds));
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        qc.setQueryData(['merchant-rules'], context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['merchant-rules'] });
    },
  });
};
