import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/queryClient.js'

export interface MerchantRule {
  id: string
  orgId: string
  pattern: string
  matchType: 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'regex'
  renameTo: string | null
  categoryId: string | null
  assigneeId: string | null
  priority: number
  createdAt: string
}

export const useMerchantRules = () =>
  useQuery({
    queryKey: ['merchant-rules'],
    queryFn: () =>
      apiFetch<{ data: MerchantRule[] }>('/api/merchant-rules').then((r) => r.data),
  })

export const useCreateMerchantRule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      pattern: string
      matchType: string
      renameTo?: string
      categoryId?: string | null
      priority?: number
    }) =>
      apiFetch<{ data: MerchantRule }>('/api/merchant-rules', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  })
}

export const useUpdateMerchantRule = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Partial<{
        pattern: string
        matchType: string
        renameTo: string | null
        categoryId: string | null
        priority: number
      }>,
    ) =>
      apiFetch<{ data: MerchantRule }>(`/api/merchant-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  })
}

export const useDeleteMerchantRule = () => {
  const qc = useQueryClient()
  return useMutation({
    // Use apiFetch (not raw fetch) so Clerk bearer token is injected automatically
    mutationFn: (id: string) =>
      apiFetch<undefined>(`/api/merchant-rules/${id}`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  })
}

export const useReorderMerchantRules = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch<{ data: { ok: boolean } }>('/api/merchant-rules/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['merchant-rules'] }),
  })
}
