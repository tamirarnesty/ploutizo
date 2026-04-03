import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { MerchantRule } from "./useGetMerchantRules"
import { apiFetch } from "@/lib/queryClient"

type UpdateMerchantRuleBody = Partial<{
  pattern: string
  matchType: string
  renameTo: string | null
  categoryId: string | null
  priority: number
}>

export const updateMerchantRule = async (id: string, body: UpdateMerchantRuleBody): Promise<MerchantRule> => {
  const r = await apiFetch<{ data: MerchantRule }>(`/api/merchant-rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return r.data
}

export const useUpdateMerchantRule = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMerchantRuleBody) => updateMerchantRule(id, body),
    onSettled: () => qc.invalidateQueries({ queryKey: ["merchant-rules"] }),
  })
}
