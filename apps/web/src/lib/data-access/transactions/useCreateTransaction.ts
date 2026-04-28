import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { TransactionRow } from './useGetTransactions';
import { apiFetch } from '@/lib/queryClient';

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ data: TransactionRow }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      }).then((r: { data: TransactionRow }) => r.data),
    onSuccess: () => {
      toast.success('Transaction created.');
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to create transaction.');
    },
  });
};
