import type { TransactionRow } from '@ploutizo/validators';
import { useHouseholdQuery } from '@/lib/data-access/useHouseholdQuery';
import { fetchTransaction } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';

export const useGetTransaction = (
  id: string | null,
  options?: { initialData?: TransactionRow }
): UseQueryResult<TransactionRow> => {
  return useHouseholdQuery({
    queryKey: ['transaction', id],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchTransaction(id!, signal),
    enabled: id !== null,
    initialData: options?.initialData,
  });
};
