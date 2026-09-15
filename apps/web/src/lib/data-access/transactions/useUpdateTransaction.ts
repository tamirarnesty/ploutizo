import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { TransactionRow } from './useGetTransactions';

type PatchTransactionResponse = Omit<TransactionRow, 'tags' | 'assignees'>;

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useUpdateTransaction = (id: string) => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ data: PatchTransactionResponse }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r: { data: PatchTransactionResponse }) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'transactions'),
      });
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'settlements'),
      });
      // PATCH returns scalar row only; merging prev assignees/tags would keep stale splits
      // after the user edits them (detail query key is singular — not covered by list invalidation).
      if (id.length > 0) {
        void qc.invalidateQueries({
          queryKey: householdQueryKey(access, 'transaction', id),
        });
      }
    },
  });
};
