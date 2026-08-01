import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type { ImportDraftRow, ImportPreparedSet } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type {
  ImportDraftMeta,
  ImportReviewAutosaveStatus,
} from '@/lib/data-access/imports';
import { useContinueImportDraft } from '@/lib/data-access/imports/useContinueImportDraft';
import { getApiErrorMessage } from '@/lib/queryClient';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetOrgMembers } from '@/lib/data-access/org';
import { PendingInputFlushProvider } from '@/lib/money/pending-input-flush';
import { useImportDraftReviewState } from '../lib/useImportDraftReviewState';
import { ImportDraftReviewHeader } from './ImportDraftReviewHeader';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import { ImportDraftReviewTable } from './ImportDraftReviewTable';

interface ImportDraftReviewProps {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  autosaveStatus: ImportReviewAutosaveStatus;
  failedRowIds: string[];
  hasUnsavedWork: boolean;
  retryAutosave: () => void;
  flush: () => Promise<boolean>;
}

const getEmptyDraftDescription = (rows: ImportDraftRow[]): string => {
  if (rows.length === 0) {
    return 'This import draft has no transactions to review.';
  }

  const invalidRowCount = rows.filter((row) => row.status === 'invalid').length;
  const parts = ['Every row in this draft is invalid or skipped.'];
  if (invalidRowCount > 0) {
    parts.push(
      invalidRowCount === 1
        ? '1 row is invalid.'
        : `${invalidRowCount} rows are invalid.`
    );
  }
  return parts.join(' ');
};

export const ImportDraftReview = (props: ImportDraftReviewProps) => (
  <PendingInputFlushProvider>
    <ImportDraftReviewContent {...props} />
  </PendingInputFlushProvider>
);

const ImportDraftReviewContent = ({
  meta,
  rows = [],
  isLoading = false,
  updateRow,
  setSelection,
  autosaveStatus,
  failedRowIds,
  hasUnsavedWork,
  retryAutosave,
  flush,
}: ImportDraftReviewProps) => {
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetOrgMembers();
  const reviewState = useImportDraftReviewState({
    meta,
    rows,
    orgMembers,
    isLoading,
    setSelection,
    hasUnsavedWork,
  });
  const { canContinue, continueBlocker, hasReviewableRows } = reviewState;
  const draftId = meta?.id ?? '';
  const continueMutation = useContinueImportDraft(draftId);
  const [preparedSet, setPreparedSet] = useState<ImportPreparedSet | null>(
    null
  );
  const [continueError, setContinueError] = useState<string | null>(null);

  const continueDraftFingerprint = useMemo(
    () =>
      rows
        .map(
          (row) =>
            `${row.id}:${row.updatedAt}:${row.selectedForImport}:${row.reviewCategoryId}:${row.reviewAmount}:${row.reviewDescription}`
        )
        .join('|'),
    [rows]
  );

  useEffect(() => {
    setPreparedSet(null);
    setContinueError(null);
  }, [continueDraftFingerprint, hasUnsavedWork]);

  const handleContinue = useCallback(async () => {
    if (!draftId) return;
    const ok = await flush();
    if (!ok) return;

    setContinueError(null);
    try {
      const nextPreparedSet = await continueMutation.mutateAsync();
      setPreparedSet(nextPreparedSet);
    } catch (error) {
      setPreparedSet(null);
      setContinueError(
        getApiErrorMessage(error, 'Could not prepare this import for finalize.')
      );
    }
  }, [continueMutation, draftId, flush]);

  const showEmptyState = !isLoading && meta && !hasReviewableRows;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <ImportDraftReviewHeader
        meta={meta}
        rows={rows}
        isLoading={isLoading}
        canContinue={canContinue}
        continueBlocker={continueBlocker}
        continueError={continueError}
        isContinuing={continueMutation.isPending}
        preparedSet={preparedSet}
        autosaveStatus={autosaveStatus}
        onRetryAutosave={retryAutosave}
        onContinue={handleContinue}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {showEmptyState ? (
          <Empty className="min-h-[280px] border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>No transactions to review</EmptyTitle>
              <EmptyDescription>
                {getEmptyDraftDescription(rows)}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : meta ? (
          <ImportDraftReviewProvider
            draftId={meta.id}
            categories={categories}
            orgMembers={orgMembers}
            updateRow={updateRow}
            failedRowIds={failedRowIds}
          >
            <ImportDraftReviewTable key={meta.id} reviewState={reviewState} />
          </ImportDraftReviewProvider>
        ) : (
          <ImportDraftReviewTable reviewState={reviewState} />
        )}
      </div>
    </section>
  );
};
