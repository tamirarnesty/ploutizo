import {  useQuery } from "@tanstack/react-query"
import type {UseQueryResult} from "@tanstack/react-query";
import { apiFetch } from "@/lib/queryClient"

export interface HouseholdSettings {
  settlementThreshold: number | null
}

export const fetchHouseholdSettings = async (): Promise<HouseholdSettings> => {
  const r = await apiFetch<{ data: HouseholdSettings }>("/api/households/settings")
  return r.data
}

export const useGetHouseholdSettings = (): UseQueryResult<HouseholdSettings> => {
  return useQuery({
    queryKey: ["household-settings"],
    queryFn: fetchHouseholdSettings,
  })
}
