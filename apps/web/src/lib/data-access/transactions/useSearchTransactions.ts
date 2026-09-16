import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { fetchSearchTransactions } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TransactionRow } from './useGetTransactions';

export const useSearchTransactions = (
  description: string,
  type?: string
): UseQueryResult<TransactionRow[]> => {
  return useHouseholdQuery({
    queryKey: ['transactions', 'search', description, type],
    queryFn: () => fetchSearchTransactions(description, type),
    enabled: description.length >= 2,
  });
};
