import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from '@ploutizo/ui/components/sonner-api';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import type { TransactionRow } from '@ploutizo/validators';
import { useDeleteTransaction } from '@/lib/data-access/transactions';
import { DeleteTransactionDialog } from './DeleteTransactionDialog';
import type { TransactionFormInstance } from './hooks/useTransactionForm';

interface TransactionFormFooterProps {
  form: TransactionFormInstance;
  transaction: TransactionRow | null;
  onClose: () => void;
}

/** Matches AccountForm footer layout. */
export const TransactionFormFooter = ({
  form,
  transaction,
  onClose,
}: TransactionFormFooterProps) => {
  const deleteMutation = useDeleteTransaction();
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-6 pt-4 pb-[calc(--spacing(4)+env(safe-area-inset-bottom,0px))]">
      {/* Sheet p-0 clears the base safe-area rule, so the home-indicator inset lives here. */}
      {transaction ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Delete transaction"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setAlertOpen(true)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
          <DeleteTransactionDialog
            open={alertOpen}
            onOpenChange={setAlertOpen}
            isPending={deleteMutation.isPending}
            onConfirm={() => {
              deleteMutation.mutate(transaction.id, {
                onSuccess: () => {
                  onClose();
                  toast.success('Transaction deleted.');
                },
                onError: () => {
                  toast.error('Failed to delete transaction.');
                },
              });
            }}
          />
        </>
      ) : (
        <div />
      )}
      <div className="flex gap-2">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <LoadingButton type="submit" loading={isSubmitting}>
              {transaction ? 'Save changes' : 'Add transaction'}
            </LoadingButton>
          )}
        </form.Subscribe>
      </div>
    </div>
  );
};
