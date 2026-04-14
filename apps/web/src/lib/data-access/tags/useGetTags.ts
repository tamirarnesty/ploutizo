import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"
import { apiFetch } from "@/lib/queryClient"

export interface Tag {
  id: string
  orgId: string
  name: string
  colour: string | null
  archivedAt: string | null
  createdAt: string
}

export const fetchTags = async (): Promise<Tag[]> => {
  const r = await apiFetch<{ data: Tag[] }>("/api/tags")
  return r.data
}

export const useGetTags = (): UseQueryResult<Tag[]> => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  })
}
