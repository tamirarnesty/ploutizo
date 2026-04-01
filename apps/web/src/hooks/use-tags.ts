import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/queryClient'

export interface Tag {
  id: string
  orgId: string
  name: string
  colour: string | null
  archivedAt: string | null
  createdAt: string
}

export const useTags = () =>
  useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<{ data: Tag[] }>('/api/tags').then((r) => r.data),
  })

export const useCreateTag = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; colour?: string }) =>
      apiFetch<{ data: Tag }>('/api/tags', { method: 'POST', body: JSON.stringify(body) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

export const useArchiveTag = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: Tag }>(`/api/tags/${id}/archive`, { method: 'DELETE' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}
