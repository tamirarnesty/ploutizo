import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import type { TransactionRow } from './useGetTransactions'
import { apiFetch } from '@/lib/queryClient'

export const fetchTransaction = async (id: string): Promise<TransactionRow> => {
  const r = await apiFetch<{ data: TransactionRow }>(`/api/transactions/${id}`)
  return r.data
}

export const useGetTransaction = (
  id: string | null,
  options?: { initialData?: TransactionRow }
): UseQueryResult<TransactionRow> => {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => fetchTransaction(id!),
    enabled: id !== null,
    initialData: options?.initialData,
  })
}
