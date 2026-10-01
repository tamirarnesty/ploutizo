import { useQueryClient } from '@tanstack/react-query';
import { dataEnvelope, merchantRuleSchema } from '@ploutizo/validators';
import type { MerchantRule } from '@ploutizo/validators';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';

type UpdateMerchantRuleBody = Partial<{
  pattern: string;
  matchType: string;
  renameTo: string | null;
  categoryId: string | null;
  priority: number;
}>;

export const updateMerchantRule = async (
  id: string,
  body: UpdateMerchantRuleBody
): Promise<MerchantRule> => {
  const r = await apiFetch(
    `/api/merchant-rules/${id}`,
    dataEnvelope(merchantRuleSchema),
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
  return r.data;
};

export const useUpdateMerchantRule = (id: string) => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: UpdateMerchantRuleBody) => updateMerchantRule(id, body),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['merchant-rules'],
      }),
  });
};
