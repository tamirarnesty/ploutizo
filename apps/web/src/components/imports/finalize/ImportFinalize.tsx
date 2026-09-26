import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { toast } from '@ploutizo/ui/components/sonner';
import { Button } from '@ploutizo/ui/components/button';
import { LoadingButton } from '@ploutizo/ui/components/loading-button';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@ploutizo/ui/components/breadcrumb';
import {
  formatAccountLabel,
  formatCurrency,
  formatTransactionTypeLabel,
} from '@ploutizo/utils';
import type {
  ImportFinalizePreview,
  ImportFinalizePreviewRow,
} from '@ploutizo/types';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/queryClient';
import {
  clearImportFinalizePreviewSession,
  getImportFinalizePreviewSession,
} from '@/lib/data-access/imports/importFinalizePreviewSession';
import {
  getImportRequirementFailures,
  isImportStaleFinalizeError,
  releaseImportDraftWorkingCopyForFinalize,
  toImportDraftMeta,
  useFinalizeImportDraft,
  useGetImportDraft,
} from '@/lib/data-access/imports';
import {
  importDraftReviewPathname,
  importDraftReviewRoute,
} from '@/lib/navigation';

interface ImportFinalizeProps {
  draftId: string;
}

const formatReviewedDate = (value: string | null): string => {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ImportFinalizeBreadcrumbs = () => (
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink render={<Link to="/import" />}>Import</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>Finalize import</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
);

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
                    {formatReviewedDate(values.date)}
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

export const importDraftNotFoundRedirect = (error: unknown): 'hub' | null => {
  if (getApiErrorCode(error) !== 'NOT_FOUND') return null;
  const message = getApiErrorMessage(error, '');
  return message === 'Import draft not found.' ? 'hub' : null;
};

export const ImportFinalize = ({ draftId }: ImportFinalizeProps) => {
  const navigate = useNavigate();
  const finalizeImport = useFinalizeImportDraft(draftId);
  const draftQuery = useGetImportDraft(draftId, {
    enabled: !finalizeImport.isPending && !finalizeImport.isSuccess,
  });
  const [transportError, setTransportError] = useState<string | null>(null);
  const leavingRef = useRef(false);
  const session = getImportFinalizePreviewSession(draftId);
  const preview = session?.preview;
  const rowIds = session?.rowIds ?? [];
  const meta = draftQuery.data ? toImportDraftMeta(draftQuery.data) : undefined;

  useEffect(() => {
    void releaseImportDraftWorkingCopyForFinalize(draftId);
  }, [draftId]);

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

  const handleFinalize = async () => {
    if (!preview || rowIds.length === 0 || finalizeImport.isPending) return;
    setTransportError(null);
    try {
      const result = await finalizeImport.mutateAsync({ rowIds });
      const viewOutcome =
        result.createdCount > 0
          ? 'created'
          : result.matchedCount > 0
            ? 'matched'
            : null;
      toast.success('Import completed.', {
        action: viewOutcome
          ? {
              label: 'View transactions',
              onClick: () => {
                void navigate({
                  to: '/transactions',
                  search: {
                    importBatchId: result.id,
                    importOutcome: viewOutcome,
                  },
                });
              },
            }
          : undefined,
      });
      leaveToImportHub();
    } catch (error) {
      if (isImportStaleFinalizeError(error)) {
        returnToReview(getImportRequirementFailures(error));
        return;
      }
      const notFoundRedirect = importDraftNotFoundRedirect(error);
      if (
        notFoundRedirect === 'hub' ||
        getApiErrorCode(error) === 'NOT_FOUND'
      ) {
        leaveToImportHub();
        return;
      }
      setTransportError(
        getApiErrorMessage(
          error,
          'Could not finalize this import. Please retry.'
        )
      );
    }
  };

  const finalizeBusy = finalizeImport.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <ImportFinalizeBreadcrumbs />
      <section className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {meta ? (
              <Text as="h2" variant="h3" className="wrap-break-word">
                {formatAccountLabel(meta.account)}
              </Text>
            ) : draftQuery.isLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <Text as="h2" variant="h3">
                Finalize import
              </Text>
            )}
            {preview ? (
              <OutcomeCountSummary preview={preview} />
            ) : draftQuery.isLoading ? (
              <Skeleton className="mt-2 h-4 w-72" />
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={finalizeBusy}
                onClick={() => {
                  backToReview();
                }}
              >
                Back to Review
              </Button>
              <LoadingButton
                type="button"
                loading={finalizeBusy}
                loadingText="Finalizing…"
                disabled={!preview}
                onClick={() => {
                  void handleFinalize();
                }}
              >
                {transportError ? 'Retry' : 'Finalize import'}
              </LoadingButton>
            </div>
          </div>
        </div>

        {transportError ? (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
            role="alert"
          >
            <Text variant="body-sm" className="text-destructive">
              {transportError}
            </Text>
          </div>
        ) : null}

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
    </div>
  );
};
