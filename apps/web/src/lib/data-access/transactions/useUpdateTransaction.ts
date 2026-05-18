import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/queryClient';
import type { TransactionRow } from './useGetTransactions';

type PatchTransactionResponse = Omit<TransactionRow, 'tags' | 'assignees'>;

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useUpdateTransaction = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ data: PatchTransactionResponse }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r: { data: PatchTransactionResponse }) => r.data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['transactions'] });
      // PATCH returns scalar row only; merging prev assignees/tags would keep stale splits
      // after the user edits them (detail query key is singular — not covered by list invalidation).
      if (id.length > 0) {
        await qc.invalidateQueries({ queryKey: ['transaction', id] });
      }
    },
  });
};
