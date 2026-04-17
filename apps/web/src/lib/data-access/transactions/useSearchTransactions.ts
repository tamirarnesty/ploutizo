import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { apiFetch } from '@/lib/queryClient'
import type { TransactionRow, TransactionListResponse } from './useGetTransactions'

export const fetchSearchTransactions = async (description: string): Promise<TransactionRow[]> => {
  const qs = new URLSearchParams()
  qs.set('description', description)
  qs.set('limit', '20')
  const r = await apiFetch<TransactionListResponse>(`/api/transactions?${qs.toString()}`)
  return r.data
}

export const useSearchTransactions = (description: string): UseQueryResult<TransactionRow[]> => {
  return useQuery({
    queryKey: ['transactions', 'search', description],
    queryFn: () => fetchSearchTransactions(description),
    enabled: description.length >= 2,
  })
}
