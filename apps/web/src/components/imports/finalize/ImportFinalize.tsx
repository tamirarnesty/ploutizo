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
  ImportPreparedConfirmation,
  ImportPreparedConfirmationRow,
} from '@ploutizo/types';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/queryClient';
import {
  getImportRequirementFailures,
  isImportStaleFinalizeError,
  toImportDraftMeta,
  useFinalizeImportDraft,
  useGetImportDraft,
  useGetPreparedImport,
  useInvalidatePreparedImport,
} from '@/lib/data-access/imports';

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
  confirmation,
}: {
  confirmation: ImportPreparedConfirmation;
}) => {
  const { counts, rowCount } = confirmation;
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

const PreparedRowsTable = ({
  caption,
  rows,
}: {
  caption: string;
  rows: ImportPreparedConfirmationRow[];
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

export const preparedNotFoundRedirect = (
  error: unknown
): 'review' | 'hub' | null => {
  if (getApiErrorCode(error) !== 'NOT_FOUND') return null;
  const message = getApiErrorMessage(error, '');
  return message === 'Prepared import set not found.' ? 'review' : 'hub';
};

export const ImportFinalize = ({ draftId }: ImportFinalizeProps) => {
  const navigate = useNavigate();
  const preparedQuery = useGetPreparedImport(draftId);
  const draftQuery = useGetImportDraft(draftId);
  const invalidatePrepared = useInvalidatePreparedImport(draftId);
  const finalizeImport = useFinalizeImportDraft(draftId);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const leavingRef = useRef(false);
  const redirectedRef = useRef(false);
  const meta = draftQuery.data ? toImportDraftMeta(draftQuery.data) : undefined;

  const returnToReview = useCallback(
    (issues?: ReturnType<typeof getImportRequirementFailures>) => {
      void navigate({
        to: '/import/$draftId',
        params: { draftId },
        state: {
          importReview:
            issues && issues.length > 0 ? { issues } : { prepareAgain: true },
        },
      });
    },
    [draftId, navigate]
  );

  useEffect(() => {
    if (!preparedQuery.isError || redirectedRef.current) return;
    const redirect = preparedNotFoundRedirect(preparedQuery.error);
    if (!redirect) return;
    redirectedRef.current = true;
    if (redirect === 'review') {
      void navigate({
        to: '/import/$draftId',
        params: { draftId },
        state: { importReview: { prepareAgain: true } },
      });
      return;
    }
    void navigate({ to: '/import' });
  }, [draftId, navigate, preparedQuery.error, preparedQuery.isError]);

  const confirmPreparedDiscard = useCallback(async (): Promise<boolean> => {
    setDiscardError(null);
    try {
      await invalidatePrepared.mutateAsync();
      return true;
    } catch (error) {
      if (getApiErrorCode(error) === 'NOT_FOUND') return true;
      setDiscardError(
        getApiErrorMessage(
          error,
          'Could not discard this prepared import. Retry to try again.'
        )
      );
      return false;
    }
  }, [invalidatePrepared]);

  const invalidateThenReview = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    const discarded = await confirmPreparedDiscard();
    if (!discarded) {
      leavingRef.current = false;
      return;
    }
    void navigate({
      to: '/import/$draftId',
      params: { draftId },
      ignoreBlocker: true,
    });
  }, [confirmPreparedDiscard, draftId, navigate]);

  useBlocker({
    shouldBlockFn: async ({ current, next }) => {
      if (leavingRef.current) return false;
      if (current.pathname === next.pathname) return false;
      const goingToReview = next.pathname === `/import/${draftId}`;
      if (!goingToReview) return false;
      leavingRef.current = true;
      const discarded = await confirmPreparedDiscard();
      if (!discarded) {
        leavingRef.current = false;
        return true;
      }
      return false;
    },
    enableBeforeUnload: false,
  });

  const handleFinalize = async () => {
    const prepared = preparedQuery.data;
    if (!prepared || finalizeImport.isPending || invalidatePrepared.isPending)
      return;
    setTransportError(null);
    setDiscardError(null);
    try {
      const result = await finalizeImport.mutateAsync({
        preparedSetId: prepared.id,
      });
      leavingRef.current = true;
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
      void navigate({
        to: '/import',
        ignoreBlocker: true,
      });
    } catch (error) {
      if (isImportStaleFinalizeError(error)) {
        returnToReview(getImportRequirementFailures(error));
        return;
      }
      const notFoundRedirect = preparedNotFoundRedirect(error);
      if (notFoundRedirect === 'review') {
        returnToReview();
        return;
      }
      if (
        notFoundRedirect === 'hub' ||
        getApiErrorCode(error) === 'NOT_FOUND'
      ) {
        void navigate({ to: '/import' });
        return;
      }
      setTransportError(
        getApiErrorMessage(
          error,
          'Could not finalize this import. Retry to try again.'
        )
      );
    }
  };

  const confirmation = preparedQuery.data;
  const loadFailed =
    preparedQuery.isError && !preparedNotFoundRedirect(preparedQuery.error);
  const finalizeBusy = finalizeImport.isPending;
  const discardBusy = invalidatePrepared.isPending;
  const actionError = discardError ?? transportError;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <ImportFinalizeBreadcrumbs />
      <section className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {meta ? (
              <Text as="h2" variant="h3" className="truncate">
                {formatAccountLabel(meta.account)}
              </Text>
            ) : preparedQuery.isLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <Text as="h2" variant="h3">
                Finalize import
              </Text>
            )}
            {confirmation ? (
              <OutcomeCountSummary confirmation={confirmation} />
            ) : preparedQuery.isLoading ? (
              <Skeleton className="mt-2 h-4 w-72" />
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={finalizeBusy || discardBusy}
                onClick={() => {
                  void invalidateThenReview();
                }}
              >
                {discardError ? 'Retry' : 'Back to Review'}
              </Button>
              <LoadingButton
                type="button"
                loading={finalizeBusy}
                loadingText="Finalizing…"
                disabled={!confirmation || discardBusy}
                onClick={() => {
                  void handleFinalize();
                }}
              >
                {transportError && !discardError ? 'Retry' : 'Finalize import'}
              </LoadingButton>
            </div>
            <Text
              variant="body-sm"
              className="max-w-sm text-right text-muted-foreground"
            >
              This page is the confirmation checkpoint. Finalizing records the
              prepared outcomes.
            </Text>
          </div>
        </div>

        {actionError ? (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
            role="alert"
          >
            <Text variant="body-sm" className="text-destructive">
              {actionError}
            </Text>
          </div>
        ) : null}

        {loadFailed ? (
          <Text variant="error">
            Couldn&apos;t load the prepared import. Check your connection and
            try again.
          </Text>
        ) : null}

        {confirmation ? (
          <>
            <PreparedRowsTable
              caption="Will create"
              rows={confirmation.created}
            />
            <PreparedRowsTable
              caption="Already matched"
              rows={confirmation.matched}
            />
          </>
        ) : null}
      </section>
    </div>
  );
};
