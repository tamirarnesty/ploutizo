import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { MerchantRule } from './useGetMerchantRules';

export const deleteMerchantRule = async (id: string): Promise<undefined> => {
  return apiFetch<undefined>(`/api/merchant-rules/${id}`, { method: 'DELETE' });
};

export const useDeleteMerchantRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMerchantRule,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['merchant-rules'] });
      const previous = qc.getQueryData<MerchantRule[]>(['merchant-rules']);
      if (previous) {
        qc.setQueryData(
          ['merchant-rules'],
          previous.filter((r) => r.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(['merchant-rules'], context.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['merchant-rules'] });
    },
  });
};
