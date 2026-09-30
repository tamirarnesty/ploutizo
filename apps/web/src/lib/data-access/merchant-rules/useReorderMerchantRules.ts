import type { MerchantRule } from '@ploutizo/validators';
import { reorderByIds } from '@/lib/reorderByIds';
import { apiSend } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';

export const reorderMerchantRules = (orderedIds: string[]): Promise<void> =>
  apiSend('/api/merchant-rules/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  });

export const useReorderMerchantRules = () => {
  return useOptimisticListMutation<MerchantRule, string[], void>({
    queryKey: ['merchant-rules'],
    mutationFn: reorderMerchantRules,
    updateCache: (items, orderedIds) => reorderByIds(items, orderedIds),
  });
};
