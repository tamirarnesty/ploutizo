import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import { Badge } from '@ploutizo/ui/components/badge';
import { Button } from '@ploutizo/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  useDiscardImportDraft,
  useGetImportDraft,
  useGetImportDrafts,
  useGetImportHistory,
  useGetImportTargets,
} from '@/lib/data-access/imports';
import { ImportDraftList } from './ImportDraftList';
import { ImportDraftReview } from './ImportDraftReview';
import { ImportHistoryList } from './ImportHistoryList';
import { ImportUploadForm } from './ImportUploadForm';

interface ImportStatusBadgeProps {
  activeDraftCount: number;
  isLoading: boolean;
}

const ImportStatusBadge = ({
  activeDraftCount,
  isLoading,
}: ImportStatusBadgeProps) => {
  if (isLoading) return <Skeleton className="h-6 w-20 rounded-full" />;

  if (activeDraftCount > 0) {
    return (
      <Badge variant="secondary">
        <AlertCircle />
        {activeDraftCount} active
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <CheckCircle2 />
      Ready
    </Badge>
  );
};

const ImportDraftListLoadingState = () => (
  <div className="grid gap-3 lg:grid-cols-2">
    {Array.from({ length: 2 }, (_, i) => (
      <Skeleton key={i} className="h-32 w-full rounded-md" />
    ))}
  </div>
);

const ImportHistoryLoadingState = () => (
  <div className="divide-y divide-border rounded-md border border-border">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="space-y-2 p-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    ))}
  </div>
);

const NoImportTargetsEmptyState = () => (
  <Empty className="min-h-[460px] border border-dashed">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <CreditCard />
      </EmptyMedia>
      <EmptyTitle>No credit cards</EmptyTitle>
      <EmptyDescription>
        Add a credit card account before importing statement rows.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button render={<Link to="/accounts" />}>Add credit card</Button>
    </EmptyContent>
  </Empty>
);

export const Import = () => {
  const { data: targetsData, isLoading: targetsLoading } =
    useGetImportTargets();
  const { data: activeDraftsData, isLoading: draftsLoading } =
    useGetImportDrafts();
  const { data: historyData, isLoading: historyLoading } =
    useGetImportHistory();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { data: selectedDraft, isLoading: draftLoading } =
    useGetImportDraft(selectedDraftId);
  const discardDraft = useDiscardImportDraft();

  const targets = targetsData ?? [];
  const activeDrafts = activeDraftsData ?? [];
  const history = historyData ?? [];
  const showImportWorkspace = targetsLoading || targets.length > 0;

  const handleDiscard = (draftId: string) => {
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        if (selectedDraftId === draftId) setSelectedDraftId(null);
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="h3">
          Import
        </Text>
        <div className="flex gap-2">
          <ImportStatusBadge
            activeDraftCount={activeDrafts.length}
            isLoading={draftsLoading}
          />
        </div>
      </div>

      {showImportWorkspace ? (
        <>
          <ImportUploadForm
            key={targetsLoading ? 'loading' : (targets[0]?.id ?? 'ready')}
            targets={targets}
            targetsLoading={targetsLoading}
            activeDrafts={activeDrafts}
            activeDraftsLoading={draftsLoading}
            onDraftSelected={setSelectedDraftId}
          />

          <section className="space-y-3">
            <Text as="h2" variant="h3">
              Active drafts
            </Text>
            {draftsLoading ? (
              <ImportDraftListLoadingState />
            ) : (
              <ImportDraftList
                drafts={activeDrafts}
                selectedDraftId={selectedDraftId}
                discardingDraftId={discardDraft.variables}
                isDiscarding={discardDraft.isPending}
                onSelect={setSelectedDraftId}
                onDiscard={handleDiscard}
              />
            )}
          </section>

          {selectedDraftId ? (
            draftLoading || !selectedDraft ? (
              <Skeleton className="h-64 w-full rounded-md" />
            ) : (
              <ImportDraftReview draft={selectedDraft} />
            )
          ) : null}

          <section className="space-y-3">
            <Text as="h2" variant="h3">
              Recent history
            </Text>
            {historyLoading ? (
              <ImportHistoryLoadingState />
            ) : (
              <ImportHistoryList history={history} />
            )}
          </section>
        </>
      ) : (
        <NoImportTargetsEmptyState />
      )}
    </div>
  );
};
