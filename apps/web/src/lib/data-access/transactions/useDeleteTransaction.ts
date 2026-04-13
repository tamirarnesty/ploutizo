import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/queryClient'
import type { TransactionListResponse } from './useGetTransactions'

type Snapshot = Array<[unknown[], TransactionListResponse | undefined]>

export const useDeleteTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/transactions/${id}`, { method: 'DELETE' }),

    onMutate: async (id: string): Promise<{ snapshots: Snapshot }> => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await qc.cancelQueries({ queryKey: ['transactions'] })

      // Snapshot every currently-cached transactions page/filter combo
      const snapshots = qc.getQueriesData<TransactionListResponse>({
        queryKey: ['transactions'],
      }) as Snapshot

      // Optimistically remove the row from all caches
      qc.setQueriesData<TransactionListResponse>(
        { queryKey: ['transactions'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.filter((t) => t.id !== id),
            total: Math.max(0, old.total - 1),
          }
        }
      )

      return { snapshots }
    },

    onError: (_err, _id, context) => {
      // Roll back every cache to its pre-mutation snapshot
      if (context?.snapshots) {
        for (const [queryKey, previousData] of context.snapshots) {
          qc.setQueryData(queryKey, previousData)
        }
      }
    },

    onSettled: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}
