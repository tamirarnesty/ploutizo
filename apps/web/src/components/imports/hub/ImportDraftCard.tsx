import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { RotateCcw, Trash2 } from 'lucide-react';
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
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Text } from '@ploutizo/ui/components/text';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary } from '@ploutizo/types';

interface ImportDraftCardProps {
  draft: ImportDraftSummary;
  discardingDraftId: string | undefined;
  isDiscarding: boolean;
  onDiscard: (draftId: string) => void;
}

export const ImportDraftCard = ({
  draft,
  discardingDraftId,
  isDiscarding,
  onDiscard,
}: ImportDraftCardProps) => {
  const [discardOpen, setDiscardOpen] = useState(false);
  const discardingThisDraft = isDiscarding && discardingDraftId === draft.id;

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Text variant="body-sm" className="font-semibold wrap-break-word">
            {formatAccountLabel(draft.account)}
          </Text>
          <Text
            variant="body-sm"
            className="wrap-break-word text-muted-foreground"
          >
            {draft.fileName ?? 'Untitled CSV'}
          </Text>
        </div>
        <Badge variant="secondary">Draft</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Text as="span" variant="body-sm" className="text-muted-foreground">
          {draft.rowCount} rows
        </Text>
        <Text as="span" variant="body-sm" className="text-muted-foreground">
          {draft.validRowCount} reviewable
        </Text>
        <Text as="span" variant="body-sm" className="text-muted-foreground">
          {draft.invalidRowCount} invalid
        </Text>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/import/$draftId" params={{ draftId: draft.id }} />}
        >
          <RotateCcw />
          Continue
        </Button>
        <LoadingButton
          type="button"
          variant="destructive"
          icon={<Trash2 />}
          loading={discardingThisDraft}
          onClick={() => setDiscardOpen(true)}
        >
          Discard
        </LoadingButton>
      </div>
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
              disabled={discardingThisDraft}
              onClick={() => {
                onDiscard(draft.id);
                setDiscardOpen(false);
              }}
            >
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
