import { useQuery } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { fetchTransaction } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TransactionRow } from './useGetTransactions';

export const useGetTransaction = (
  id: string | null,
  options?: { initialData?: TransactionRow }
): UseQueryResult<TransactionRow> => {
  const access = useActiveHouseholdAccess();
  return useQuery({
    queryKey: householdQueryKey(access, 'transaction', id),
    queryFn: () => fetchTransaction(id!),
    enabled: id !== null,
    initialData: options?.initialData,
  });
};
