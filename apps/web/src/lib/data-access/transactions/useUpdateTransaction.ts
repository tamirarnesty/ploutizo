import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TransactionRow } from './useGetTransactions'
import { apiFetch } from '@/lib/queryClient'

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate.
export const useUpdateTransaction = (id: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch<{ data: TransactionRow }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).then((r: { data: TransactionRow }) => r.data),
    onSuccess: (updatedRow) => {
      // Update the per-record cache immediately with the server response.
      // This prevents the stale-note bug: reopening the sheet reads from
      // ['transaction', id] which now has the fresh data without a refetch.
      qc.setQueryData(['transaction', id], updatedRow)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
