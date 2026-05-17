import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { DialogFooter } from '@ploutizo/ui/components/dialog';

export type SettleDialogFormFooterProps = {
  onClose: () => void;
  submitError: unknown;
  isSubmitting: boolean;
};

export const SettleDialogFormFooter = ({
  onClose,
  submitError,
  isSubmitting,
}: SettleDialogFormFooterProps) => (
  <>
    {submitError ? (
      <Text variant="error" className="mt-3">
        {String(submitError)}
      </Text>
    ) : null}

    <DialogFooter className="mt-6">
      <Button variant="outline" type="button" onClick={onClose}>
        Discard changes
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        Record settlement
      </Button>
    </DialogFooter>
  </>
);
