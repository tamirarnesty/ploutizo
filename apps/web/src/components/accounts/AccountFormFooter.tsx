import { Archive } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
} from '@ploutizo/ui/components/alert-dialog';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { DestructiveAlertDialogContent } from '@/components/DestructiveAlertDialogContent';
import type { AccountFormInstance } from './useAccountForm';

interface AccountFormFooterProps {
  form: AccountFormInstance;
  isEditing: boolean;
  onClose: () => void;
  onArchive?: () => void;
}

export const AccountFormFooter = ({
  form,
  isEditing,
  onClose,
  onArchive,
}: AccountFormFooterProps) => (
  <div className="flex items-center justify-between gap-2 border-t border-border px-6 pt-4 pb-[calc(--spacing(4)+env(safe-area-inset-bottom,0px))]">
    {/* Sheet p-0 clears the base safe-area rule, so the home-indicator inset lives here. */}
    {onArchive ? (
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              type="button"
              className="text-destructive hover:text-destructive"
            />
          }
        >
          <Archive size={16} className="mr-1" aria-hidden="true" />
          Archive
        </AlertDialogTrigger>
        <DestructiveAlertDialogContent
          title="Archive account?"
          description="Transactions linked to this account will not be affected."
          confirmLabel="Archive account"
          onConfirm={onArchive}
        />
      </AlertDialog>
    ) : (
      <div />
    )}
    <div className="flex gap-2">
      <Button variant="outline" type="button" onClick={onClose}>
        Discard
      </Button>
      <form.Subscribe
        selector={(s: { isSubmitting: boolean }) => s.isSubmitting}
      >
        {(isSubmitting) => (
          <LoadingButton type="submit" loading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Add account'}
          </LoadingButton>
        )}
      </form.Subscribe>
    </div>
  </div>
);
