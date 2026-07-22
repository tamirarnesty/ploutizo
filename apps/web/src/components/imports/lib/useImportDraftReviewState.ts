import { useCallback, useEffect, useMemo } from 'react';
import {
  canContinueImportReview,
  getImportReviewContinueBlocker,
  getSelectableImportRows,
} from '@ploutizo/utils/import-row-readiness';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import {
  useUpdateImportDraftRow,
  useUpdateImportDraftRowSelection,
} from '@/lib/data-access/imports';
import { useFlushPendingInputs } from '@/lib/money/pending-input-flush';
import type { PaginationState, Updater } from '@tanstack/react-table';

interface UseImportDraftReviewStateOptions {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  orgMembers?: OrgMember[];
  isLoading?: boolean;
}

export interface ImportDraftReviewState {
  pagination: PaginationState;
  setPagination: (updater: Updater<PaginationState>) => void;
  rows: ImportDraftRow[];
  currentPageSelectableRows: ImportDraftRow[];
  headerChecked: boolean;
  headerIndeterminate: boolean;
  setRowSelection: (row: ImportDraftRow, selectedForImport: boolean) => void;
  setAllSelection: (selectedForImport: boolean) => void;
  canContinue: boolean;
  continueBlocker: string | null;
  hasReviewableRows: boolean;
  isLoading: boolean;
}

export const useImportDraftReviewState = ({
  meta,
  rows: sessionRows = [],
  orgMembers = [],
  isLoading = false,
}: UseImportDraftReviewStateOptions): ImportDraftReviewState => {
  const flushPendingInputs = useFlushPendingInputs();
  const updateRow = useUpdateImportDraftRow();
  const updateRowSelection = useUpdateImportDraftRowSelection();
  const { pagination, setPagination } = usePersistedPageSize('import-review');

  const rows = sessionRows;
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
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPageRows = useMemo(
    () => rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [pageIndex, pageSize, rows]
  );
  const currentPageSelectableRows = useMemo(
    () => getSelectableImportRows(currentPageRows),
    [currentPageRows]
  );

  const canContinue = meta
    ? canContinueImportReview(rows, continueOptions)
    : false;
  const continueBlocker = meta
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
      if (!meta || row.selectedForImport === selectedForImport) return;
      flushPendingInputs();
      updateRow.mutate({
        draftId: meta.id,
        rowId: row.id,
        body: { selectedForImport },
      });
    },
    [flushPendingInputs, meta, updateRow]
  );

  const setAllSelection = useCallback(
    (selectedForImport: boolean) => {
      if (!meta) return;
      const rowIds = currentPageSelectableRows
        .filter((row) => row.selectedForImport !== selectedForImport)
        .map((row) => row.id);
      if (rowIds.length === 0) return;
      flushPendingInputs();
      updateRowSelection.mutate({
        draftId: meta.id,
        body: { rowIds, selectedForImport },
      });
    },
    [currentPageSelectableRows, flushPendingInputs, meta, updateRowSelection]
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
