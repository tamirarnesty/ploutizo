import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/queryClient'

export interface Category {
  id: string
  orgId: string
  name: string
  icon: string | null
  colour: string | null
  sortOrder: number
  archivedAt: string | null
  createdAt: string
}

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<{ data: Category[] }>('/api/categories').then((r) => r.data),
  })

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; icon?: string; colour?: string }) =>
      apiFetch<{ data: Category }>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useUpdateCategory = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name?: string; icon?: string; colour?: string }) =>
      apiFetch<{ data: Category }>(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useArchiveCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: Category }>(`/api/categories/${id}/archive`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useReorderCategories = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch<{ data: { ok: boolean } }>('/api/categories/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
