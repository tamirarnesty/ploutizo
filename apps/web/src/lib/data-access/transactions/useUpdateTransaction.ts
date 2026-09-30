import { useQueryClient } from '@tanstack/react-query';
import { invalidateSpendQueries } from '@/lib/data-access/invalidateSpendQueries';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useUpdateTransaction = (id: string) => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: unknown) =>
      apiSend(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateSpendQueries(qc);
      // PATCH returns scalar row only; merging prev assignees/tags would keep stale splits
      // after the user edits them (detail query key is singular — not covered by list invalidation).
      if (id.length > 0) {
        void qc.invalidateQueries({
          queryKey: ['transaction', id],
        });
      }
    },
  });
};
