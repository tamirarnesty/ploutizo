import {  useQuery } from "@tanstack/react-query"
import type {UseQueryResult} from "@tanstack/react-query";
import type { Account } from "@ploutizo/types"
import { apiFetch } from "@/lib/queryClient"

export const fetchAccounts = async (includeArchived = false): Promise<Array<Account>> => {
  const qs = includeArchived ? "?include=archived" : ""
  const r = await apiFetch<{ data: Array<Account> }>(`/api/accounts${qs}`)
  return r.data
}

export const useGetAccounts = (includeArchived = false): UseQueryResult<Array<Account>> => {
  return useQuery({
    queryKey: ["accounts", { includeArchived }],
    queryFn: () => fetchAccounts(includeArchived),
  })
}
