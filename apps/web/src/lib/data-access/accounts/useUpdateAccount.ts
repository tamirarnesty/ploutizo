import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Account } from "@ploutizo/types"
import { apiFetch } from "@/lib/queryClient"

interface UpdateAccountBody {
  name?: string
  type?: string
  institution?: string | null
  lastFour?: string | null
  eachPersonPaysOwn?: boolean
  memberIds?: Array<string>
}

export const updateAccount = async (id: string, body: UpdateAccountBody): Promise<Account> => {
  const r = await apiFetch<{ data: Account }>(`/api/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return r.data
}

export const useUpdateAccount = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateAccountBody) => updateAccount(id, body),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["account-members", id] })
    },
  })
}
