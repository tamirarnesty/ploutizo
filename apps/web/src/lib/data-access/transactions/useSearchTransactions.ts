import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import type { TransactionRow } from './useGetTransactions'
import { fetchSearchTransactions } from './queries'

export const useSearchTransactions = (description: string): UseQueryResult<TransactionRow[]> => {
  return useQuery({
    queryKey: ['transactions', 'search', description],
    queryFn: () => fetchSearchTransactions(description),
    enabled: description.length >= 2,
  })
}
