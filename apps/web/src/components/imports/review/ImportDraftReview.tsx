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
import {
  formatImportReviewContinueBlocker,
  getImportReviewContinueBlockerReason,
} from '@ploutizo/utils/import-row-readiness';
import type {
  ImportRequirementFailure,
  ImportReviewRow,
} from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import {
  getImportContinueGateMessage,
  getImportRequirementFailures,
  getImportRequirementIssueRowIds,
  summarizeImportRequirementIssues,
} from '@/lib/data-access/imports/importRequirementIssues';
import {
  IMPORT_REVIEW_CONTINUE_SUPERSEDED_MESSAGE,
  resolveImportContinueRowIds,
  resolveImportContinueRows,
} from '@/lib/data-access/imports';
import { setImportFinalizePreviewSession } from '@/lib/data-access/imports/importFinalizePreviewSession';
import { useContinueImportDraft } from '@/lib/data-access/imports/useContinueImportDraft';
import { useGetAccounts } from '@/lib/data-access/accounts';
import { importDraftFinalizeRoute } from '@/lib/navigation';
import { useGetCategories } from '@/lib/data-access/categories';
import { useGetHouseholdMembers } from '@/lib/data-access/household';
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
  rows?: ImportReviewRow[];
  isLoading?: boolean;
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  flush: () => Promise<boolean>;
  inboundIssues?: ImportRequirementFailure[];
}

const getEmptyDraftDescription = (rows: ImportReviewRow[]): string => {
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
  flush,
  inboundIssues = [],
}: ImportDraftReviewProps) => {
  const navigate = useNavigate();
  const { data: categories = [] } = useGetCategories();
  const { data: orgMembers = [] } = useGetHouseholdMembers();
  const {
    data: accounts,
    isPending: accountsPending,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useGetAccounts(true);
  const accountsStatus = accountsPending
    ? 'pending'
    : accountsError && !accounts
      ? 'error'
      : 'success';
  const handleRefetchAccounts = useCallback(() => {
    void refetchAccounts();
  }, [refetchAccounts]);
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

    const continueRows = resolveImportContinueRows(draftId, rows);
    const rowIds = resolveImportContinueRowIds(draftId, rows);
    const noneSelected = getImportReviewContinueBlockerReason(continueRows);
    if (noneSelected) {
      toast.error(formatImportReviewContinueBlocker(noneSelected));
      return;
    }
    try {
      const preview = await continueImport(rowIds);
      if (!preview) {
        toast.info(IMPORT_REVIEW_CONTINUE_SUPERSEDED_MESSAGE);
        return;
      }
      setImportFinalizePreviewSession(draftId, { rowIds, preview });
      setIssues([]);
      await navigate(importDraftFinalizeRoute(draftId));
    } catch (error) {
      const failures = getImportRequirementFailures(error);
      setIssues(failures);
      if (failures.length > 0) {
        presentImportRequirementIssues(failures);
      } else {
        toast.error(getImportContinueGateMessage(error));
      }
    }
  }, [draftId, flush, flushPendingInputs, continueImport, navigate, rows]);

  const showEmptyState = !isLoading && meta && !hasReviewableRows;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <ImportDraftReviewHeader
        meta={meta}
        rows={rows}
        isLoading={isLoading}
        isContinuing={isPending}
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
            accounts={accounts ?? []}
            accountsStatus={accountsStatus}
            refetchAccounts={handleRefetchAccounts}
            categories={categories}
            orgMembers={orgMembers}
            updateRow={updateRow}
          >
            <ImportDraftReviewTable
              key={meta.id}
              draftId={meta.id}
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
