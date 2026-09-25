import { useCallback, useEffect, useMemo } from 'react';
import { computeImportDraftRowCounts } from '@ploutizo/utils/import-row-status';
import { getSelectableImportRows } from '@ploutizo/utils/import-row-readiness';
import type { ImportReviewRow } from '@ploutizo/types';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { useFlushPendingInputs } from '@/lib/money/pending-input-flush';
import { prioritizeImportRows } from './importPresentation';
import type { PaginationState, Updater } from '@tanstack/react-table';

interface UseImportDraftReviewStateOptions {
  meta?: ImportDraftMeta;
  rows?: ImportReviewRow[];
  isLoading?: boolean;
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  priorityRowIds?: readonly string[];
}

export interface ImportDraftReviewState {
  pagination: PaginationState;
  setPagination: (updater: Updater<PaginationState>) => void;
  rows: ImportReviewRow[];
  headerChecked: boolean;
  headerIndeterminate: boolean;
  setRowSelection: (rowId: string, selectedForImport: boolean) => void;
  setAllSelection: (selectedForImport: boolean) => void;
  hasSelectableRows: boolean;
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

  const hasReviewableRows = computeImportDraftRowCounts(rows).validRowCount > 0;

  useEffect(() => {
    if (priorityRowIds.length === 0 || pageIndex === 0) return;
    setPagination({ pageIndex: 0, pageSize });
  }, [pageIndex, pageSize, priorityRowIds, setPagination]);

  useEffect(() => {
    if (pageIndex <= pageCount - 1) return;
    setPagination({ pageIndex: pageCount - 1, pageSize });
  }, [pageCount, pageIndex, pageSize, setPagination]);

  const selectedCount = selectableRows.filter(
    (row) => row.selectedForImport
  ).length;
  const totalSelectable = selectableRows.length;
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
    (rowId: string, selectedForImport: boolean) => {
      const live = rows.find((row) => row.id === rowId);
      if (live?.selectedForImport === selectedForImport) return;
      applySelection([rowId], selectedForImport);
    },
    [applySelection, rows]
  );

  const setAllSelection = useCallback(
    (selectedForImport: boolean) => {
      const rowIds = selectableRows
        .filter((row) => row.selectedForImport !== selectedForImport)
        .map((row) => row.id);
      applySelection(rowIds, selectedForImport);
    },
    [applySelection, selectableRows]
  );

  return {
    pagination,
    setPagination,
    rows,
    headerChecked,
    headerIndeterminate,
    setRowSelection,
    setAllSelection,
    hasSelectableRows: totalSelectable > 0,
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
