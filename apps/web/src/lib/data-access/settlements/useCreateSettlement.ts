import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { CreateSettlementInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

// POST /api/settlements returns { data: TransactionRow } envelope per
// apps/api/src/routes/settlements.ts line 21. Settlement POST creates a
// transaction row — invalidate both ['settlements'] and ['transactions'] so
// card balances and the transactions table stay in sync without a refresh.
export const useCreateSettlement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSettlementInput) =>
      apiFetch<{ data: unknown }>('/api/settlements', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Settlement recorded');
      void qc.invalidateQueries({ queryKey: ['settlements'] });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      toast.error('Failed to record settlement. Try again.');
    },
  });
};
