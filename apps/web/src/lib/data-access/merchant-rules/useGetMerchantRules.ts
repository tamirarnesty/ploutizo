import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { dataEnvelope, merchantRuleSchema } from '@ploutizo/validators';
import type { MerchantRule } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { UseQueryResult } from '@tanstack/react-query';

export const fetchMerchantRules = async (
  signal?: AbortSignal
): Promise<MerchantRule[]> => {
  const r = await apiFetch(
    '/api/merchant-rules',
    dataEnvelope(z.array(merchantRuleSchema)),
    { signal }
  );
  return r.data;
};

export const merchantRulesQueryOptions = queryOptions({
  queryKey: ['merchant-rules'],
  queryFn: ({ signal }) => fetchMerchantRules(signal),
});

export const useGetMerchantRules = (): UseQueryResult<MerchantRule[]> => {
  return useHouseholdQuery(merchantRulesQueryOptions);
};
