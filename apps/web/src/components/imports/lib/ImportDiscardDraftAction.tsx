import { Trash2 } from 'lucide-react';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog';

export interface ImportDiscardDraftActionProps {
  discardingThisDraft: boolean;
  disabled?: boolean;
  onDiscard: () => void;
}

export const ImportDiscardDraftAction = ({
  discardingThisDraft,
  disabled = false,
  onDiscard,
}: ImportDiscardDraftActionProps) => (
  <ConfirmDestructiveDialog
    trigger={
      <LoadingButton
        type="button"
        variant="destructive"
        icon={<Trash2 />}
        loading={discardingThisDraft}
        disabled={disabled}
      >
        Discard
      </LoadingButton>
    }
    title="Discard draft?"
    description="This will permanently remove this in-progress import and any review work. This action cannot be undone."
    confirmLabel="Discard draft"
    onConfirm={onDiscard}
    isPending={discardingThisDraft || disabled}
  />
);
