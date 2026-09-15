import { useMutation, useQueryClient } from '@tanstack/react-query';
import { householdQueryKey } from '@/lib/auth/household-query-key';
import { useActiveHouseholdAccess } from '@/lib/auth/use-active-household-access';
import { apiFetch } from '@/lib/queryClient';
import type { TransactionListResponse } from './useGetTransactions';

type Snapshot = [unknown[], TransactionListResponse | undefined][];

export const useDeleteTransaction = () => {
  const access = useActiveHouseholdAccess();
  const qc = useQueryClient();
  const transactionsQueryKey = householdQueryKey(access, 'transactions');
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/api/transactions/${id}`, {
        method: 'DELETE',
      }),

    onMutate: async (_id: string): Promise<{ snapshots: Snapshot }> => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await qc.cancelQueries({ queryKey: transactionsQueryKey });

      // Snapshot every currently-cached transactions page/filter combo
      const snapshots = qc.getQueriesData<TransactionListResponse>({
        queryKey: transactionsQueryKey,
      }) as Snapshot;

      return { snapshots };
      // NOTE: setQueriesData moved to onSuccess so row disappears after toast/close
    },

    onSuccess: (_data, id) => {
      // Remove the deleted row from all list caches after toast and sheet close have fired
      qc.setQueriesData<TransactionListResponse>(
        { queryKey: transactionsQueryKey },
        (old) => {
          // Skip detail queries (TransactionRow shape) — only update list responses
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.filter((t) => t.id !== id),
            total: Math.max(0, old.total - 1),
          };
        }
      );
    },

    onError: (_err, _id, context) => {
      // Roll back every cache to its pre-mutation snapshot
      if (context?.snapshots) {
        for (const [queryKey, previousData] of context.snapshots) {
          qc.setQueryData(queryKey, previousData);
        }
      }
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: transactionsQueryKey });
      void qc.invalidateQueries({
        queryKey: householdQueryKey(access, 'settlements'),
      });
    },
  });
};
