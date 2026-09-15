import { useQuery } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { fetchSearchTransactions } from './queries';
import type { UseQueryResult } from '@tanstack/react-query';
import type { TransactionRow } from './useGetTransactions';

export const useSearchTransactions = (
  description: string,
  type?: string
): UseQueryResult<TransactionRow[]> => {
  const access = useActiveHouseholdAccess();
  return useQuery({
    queryKey: householdQueryKey(
      access,
      'transactions',
      'search',
      description,
      type
    ),
    queryFn: () => fetchSearchTransactions(description, type),
    enabled: description.length >= 2,
  });
};
