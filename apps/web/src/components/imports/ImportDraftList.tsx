import { Link } from '@tanstack/react-router';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import { Empty, EmptyDescription } from '@ploutizo/ui/components/empty';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import type { ImportDraftSummary } from '@ploutizo/types';
import { formatDraftAccountLabel } from './importPresentation';

interface ImportDraftListProps {
  drafts: ImportDraftSummary[];
  discardingDraftId: string | undefined;
  isDiscarding: boolean;
  isLoading?: boolean;
  onDiscard: (draftId: string) => void;
}

const ImportDraftListSkeleton = () => (
  <div className="grid gap-3 lg:grid-cols-2">
    {Array.from({ length: 2 }, (_, i) => (
      <div key={i} className="rounded-md border border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const ImportDraftList = ({
  drafts,
  discardingDraftId,
  isDiscarding,
  isLoading = false,
  onDiscard,
}: ImportDraftListProps) => {
  if (isLoading) return <ImportDraftListSkeleton />;

  if (drafts.length === 0) {
    return (
      <Empty className="border border-dashed p-6">
        <EmptyDescription>No active drafts.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {drafts.map((draft) => (
        <div key={draft.id} className="rounded-md border border-border p-4">
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
      ))}
    </div>
  );
};
