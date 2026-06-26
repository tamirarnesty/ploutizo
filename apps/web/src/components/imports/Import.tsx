import { useEffect, useState } from 'react';
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

const importStatusBadgeClassName =
  'border-primary/30 bg-primary/10 text-primary shadow-xs dark:bg-primary/15';

const ImportStatusBadge = ({
  activeDraftCount,
  isLoading,
}: ImportStatusBadgeProps) => {
  const badge = (() => {
    if (isLoading) {
      return (
        <Badge variant="outline" className={importStatusBadgeClassName}>
          Checking drafts
        </Badge>
      );
    }

    if (activeDraftCount > 0) {
      return (
        <Badge variant="outline" className={importStatusBadgeClassName}>
          <AlertCircle />
          {activeDraftCount} active
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={importStatusBadgeClassName}>
        <CheckCircle2 />
        Ready
      </Badge>
    );
  })();

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        Import status
      </span>
      {badge}
    </div>
  );
};

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
  const targetsQuery = useGetImportTargets();
  const draftsQuery = useGetImportDrafts();
  const historyQuery = useGetImportHistory();
  const {
    data: targetsData,
    isLoading: targetsLoading,
    isError: targetsError,
  } = targetsQuery;
  const {
    data: activeDraftsData,
    isLoading: draftsLoading,
    isError: draftsError,
  } = draftsQuery;
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
  } = historyQuery;
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { data: selectedDraft, isLoading: draftLoading } =
    useGetImportDraft(selectedDraftId);
  const discardDraft = useDiscardImportDraft();

  const targets = targetsData ?? [];
  const activeDrafts = activeDraftsData ?? [];
  const history = historyData ?? [];
  const selectedDraftSummary =
    activeDrafts.find((draft) => draft.id === selectedDraftId) ?? null;

  useEffect(() => {
    if (selectedDraftId && !draftLoading && !selectedDraft) {
      setSelectedDraftId(null);
    }
  }, [selectedDraftId, draftLoading, selectedDraft]);

  const handleDiscard = (draftId: string) => {
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        setSelectedDraftId((current) => (current === draftId ? null : current));
      },
    });
  };

  if (targetsError) {
    return (
      <div className="space-y-8">
        <Text as="h1" variant="h3">
          Import
        </Text>
        <Text variant="error">
          Couldn&apos;t load import targets. Check your connection and try
          again.
        </Text>
      </div>
    );
  }

  if (!targetsLoading && targets.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text as="h1" variant="h3">
            Import
          </Text>
        </div>
        <NoImportTargetsEmptyState />
      </div>
    );
  }

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

      <ImportUploadForm
        targets={targets}
        targetsLoading={targetsLoading}
        activeDrafts={activeDrafts}
        activeDraftsLoading={draftsLoading || draftsError}
        onDraftSelected={setSelectedDraftId}
      />

      <section className="space-y-3">
        <Text as="h2" variant="h3">
          Active drafts
        </Text>
        {draftsError ? (
          <Text variant="error">
            Couldn&apos;t load active drafts. Check your connection and try
            again.
          </Text>
        ) : (
          <ImportDraftList
            drafts={activeDrafts}
            selectedDraftId={selectedDraftId}
            discardingDraftId={discardDraft.variables}
            isDiscarding={discardDraft.isPending}
            isLoading={draftsLoading}
            onSelect={setSelectedDraftId}
            onDiscard={handleDiscard}
          />
        )}
      </section>

      {selectedDraftId ? (
        <ImportDraftReview
          draft={selectedDraft}
          summary={selectedDraftSummary}
          isLoading={draftLoading || !selectedDraft}
        />
      ) : null}

      <section className="space-y-3">
        <Text as="h2" variant="h3">
          Recent history
        </Text>
        {historyError ? (
          <Text variant="error">
            Couldn&apos;t load import history. Check your connection and try
            again.
          </Text>
        ) : (
          <ImportHistoryList history={history} isLoading={historyLoading} />
        )}
      </section>
    </div>
  );
};
