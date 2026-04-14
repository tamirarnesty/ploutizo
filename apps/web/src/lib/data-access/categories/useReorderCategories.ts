import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/queryClient"

export const reorderCategories = async (orderedIds: string[]): Promise<{ ok: boolean }> => {
  const r = await apiFetch<{ data: { ok: boolean } }>("/api/categories/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  })
  return r.data
}

export const useReorderCategories = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderCategories,
    onSettled: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  })
}
