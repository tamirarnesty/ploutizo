import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { apiFetch } from '@/lib/queryClient'
import type { TransactionRow } from './useGetTransactions'

export const fetchTransaction = async (id: string): Promise<TransactionRow> => {
  const r = await apiFetch<{ data: TransactionRow }>(`/api/transactions/${id}`)
  return r.data
}

export const useGetTransaction = (id: string | null): UseQueryResult<TransactionRow> => {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => fetchTransaction(id!),
    enabled: id !== null,
  })
}
