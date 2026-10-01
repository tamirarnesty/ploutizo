import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@ploutizo/ui/components/sonner';
import { invalidateSpendQueries } from '@/lib/data-access/invalidateSpendQueries';
import { useHouseholdMutation } from '@/lib/data-access/useHouseholdQuery';
import { apiSend } from '@/lib/queryClient';

// body: unknown is intentional — payload is produced by toApiPayload in useTransactionForm,
// which validates via createTransactionSchema.safeParse before calling mutate.
// This hook is a thin transport layer and does not re-validate. The created row is not used,
// so the body is not read.
export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useHouseholdMutation({
    mutationFn: (body: unknown) =>
      apiSend('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Transaction created.');
      invalidateSpendQueries(qc);
    },
    onError: () => {
      toast.error('Failed to create transaction.');
    },
  });
};
