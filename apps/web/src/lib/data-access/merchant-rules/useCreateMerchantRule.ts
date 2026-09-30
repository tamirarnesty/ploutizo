import { useQueryClient } from '@tanstack/react-query';
import { dataEnvelope, merchantRuleSchema } from '@ploutizo/validators';
import type { MerchantRule } from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
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
  const r = await apiFetch(
    '/api/merchant-rules',
    dataEnvelope(merchantRuleSchema),
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
  return r.data;
};

export const useCreateMerchantRule = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: createMerchantRule,
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['merchant-rules'],
      }),
  });
};
