import { useQuery } from '@tanstack/react-query';
import { fetchTransaction } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TransactionRow } from './useGetTransactions';

export const useGetTransaction = (
  id: string | null,
  options?: { initialData?: TransactionRow }
): UseQueryResult<TransactionRow> => {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => fetchTransaction(id!),
    enabled: id !== null,
    initialData: options?.initialData,
  });
};
