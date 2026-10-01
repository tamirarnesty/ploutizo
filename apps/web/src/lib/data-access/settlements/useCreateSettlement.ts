import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import type { CreateSettlementInput } from '@ploutizo/validators';
import { invalidateSpendQueries } from '@/lib/data-access/invalidateSpendQueries';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';

// Settlement POST creates a transaction row — invalidate both settlements and
// transactions so card balances and the transactions table stay in sync without a refresh.
// The created row is not used, so the body is not read.
export const useCreateSettlement = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: CreateSettlementInput) =>
      apiSend('/api/settlements', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Settlement recorded');
      invalidateSpendQueries(qc);
    },
    onError: () => {
      toast.error('Failed to record settlement. Try again.');
    },
  });
};
