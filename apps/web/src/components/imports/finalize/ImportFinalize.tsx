import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Page } from '@ploutizo/ui/components/page';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  formatAccountLabel,
  formatCurrency,
  formatTransactionTypeLabel,
} from '@ploutizo/utils';
import type {
  ImportFinalizePreview,
  ImportFinalizePreviewRow,
} from '@ploutizo/validators';
import { PageHeader } from '@/components/PageHeader';
import {
  clearImportFinalizePreviewSession,
  getImportFinalizePreviewSession,
} from '@/lib/data-access/imports/importFinalizePreviewSession';
import {
  classifyImportFinalizeError,
  getImportRequirementFailures,
  toImportDraftMeta,
  useFinalizeImportDraft,
  useGetImportDraft,
  useImportDiscardInProgressDraft,
} from '@/lib/data-access/imports';
import {
  importDraftReviewPathname,
  importDraftReviewRoute,
} from '@/lib/navigation';
import { formatTransactionDate } from '@/components/transactions/transactionRowDisplay';
import { ImportDiscardDraftAction } from '../lib/ImportDiscardDraftAction';

const NO_ROW_IDS: string[] = [];

interface ImportFinalizeProps {
  draftId: string;
}

const OutcomeCountSummary = ({
  preview,
}: {
  preview: ImportFinalizePreview;
}) => {
  const { counts, rowCount } = preview;
  const total =
    counts.created + counts.matched + counts.skipped + counts.invalid;
  return (
    <Text variant="body-sm" className="text-muted-foreground">
      Created {counts.created} · Matched {counts.matched} · Skipped{' '}
      {counts.skipped} · Invalid {counts.invalid} · {total} of {rowCount} source
      rows
    </Text>
  );
};

const ImportFinalizePreviewRowsTable = ({
  caption,
  rows,
}: {
  caption: string;
  rows: ImportFinalizePreviewRow[];
}) => {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <Text as="h3" variant="h3">
        {caption}
      </Text>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const values = row.snapshot.reviewedValues;
              return (
                <tr key={row.batchRowId} className="border-t border-border">
                  <td className="px-3 py-2">
                    {values.date ? formatTransactionDate(values.date) : '—'}
                  </td>
                  <td className="px-3 py-2">{values.description ?? '—'}</td>
                  <td className="px-3 py-2">
                    {values.type
                      ? formatTransactionTypeLabel(values.type)
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {values.amount == null
                      ? '—'
                      : formatCurrency(values.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export const ImportFinalize = ({ draftId }: ImportFinalizeProps) => {
  const navigate = useNavigate();
  const handleFinalizeRef = useRef<() => Promise<void>>(async () => {});
  const leavingRef = useRef(false);
  const finalizeImport = useFinalizeImportDraft(draftId, {
    onUncertainFailureRetry: () => {
      void handleFinalizeRef.current();
    },
  });
  const { discard, discardingThisDraft } = useImportDiscardInProgressDraft(
    draftId,
    {
      onDiscardSuccess: () => {
        leavingRef.current = true;
      },
    }
  );
  const draftQuery = useGetImportDraft(draftId, {
    enabled: !finalizeImport.isPending && !finalizeImport.isSuccess,
  });
  const session = getImportFinalizePreviewSession(draftId);
  const preview = session?.preview;
  const rowIds = session?.rowIds ?? NO_ROW_IDS;
  const meta = draftQuery.data ? toImportDraftMeta(draftQuery.data) : undefined;

  const returnToReview = useCallback(
    (issues?: ReturnType<typeof getImportRequirementFailures>) => {
      clearImportFinalizePreviewSession(draftId);
      void navigate({
        ...importDraftReviewRoute(draftId),
        state: {
          importReview:
            issues && issues.length > 0 ? { issues } : { prepareAgain: true },
        },
      });
    },
    [draftId, navigate]
  );

  const backToReview = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    clearImportFinalizePreviewSession(draftId);
    void navigate({
      ...importDraftReviewRoute(draftId),
      ignoreBlocker: true,
      state: { importReview: { prepareAgain: true } },
    });
  }, [draftId, navigate]);

  const leaveToImportHub = useCallback(() => {
    leavingRef.current = true;
    void navigate({ to: '/import', ignoreBlocker: true });
  }, [navigate]);

  useBlocker({
    shouldBlockFn: async ({ current, next }) => {
      if (leavingRef.current) return false;
      if (current.pathname === next.pathname) return false;
      const goingToReview =
        next.pathname === importDraftReviewPathname(draftId);
      if (!goingToReview) return false;
      leavingRef.current = true;
      clearImportFinalizePreviewSession(draftId);
      return false;
    },
    enableBeforeUnload: false,
  });

  const handleFinalize = useCallback(async () => {
    if (
      !preview ||
      rowIds.length === 0 ||
      finalizeImport.isPending ||
      discardingThisDraft
    ) {
      return;
    }
    try {
      await finalizeImport.mutateAsync({
        rowIds,
        counts: preview.counts,
      });
      leaveToImportHub();
    } catch (error) {
      const outcome = classifyImportFinalizeError(error);
      if (outcome === 'return-to-review') {
        returnToReview(getImportRequirementFailures(error));
        return;
      }
      if (outcome === 'not-found') {
        leaveToImportHub();
      }
    }
  }, [
    discardingThisDraft,
    finalizeImport,
    leaveToImportHub,
    preview,
    returnToReview,
    rowIds,
  ]);

  useEffect(() => {
    handleFinalizeRef.current = handleFinalize;
  }, [handleFinalize]);

  const finalizeBusy = finalizeImport.isPending;

  return (
    <Page>
      <section className="flex flex-col gap-6">
        <PageHeader
          title={
            meta ? (
              formatAccountLabel(meta.account)
            ) : draftQuery.isLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              'Finalize import'
            )
          }
          description={
            preview ? (
              <OutcomeCountSummary preview={preview} />
            ) : draftQuery.isLoading ? (
              <Skeleton className="h-4 w-72" />
            ) : null
          }
          actions={
            <>
              <ImportDiscardDraftAction
                discardingThisDraft={discardingThisDraft}
                disabled={finalizeBusy}
                onDiscard={discard}
              />
              <Button
                type="button"
                variant="outline"
                disabled={finalizeBusy || discardingThisDraft}
                onClick={() => {
                  backToReview();
                }}
              >
                Back to review
              </Button>
              <LoadingButton
                type="button"
                loading={finalizeBusy}
                loadingText="Finalizing…"
                disabled={!preview || discardingThisDraft}
                onClick={() => {
                  void handleFinalize();
                }}
              >
                Finalize import
              </LoadingButton>
            </>
          }
        />

        {preview ? (
          <>
            <ImportFinalizePreviewRowsTable
              caption="Will create"
              rows={preview.created}
            />
            <ImportFinalizePreviewRowsTable
              caption="Already matched"
              rows={preview.matched}
            />
          </>
        ) : null}
      </section>
    </Page>
  );
};
