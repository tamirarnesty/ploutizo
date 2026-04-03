import {  useQuery } from "@tanstack/react-query"
import type {UseQueryResult} from "@tanstack/react-query";
import type { OrgMember } from "@ploutizo/types"
import { apiFetch } from "@/lib/queryClient"

export const fetchOrgMembers = async (): Promise<Array<OrgMember>> => {
  const r = await apiFetch<{ data: Array<OrgMember> }>("/api/households/members")
  return r.data
}

export const useGetOrgMembers = (): UseQueryResult<Array<OrgMember>> => {
  return useQuery({
    queryKey: ["org-members"],
    queryFn: fetchOrgMembers,
  })
}
