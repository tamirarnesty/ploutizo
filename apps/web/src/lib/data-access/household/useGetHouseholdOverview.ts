import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"
import { apiFetch } from "@/lib/queryClient"

export interface HouseholdOverview {
  name: string | null
  imageUrl: string | null
}

export const useGetHouseholdOverview = (): UseQueryResult<HouseholdOverview> =>
  useQuery({
    queryKey: ["household-overview"],
    queryFn: () =>
      apiFetch<{ data: HouseholdOverview }>("/api/households").then((r) => r.data),
  })
