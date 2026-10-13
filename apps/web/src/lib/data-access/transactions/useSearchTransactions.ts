import type { TransactionRow } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { fetchSearchTransactions } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';

export const useSearchTransactions = (
  search: string,
  type?: string
): UseQueryResult<TransactionRow[]> => {
  return useHouseholdQuery({
    queryKey: ['transactions', 'search', search, type],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchSearchTransactions(search, type, signal),
    enabled: search.length >= 2,
  });
};
