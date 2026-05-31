import { reorderByIds } from '@/lib/reorderByIds';
import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
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

export const useReorderMerchantRules = () =>
  useOptimisticListMutation<MerchantRule, string[], { ok: boolean }>({
    queryKey: ['merchant-rules'],
    mutationFn: reorderMerchantRules,
    updateCache: (items, orderedIds) => reorderByIds(items, orderedIds),
  });
