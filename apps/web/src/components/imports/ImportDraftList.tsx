import { RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraftSummary } from '@ploutizo/types';
import { formatDraftAccountLabel } from './importPresentation';

interface ImportDraftListProps {
  drafts: ImportDraftSummary[];
  selectedDraftId: string | null;
  discardingDraftId: string | undefined;
  isDiscarding: boolean;
  onSelect: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
}

export const ImportDraftList = ({
  drafts,
  selectedDraftId,
  discardingDraftId,
  isDiscarding,
  onSelect,
  onDiscard,
}: ImportDraftListProps) => {
  if (drafts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6">
        <Text variant="body-sm" className="text-muted-foreground">
          No active drafts.
        </Text>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className="rounded-md border border-border p-4"
          data-selected={selectedDraftId === draft.id || undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text variant="body-sm" className="truncate font-semibold">
                {formatDraftAccountLabel(draft)}
              </Text>
              <Text
                variant="body-sm"
                className="truncate text-muted-foreground"
              >
                {draft.fileName ?? 'Untitled CSV'}
              </Text>
            </div>
            <Badge variant="secondary">Draft</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{draft.rowCount} rows</span>
            <span>{draft.validRowCount} reviewable</span>
            <span>{draft.invalidRowCount} invalid</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant={selectedDraftId === draft.id ? 'default' : 'outline'}
              onClick={() => onSelect(draft.id)}
            >
              <RotateCcw />
              Continue
            </Button>
            <LoadingButton
              type="button"
              variant="outline"
              icon={<Trash2 />}
              loading={isDiscarding && discardingDraftId === draft.id}
              onClick={() => onDiscard(draft.id)}
            >
              Discard
            </LoadingButton>
          </div>
        </div>
      ))}
    </div>
  );
};
