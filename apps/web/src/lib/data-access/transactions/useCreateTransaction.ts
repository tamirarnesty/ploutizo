import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import { invalidateSpendQueries } from '@/lib/data-access/invalidateSpendQueries';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiFetch } from '@/lib/queryClient';
import type { TransactionRow } from './useGetTransactions';

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ data: TransactionRow }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r: { data: TransactionRow }) => r.data),
    onSuccess: () => {
      toast.success('Transaction created.');
      invalidateSpendQueries(qc);
    },
    onError: () => {
      toast.error('Failed to create transaction.');
    },
  });
};
