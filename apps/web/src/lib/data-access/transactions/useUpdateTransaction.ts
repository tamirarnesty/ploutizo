import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TransactionRow } from './useGetTransactions';
import { apiFetch } from '@/lib/queryClient';

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
    onSuccess: (updatedRow) => {
      // Merge with existing cache entry to preserve joined arrays (tags, assignees)
      // that the PATCH endpoint does not return (it returns scalar row only).
      qc.setQueryData(
        ['transaction', id],
        (prev: TransactionRow | undefined) => ({
          ...(prev ?? {}),
          ...updatedRow,
          tags: prev?.tags ?? [],
          assignees: prev?.assignees ?? [],
        })
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
};
