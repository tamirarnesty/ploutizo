import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ploutizo/ui/components/alert-dialog';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';

export interface ImportDiscardDraftActionProps {
  discardingThisDraft: boolean;
  disabled?: boolean;
  onDiscard: () => void;
}

export const ImportDiscardDraftAction = ({
  discardingThisDraft,
  disabled = false,
  onDiscard,
}: ImportDiscardDraftActionProps) => {
  const [discardOpen, setDiscardOpen] = useState(false);

  return (
    <>
      <LoadingButton
        type="button"
        variant="destructive"
        icon={<Trash2 />}
        loading={discardingThisDraft}
        disabled={disabled}
        onClick={() => setDiscardOpen(true)}
      >
        Discard
      </LoadingButton>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this in-progress import and any
              review work. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* AlertDialogAction is a plain Button (not a Close primitive) — call
                onOpenChange(false) explicitly so the dialog dismisses after confirming. */}
            <AlertDialogAction
              variant="destructive"
              disabled={discardingThisDraft || disabled}
              onClick={() => {
                onDiscard();
                setDiscardOpen(false);
              }}
            >
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
