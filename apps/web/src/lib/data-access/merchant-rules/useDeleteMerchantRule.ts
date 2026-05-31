import { apiFetch } from '@/lib/queryClient';
import { useOptimisticListMutation } from '../optimisticListMutation';
import type { MerchantRule } from './useGetMerchantRules';

export const deleteMerchantRule = async (id: string): Promise<undefined> => {
  return apiFetch<undefined>(`/api/merchant-rules/${id}`, { method: 'DELETE' });
};

export const useDeleteMerchantRule = () =>
  useOptimisticListMutation<MerchantRule, string, undefined>({
    queryKey: ['merchant-rules'],
    mutationFn: deleteMerchantRule,
    updateCache: (items, id) => items.filter((r) => r.id !== id),
  });
