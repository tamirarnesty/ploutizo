import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/queryClient'
import type { TransactionRow } from './useGetTransactions'

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
    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
