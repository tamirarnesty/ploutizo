import { Link } from '@tanstack/react-router';
import { useIsMutating } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import { formatAccountLabel } from '@ploutizo/utils';
import type { ImportDraftSummary } from '@ploutizo/validators';
import { importFinalizeMutationKey } from '@/lib/data-access/imports/queryKeys';
import { importDraftReviewRoute } from '@/lib/navigation';
import { ImportDiscardDraftAction } from '../lib/ImportDiscardDraftAction';

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
  const discardingThisDraft = isDiscarding && discardingDraftId === draft.id;
  const finalizing =
    useIsMutating({ mutationKey: importFinalizeMutationKey(draft.id) }) > 0;

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
        <Badge variant="secondary">
          {finalizing ? 'Finalizing…' : 'Draft'}
        </Badge>
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
        {finalizing ? (
          <Button variant="outline" disabled>
            <RotateCcw />
            Continue
          </Button>
        ) : (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link {...importDraftReviewRoute(draft.id)} />}
          >
            <RotateCcw />
            Continue
          </Button>
        )}
        <ImportDiscardDraftAction
          discardingThisDraft={discardingThisDraft}
          disabled={finalizing}
          onDiscard={() => onDiscard(draft.id)}
        />
      </div>
    </div>
  );
};
