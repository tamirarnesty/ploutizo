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

export const Import = () => {
  const { data: targets = [], isLoading: targetsLoading } =
    useGetImportTargets();
  const { data: activeDrafts = [], isLoading: draftsLoading } =
    useGetImportDrafts();
  const { data: history = [], isLoading: historyLoading } =
    useGetImportHistory();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { data: selectedDraft, isLoading: draftLoading } =
    useGetImportDraft(selectedDraftId);
  const discardDraft = useDiscardImportDraft();

  const isLoading = targetsLoading || draftsLoading || historyLoading;

  const handleDiscard = (draftId: string) => {
    discardDraft.mutate(draftId, {
      onSuccess: () => {
        if (selectedDraftId === draftId) setSelectedDraftId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-32 w-full rounded-md" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>
    );
  }

  if (targets.length === 0) {
    return (
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
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h1" variant="h3">
          Import
        </Text>
        <div className="flex gap-2">
          {activeDrafts.length > 0 ? (
            <Badge variant="secondary">
              <AlertCircle />
              {activeDrafts.length} active
            </Badge>
          ) : (
            <Badge variant="outline">
              <CheckCircle2 />
              Ready
            </Badge>
          )}
        </div>
      </div>

      <ImportUploadForm
        targets={targets}
        activeDrafts={activeDrafts}
        onDraftSelected={setSelectedDraftId}
      />

      <section className="space-y-3">
        <Text as="h2" variant="h3">
          Active drafts
        </Text>
        <ImportDraftList
          drafts={activeDrafts}
          selectedDraftId={selectedDraftId}
          discardingDraftId={discardDraft.variables}
          isDiscarding={discardDraft.isPending}
          onSelect={setSelectedDraftId}
          onDiscard={handleDiscard}
        />
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
        <ImportHistoryList history={history} />
      </section>
    </div>
  );
};
