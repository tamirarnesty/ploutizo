import { Link } from '@tanstack/react-router';
import { RotateCcw, Trash2 } from 'lucide-react';
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
}: ImportDraftCardProps) => (
  <div className="rounded-md border border-border p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Text variant="body-sm" className="truncate font-semibold">
          {formatAccountLabel(draft.account)}
        </Text>
        <Text variant="body-sm" className="truncate text-muted-foreground">
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
    <div className="mt-4 flex gap-2">
      <Button
        variant="outline"
        nativeButton={false}
        render={
          <Link
            to="/transactions/import/$draftId"
            params={{ draftId: draft.id }}
          />
        }
      >
        <RotateCcw />
        Continue
      </Button>
      <LoadingButton
        type="button"
        variant="destructive"
        icon={<Trash2 />}
        loading={isDiscarding && discardingDraftId === draft.id}
        onClick={() => onDiscard(draft.id)}
      >
        Discard
      </LoadingButton>
    </div>
  </div>
);
