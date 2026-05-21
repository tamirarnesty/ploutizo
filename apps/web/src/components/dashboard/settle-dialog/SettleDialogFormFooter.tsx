import { Button } from '@ploutizo/ui/components/button';
import { DialogFooter } from '@ploutizo/ui/components/dialog';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Text } from '@ploutizo/ui/components/text';
import { formatCurrency } from '@/lib/formatCurrency';

export type SettleDialogFormFooterProps = {
  onClose: () => void;
  submitError: unknown;
  isSubmitting: boolean;
  amountDollars: number;
};

export const SettleDialogFormFooter = ({
  onClose,
  submitError,
  isSubmitting,
  amountDollars,
}: SettleDialogFormFooterProps) => {
  const amountCents = Math.round(Math.max(0, amountDollars) * 100);
  const settleLabel = `Settle ${formatCurrency(amountCents)}`;
  const isAmountInvalid = !Number.isFinite(amountDollars) || amountDollars <= 0;

  return (
    <DialogFooter className="mt-6 sm:justify-between">
      <div aria-live="polite" className="min-w-0 flex-1">
        {submitError ? (
          <Text variant="error">{String(submitError)}</Text>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" type="button" onClick={onClose}>
          Discard
        </Button>
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Settling…"
          disabled={isAmountInvalid}
        >
          {settleLabel}
        </LoadingButton>
      </div>
    </DialogFooter>
  );
};
