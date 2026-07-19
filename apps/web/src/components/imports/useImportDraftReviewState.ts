import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImportDraftRow } from '@ploutizo/types';
import type { UpdateImportDraftRowInput } from '@ploutizo/validators';
import type { ImportDraftMeta } from '@/lib/data-access/imports';
import { usePersistedPageSize } from '@/hooks/persistedPageSize';
import { useFlushPendingInputs } from '@/lib/money/pending-input-flush';
import { shouldDefaultExpandImportRow } from './importPresentation';
import {
  canContinueImportReview,
  getImportReviewContinueBlocker,
  getSelectableImportRows,
} from './importRowSelection';
import type { ExpandedState, PaginationState } from '@tanstack/react-table';

const getImportReviewPageCount = (rowCount: number, pageSize: number) =>
  rowCount === 0 ? 1 : Math.max(1, Math.ceil(rowCount / pageSize));

const expandedSetToState = (ids: Set<string>): ExpandedState => {
  const state: Record<string, boolean> = {};
  for (const id of ids) {
    state[id] = true;
  }
  return state;
};

const expandedStateToSet = (state: ExpandedState): Set<string> => {
  if (state === true) {
    return new Set();
  }
  return new Set(
    Object.entries(state)
      .filter(([, expanded]) => expanded)
      .map(([id]) => id)
  );
};

interface UseImportDraftReviewStateOptions {
  meta?: ImportDraftMeta;
  rows?: ImportDraftRow[];
  isLoading?: boolean;
  updateRow: (rowId: string, patch: UpdateImportDraftRowInput) => void;
  setSelection: (rowIds: string[], selectedForImport: boolean) => void;
  hasUnsavedWork: boolean;
}

export const useImportDraftReviewState = ({
  meta,
  rows: sessionRows = [],
  isLoading = false,
  updateRow,
  setSelection,
  hasUnsavedWork,
}: UseImportDraftReviewStateOptions) => {
  const flushPendingInputs = useFlushPendingInputs();
  const { pagination, setPagination } = usePersistedPageSize('import-review');
  const initializedExpansionDraftIdRef = useRef<string | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const rows = sessionRows;
  const selectableRows = useMemo(() => getSelectableImportRows(rows), [rows]);
  const defaultExpandedRowIds = useMemo(
    () =>
      new Set(
        rows
          .filter((row) => shouldDefaultExpandImportRow(row))
          .map((row) => row.id)
      ),
    [rows]
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

  const rowContinueBlocker = meta ? getImportReviewContinueBlocker(rows) : null;
  const continueBlocker = hasUnsavedWork
    ? 'Save your changes before continuing.'
    : rowContinueBlocker;
  const canContinue = meta
    ? canContinueImportReview(rows) && !hasUnsavedWork
    : false;
  const hasReviewableRows = selectableRows.length > 0;

  useEffect(() => {
    if (pageIndex <= pageCount - 1) return;
    setPagination({ pageIndex: pageCount - 1, pageSize });
  }, [pageCount, pageIndex, pageSize, setPagination]);

  useEffect(() => {
    if (!meta) return;
    if (initializedExpansionDraftIdRef.current !== meta.id) {
      initializedExpansionDraftIdRef.current = meta.id;
      setExpanded(expandedSetToState(defaultExpandedRowIds));
      return;
    }

    const rowIds = new Set(rows.map((row) => row.id));
    setExpanded((current) => {
      const currentIds = expandedStateToSet(current);
      return expandedSetToState(
        new Set([...currentIds].filter((id) => rowIds.has(id)))
      );
    });
  }, [defaultExpandedRowIds, meta, rows]);

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
      updateRow(row.id, { selectedForImport });
    },
    [meta, updateRow]
  );

  const setAllSelection = useCallback(
    (selectedForImport: boolean) => {
      if (!meta) return;
      const rowIds = currentPageSelectableRows
        .filter((row) => row.selectedForImport !== selectedForImport)
        .map((row) => row.id);
      if (rowIds.length === 0) return;
      flushPendingInputs();
      setSelection(rowIds, selectedForImport);
    },
    [currentPageSelectableRows, meta, flushPendingInputs, setSelection]
  );

  const setRowExpanded = useCallback((rowId: string, nextExpanded: boolean) => {
    setExpanded((current) => {
      if (current === true) {
        return nextExpanded ? true : {};
      }
      if (nextExpanded) {
        return { ...current, [rowId]: true };
      }
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  }, []);

  const expandAllRows = useCallback(() => {
    setExpanded(expandedSetToState(new Set(rows.map((row) => row.id))));
  }, [rows]);

  const collapseAllRows = useCallback(() => {
    setExpanded({});
  }, []);

  const expandedRowIds = useMemo(
    () => expandedStateToSet(expanded),
    [expanded]
  );

  const allRowsExpanded =
    rows.length > 0 && rows.every((row) => expandedRowIds.has(row.id));

  const toggleAllRowsExpanded = useCallback(() => {
    if (allRowsExpanded) {
      collapseAllRows();
      return;
    }
    expandAllRows();
  }, [allRowsExpanded, collapseAllRows, expandAllRows]);

  const isRowExpanded = useCallback(
    (rowId: string) => expandedRowIds.has(rowId),
    [expandedRowIds]
  );

  return {
    pagination,
    setPagination,
    expanded,
    setExpanded,
    rows,
    currentPageSelectableRows,
    headerChecked,
    headerIndeterminate,
    setRowSelection,
    setAllSelection,
    setRowExpanded,
    isRowExpanded,
    toggleAllRowsExpanded,
    allRowsExpanded,
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
