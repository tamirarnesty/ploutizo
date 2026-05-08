import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { CreateSettlementInput } from '@ploutizo/validators';
import { apiFetch } from '@/lib/queryClient';

// POST /api/settlements returns { data: TransactionRow } envelope per
// apps/api/src/routes/settlements.ts line 21. We don't surface the row to
// callers — invalidating ['settlements'] is the only effect Phase 4.2 cares about.
// Phase 4.1 D-20 is explicit: invalidate ['settlements'] ONLY (NOT ['transactions']).
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
      qc.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: () => {
      toast.error('Failed to record settlement. Try again.');
    },
  });
};
