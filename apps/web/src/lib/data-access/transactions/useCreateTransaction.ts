import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { TransactionRow } from './useGetTransactions';

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useCreateTransaction = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ data: TransactionRow }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r: { data: TransactionRow }) => r.data),
    onSuccess: () => {
      toast.success('Transaction created.');
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'transactions'),
      });
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'settlements'),
      });
    },
    onError: () => {
      toast.error('Failed to create transaction.');
    },
  });
};
