import type { MerchantRule } from '@ploutizo/validators';
import { apiSend } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';

export const deleteMerchantRule = (id: string): Promise<void> =>
  apiSend(`/api/merchant-rules/${id}`, { method: 'DELETE' });

export const useDeleteMerchantRule = () => {
  return useOptimisticListMutation<MerchantRule, string, void>({
    queryKey: ['merchant-rules'],
    mutationFn: deleteMerchantRule,
    updateCache: (items, id) => items.filter((r) => r.id !== id),
  });
};
