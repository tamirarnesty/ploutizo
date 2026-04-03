import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Category } from "./useGetCategories"
import { apiFetch } from "@/lib/queryClient"

export const archiveCategory = async (id: string): Promise<Category> => {
  const r = await apiFetch<{ data: Category }>(`/api/categories/${id}/archive`, {
    method: "DELETE",
  })
  return r.data
}

export const useArchiveCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: archiveCategory,
    onSettled: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}
