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
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchSearchTransactions(description, type, signal),
    enabled: description.length >= 2,
  });
};
