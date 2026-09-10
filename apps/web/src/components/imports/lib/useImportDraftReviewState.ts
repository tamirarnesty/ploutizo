import { useCallback, useEffect, useMemo } from 'react';
import { getSelectableImportRows } from '@ploutizo/utils/import-row-readiness';
import type { ImportDraftRow, OrgMember } from '@ploutizo/types';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { useFlushPendingInputs } from '@/lib/money/pending-input-flush';
import { prioritizeImportRows } from './importPresentation';
import type { PaginationState, Updater } from '@tanstack/react-table';

interface UseImportDraftReviewStateOptions {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  priorityRowIds?: readonly string[];
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
  hasReviewableRows: boolean;
  isLoading: boolean;
}

export const useImportDraftReviewState = ({
  meta,
  rows: sessionRows = [],
  isLoading = false,
  setSelection,
  priorityRowIds = [],
}: UseImportDraftReviewStateOptions): ImportDraftReviewState => {
  const flushPendingInputs = useFlushPendingInputs();
  const { pagination, setPagination } = usePersistedPageSize('import-review');

  const rows = useMemo(
    () => prioritizeImportRows(sessionRows, priorityRowIds),
    [priorityRowIds, sessionRows]
  );
  const selectableRows = useMemo(() => getSelectableImportRows(rows), [rows]);

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

  const hasReviewableRows = selectableRows.length > 0;

  useEffect(() => {
    if (priorityRowIds.length === 0 || pageIndex === 0) return;
    setPagination({ pageIndex: 0, pageSize });
  }, [pageIndex, pageSize, priorityRowIds, setPagination]);

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

  const applySelection = useCallback(
    (rowIds: string[], selectedForImport: boolean) => {
      if (!meta || rowIds.length === 0) return;
      flushPendingInputs();
      setSelection(rowIds, selectedForImport);
    },
    [flushPendingInputs, meta, setSelection]
  );

  const setRowSelection = useCallback(
    (row: ImportDraftRow, selectedForImport: boolean) => {
      if (row.selectedForImport === selectedForImport) return;
      applySelection([row.id], selectedForImport);
    },
    [applySelection]
  );

  const setAllSelection = useCallback(
    (selectedForImport: boolean) => {
      const rowIds = currentPageSelectableRows
        .filter((row) => row.selectedForImport !== selectedForImport)
        .map((row) => row.id);
      applySelection(rowIds, selectedForImport);
    },
    [applySelection, currentPageSelectableRows]
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
