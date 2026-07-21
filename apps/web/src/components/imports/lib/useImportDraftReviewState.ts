import { useCallback, useEffect, useMemo } from 'react';
import {
  canContinueImportReview,
  getImportReviewContinueBlocker,
  getSelectableImportRows,
} from '@ploutizo/utils/import-row-readiness';
import type { ImportDraft, ImportDraftRow, OrgMember } from '@ploutizo/types';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import {
  useUpdateImportDraftRow,
  useUpdateImportDraftRowSelection,
} from '@/lib/data-access/imports';
import { useFlushPendingInputs } from '@/lib/money/pending-input-flush';
import type { PaginationState } from '@tanstack/react-table';

const getImportReviewPageCount = (rowCount: number, pageSize: number) =>
  rowCount === 0 ? 1 : Math.max(1, Math.ceil(rowCount / pageSize));

interface UseImportDraftReviewStateOptions {
  draft?: ImportDraft;
  orgMembers?: OrgMember[];
  isLoading?: boolean;
}

export const useImportDraftReviewState = ({
  draft,
  orgMembers = [],
  isLoading = false,
}: UseImportDraftReviewStateOptions) => {
  const flushPendingInputs = useFlushPendingInputs();
  const updateRow = useUpdateImportDraftRow();
  const updateRowSelection = useUpdateImportDraftRowSelection();
  const { pagination, setPagination } = usePersistedPageSize('import-review');

  const rows = draft?.rows ?? [];
  const selectableRows = useMemo(() => getSelectableImportRows(rows), [rows]);
  const validAssigneeMemberIds = useMemo(
    () => new Set(orgMembers.map((member) => member.id)),
    [orgMembers]
  );
  const continueOptions = useMemo(
    () => (orgMembers.length > 0 ? { validAssigneeMemberIds } : undefined),
    [orgMembers.length, validAssigneeMemberIds]
  );

  const { pageIndex, pageSize } = pagination;
  const pageCount = getImportReviewPageCount(rows.length, pageSize);
  const currentPageRows = useMemo(
    () => rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [pageIndex, pageSize, rows]
  );
  const currentPageSelectableRows = useMemo(
    () => getSelectableImportRows(currentPageRows),
    [currentPageRows]
  );

  const canContinue = draft
    ? canContinueImportReview(rows, continueOptions)
    : false;
  const continueBlocker = draft
    ? getImportReviewContinueBlocker(rows, continueOptions)
    : null;
  const hasReviewableRows = selectableRows.length > 0;

  useEffect(() => {
    if (pageIndex <= pageCount - 1) return;
    setPagination({ pageIndex: pageCount - 1, pageSize });
  }, [pageCount, pageIndex, pageSize, setPagination]);

  const selectedCount = currentPageSelectableRows.filter(
    (row) => row.selectedForImport
  ).length;
  const totalSelectable = currentPageSelectableRows.length;
  const headerChecked =
    totalSelectable > 0 && selectedCount === totalSelectable;
  const headerIndeterminate =
    selectedCount > 0 && selectedCount < totalSelectable;

  const setRowSelection = useCallback(
    (row: ImportDraftRow, selectedForImport: boolean) => {
      if (!draft || row.selectedForImport === selectedForImport) return;
      updateRow.mutate({
        draftId: draft.id,
        rowId: row.id,
        body: { selectedForImport },
      });
    },
    [draft, updateRow]
  );

  const setAllSelection = useCallback(
    (selectedForImport: boolean) => {
      if (!draft) return;
      const rowIds = currentPageSelectableRows
        .filter((row) => row.selectedForImport !== selectedForImport)
        .map((row) => row.id);
      if (rowIds.length === 0) return;
      flushPendingInputs();
      updateRowSelection.mutate({
        draftId: draft.id,
        body: { rowIds, selectedForImport },
      });
    },
    [currentPageSelectableRows, draft, flushPendingInputs, updateRowSelection]
  );

  return {
    pagination,
    setPagination,
    rows,
    currentPageSelectableRows,
    headerChecked,
    headerIndeterminate,
    setRowSelection,
    setAllSelection,
    canContinue,
    continueBlocker,
    hasReviewableRows,
    isLoading,
  };
};

export type ImportDraftReviewState = ReturnType<
  typeof useImportDraftReviewState
>;

export const countImportReviewPageRows = (
  totalRows: number,
  pageIndex: number,
  pageSize: number
): number => {
  if (totalRows === 0) return 0;
  const remaining = totalRows - pageIndex * pageSize;
  return Math.min(pageSize, Math.max(0, remaining));
};

export const resolveImportReviewTablePagination = (
  pagination: PaginationState,
  effectivePageSize: number
): PaginationState =>
  effectivePageSize === pagination.pageSize
    ? pagination
    : { ...pagination, pageSize: effectivePageSize };
