import { Link } from '@tanstack/react-router';
import { CreditCard } from 'lucide-react';
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
  useGetImportDrafts,
  useGetImportHistory,
  useGetImportTargets,
} from '@/lib/data-access/imports';
import { ImportDraftList } from './ImportDraftList';
import { ImportHistoryList } from './ImportHistoryList';
import { ImportUploadForm } from './ImportUploadForm';

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
      <Button nativeButton={false} render={<Link to="/accounts" />}>
        Add credit card
      </Button>
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
    data: historyPage,
    isLoading: historyLoading,
    isError: historyError,
  } = historyQuery;
  const discardDraft = useDiscardImportDraft();

  const targets = targetsData ?? [];
  const activeDrafts = activeDraftsData ?? [];
  const history = historyPage?.data ?? [];

  const handleDiscard = (draftId: string) => {
    discardDraft.mutate(draftId);
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
      <Text as="h1" variant="h3">
        Import
      </Text>

      <ImportUploadForm
        targets={targets}
        targetsLoading={targetsLoading}
        activeDrafts={activeDrafts}
        activeDraftsLoading={draftsLoading || draftsError}
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
            discardingDraftId={discardDraft.variables}
            isDiscarding={discardDraft.isPending}
            isLoading={draftsLoading}
            onDiscard={handleDiscard}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text as="h2" variant="h3">
            Recent history
          </Text>
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            render={<Link to="/import/history" />}
          >
            View all history
          </Button>
        </div>
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
