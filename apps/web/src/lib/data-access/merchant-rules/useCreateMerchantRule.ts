import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MerchantRule } from './useGetMerchantRules';
import { apiFetch } from '@/lib/queryClient';

interface CreateMerchantRuleBody {
  pattern: string;
  matchType: string;
  renameTo?: string;
  categoryId?: string | null;
  priority?: number;
}

export const createMerchantRule = async (
  body: CreateMerchantRuleBody
): Promise<MerchantRule> => {
  const r = await apiFetch<{ data: MerchantRule }>('/api/merchant-rules', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.data;
};

export const useCreateMerchantRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMerchantRule,
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  });
};
