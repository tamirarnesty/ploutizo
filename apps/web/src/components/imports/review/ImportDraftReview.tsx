import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Inbox } from 'lucide-react';
import { toast } from '@ploutizo/ui/components/sonner';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import type { ImportDraftRow, ImportRequirementFailure } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import {
  getImportContinueGateMessage,
  getImportRequirementFailures,
  getImportRequirementIssueRowIds,
  summarizeImportRequirementIssues,
} from '@/lib/data-access/imports/importRequirementIssues';
import { useContinueImportDraft } from '@/lib/data-access/imports/useContinueImportDraft';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetOrgMembers } from '@/lib/data-access/org';
import {
  PendingInputFlushProvider,
  useFlushPendingInputs,
} from '@/lib/money/pending-input-flush';
import { getImportRowLabel } from '../lib/importPresentation';
import { useImportDraftReviewState } from '../lib/useImportDraftReviewState';
import { ImportDraftReviewHeader } from './ImportDraftReviewHeader';
import { ImportDraftReviewProvider } from './ImportDraftReviewContext';
import {
  ImportDraftReviewTable,
  focusImportReviewRow,
} from './ImportDraftReviewTable';
import { ImportRequirementIssueList } from './ImportRequirementIssueList';

interface ImportDraftReviewProps {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  retryAutosave: () => void;
  flush: () => Promise<boolean>;
  inboundIssues?: ImportRequirementFailure[];
}

const getEmptyDraftDescription = (rows: ImportDraftRow[]): string => {
  if (rows.length === 0) {
    return 'This import draft has no transactions to review.';
  }

  const invalidRowCount = rows.filter((row) => row.status === 'invalid').length;
  const parts = ['Every row in this draft is invalid.'];
  if (invalidRowCount > 0) {
    parts.push(
      invalidRowCount === 1
        ? '1 row is invalid.'
        : `${invalidRowCount} rows are invalid.`
    );
  }
  return parts.join(' ');
};

export const presentImportRequirementIssues = (
  failures: readonly ImportRequirementFailure[]
) => {
  if (failures.length === 0) return;
  toast.error(summarizeImportRequirementIssues(failures));
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
  retryAutosave,
  flush,
  inboundIssues = [],
}: ImportDraftReviewProps) => {
  const navigate = useNavigate();
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetOrgMembers();
  const [issues, setIssues] = useState<ImportRequirementFailure[]>([]);
  const priorityRowIds = useMemo(
    () => getImportRequirementIssueRowIds(issues),
    [issues]
  );
  const reviewState = useImportDraftReviewState({
    meta,
    rows,
    isLoading,
    setSelection,
    priorityRowIds,
  });
  const { hasReviewableRows } = reviewState;
  const draftId = meta?.id ?? '';
  const flushPendingInputs = useFlushPendingInputs();
  const { continueImport, isPending } = useContinueImportDraft(draftId);

  useEffect(() => {
    if (inboundIssues.length === 0) return;
    setIssues(inboundIssues);
    presentImportRequirementIssues(inboundIssues);
  }, [inboundIssues]);

  const rowLabels = useMemo(
    () =>
      new Map(reviewState.rows.map((row) => [row.id, getImportRowLabel(row)])),
    [reviewState.rows]
  );
  const focusRowId = priorityRowIds[0] ?? null;

  const handleContinue = useCallback(async () => {
    if (!draftId) return;
    flushPendingInputs();
    const ok = await flush();
    if (!ok) return;

    try {
      const preparedSet = await continueImport();
      if (!preparedSet) return;
      setIssues([]);
      await navigate({
        to: '/import/$draftId/finalize',
        params: { draftId },
      });
    } catch (error) {
      const failures = getImportRequirementFailures(error);
      setIssues(failures);
      if (failures.length > 0) {
        presentImportRequirementIssues(failures);
      } else {
        toast.error(getImportContinueGateMessage(error));
      }
    }
  }, [draftId, flush, flushPendingInputs, continueImport, navigate]);

  const showEmptyState = !isLoading && meta && !hasReviewableRows;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <ImportDraftReviewHeader
        meta={meta}
        rows={rows}
        orgMembers={orgMembers}
        isLoading={isLoading}
        isContinuing={isPending}
        onRetryAutosave={retryAutosave}
        onContinue={handleContinue}
      />

      <ImportRequirementIssueList
        issues={issues}
        rowLabels={rowLabels}
        onFocusRow={focusImportReviewRow}
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
            cardAccountId={meta.account.id}
            categories={categories}
            orgMembers={orgMembers}
            updateRow={updateRow}
          >
            <ImportDraftReviewTable
              key={meta.id}
              reviewState={reviewState}
              focusRowId={focusRowId}
            />
          </ImportDraftReviewProvider>
        ) : (
          <ImportDraftReviewTable
            reviewState={reviewState}
            focusRowId={focusRowId}
          />
        )}
      </div>
    </section>
  );
};
