import { dataEnvelope, merchantRuleSchema } from '@ploutizo/validators';
import type { MerchantRule } from '@ploutizo/validators';
import { useInvalidatingMutation } from '@/lib/data-access/useInvalidatingMutation';
import { apiFetch } from '@/lib/queryClient';
import { merchantRulesQueryKey } from './useGetMerchantRules';

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

export const useUpdateMerchantRule = (id: string) =>
  useInvalidatingMutation(
    (body: UpdateMerchantRuleBody) => updateMerchantRule(id, body),
    [merchantRulesQueryKey]
  );
