import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import { DataGridPagination } from '@ploutizo/ui/components/reui/data-grid/data-grid-pagination';
import {
  VIEWPORT_FILLED_DATA_GRID_CONTAINER_CLASSNAME,
  VIEWPORT_FILLED_DATA_GRID_PAGINATION_CLASSNAME,
  VIEWPORT_FILLED_DATA_GRID_SCROLL_AREA_CLASSNAME,
  VIEWPORT_FILLED_DATA_GRID_SCROLL_ORIENTATION,
  VIEWPORT_FILLED_DATA_GRID_SHELL_CLASSNAME,
} from '@/components/data-grid/dataGridSharedLayout';
import { useEffectiveTablePageSize } from '@/hooks/useEffectiveTablePageSize';
import { IMPORT_REVIEW_PAGE_SIZE_OPTIONS } from '@/lib/prefs';
import { shouldDefaultExpandImportRow } from '../lib/importPresentation';
import { sortImportReviewRows } from '../lib/sortImportReviewRows';
import {
  countImportReviewPageRows,
  resolveImportReviewTablePagination,
} from '../lib/useImportDraftReviewState';
import { useOptionalImportDraftReviewContext } from './ImportDraftReviewContext';
import { buildImportReviewColumns } from './buildImportReviewColumns';
import { ImportReviewRowScope } from './ImportReviewRowScope';
import { useStableImportReviewTableRows } from './useStableImportReviewTableRows';
import type { SortingState, Updater } from '@tanstack/react-table';
import type { ImportReviewTableRow } from './useStableImportReviewTableRows';
import type { ReactNode } from 'react';
import type { ImportDraftReviewState } from '../lib/useImportDraftReviewState';

interface ImportDraftReviewTableProps {
  draftId?: string;
  reviewState: ImportDraftReviewState;
  focusRowId?: string | null;
}

export const focusImportReviewRow = (rowId: string) => {
  const target = document.getElementById(`import-row-${rowId}`);
  if (!target) return;
  target.focus();
  target.scrollIntoView({ block: 'nearest' });
};

export const ImportDraftReviewTable = ({
  draftId,
  reviewState,
  focusRowId = null,
}: ImportDraftReviewTableProps) => {
  const {
    pagination,
    setPagination,
    rows,
    headerChecked,
    headerIndeterminate,
    setRowSelection,
    setAllSelection,
    hasSelectableRows,
    isLoading,
  } = reviewState;

  const { pageIndex, pageSize } = pagination;

  const loadedVisibleRowCount = isLoading
    ? 0
    : countImportReviewPageRows(rows.length, pageIndex, pageSize);

  const effectivePageSize = useEffectiveTablePageSize(
    'import-review',
    pageSize,
    loadedVisibleRowCount,
    isLoading
  );

  const tablePagination = useMemo(
    () => resolveImportReviewTablePagination(pagination, effectivePageSize),
    [pagination, effectivePageSize]
  );

  const reviewContext = useOptionalImportDraftReviewContext();
  const [sorting, setSorting] = useState<SortingState>([]);
  useEffect(() => {
    if (!focusRowId) return;
    setSorting([]);
  }, [focusRowId]);
  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSorting(updater);
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
      );
    },
    [setPagination]
  );
  const sortedRows = useMemo(
    () =>
      sortImportReviewRows(rows, sorting, {
        categories: reviewContext?.categories ?? [],
        accounts: reviewContext?.accounts ?? [],
        orgMembers: reviewContext?.orgMembers ?? [],
      }),
    [
      reviewContext?.accounts,
      reviewContext?.categories,
      reviewContext?.orgMembers,
      rows,
      sorting,
    ]
  );
  const tableRows = useStableImportReviewTableRows(sortedRows);

  const columns = useMemo(
    () =>
      buildImportReviewColumns({
        draftId: draftId ?? '',
        headerChecked,
        headerIndeterminate,
        onHeaderCheckedChange: setAllSelection,
        isLoading,
        hasSelectableRows,
        onSelectionChange: setRowSelection,
      }),
    [
      draftId,
      hasSelectableRows,
      headerChecked,
      headerIndeterminate,
      isLoading,
      setAllSelection,
      setRowSelection,
    ]
  );

  // Parent remounts this table per draft (`key={draft.id}`).
  const [initialExpanded] = useState(() =>
    Object.fromEntries(
      rows
        .filter(
          (row) => shouldDefaultExpandImportRow(row) || row.id === focusRowId
        )
        .map((row) => [row.id, true] as const)
    )
  );

  const table = useReactTable({
    data: tableRows,
    columns,
    enableColumnResizing: false,
    initialState: {
      expanded: initialExpanded,
    },
    state: {
      pagination: tablePagination,
      sorting,
      columnPinning: { left: ['selection'] },
    },
    manualSorting: true,
    onSortingChange,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const renderBodyRow = useCallback(
    (row: ImportReviewTableRow, content: ReactNode) => {
      if (!draftId) return content;
      const expandedState = table.getState().expanded;
      const expanded = expandedState === true || Boolean(expandedState[row.id]);
      return (
        <ImportReviewRowScope
          draftId={draftId}
          rowId={row.id}
          expanded={expanded}
        >
          {content}
        </ImportReviewRowScope>
      );
    },
    [draftId, table]
  );

  useEffect(() => {
    if (!focusRowId) return;
    table.setExpanded((current) =>
      current === true ? current : { ...current, [focusRowId]: true }
    );
    const frame = window.requestAnimationFrame(() => {
      focusImportReviewRow(focusRowId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRowId, table]);

  return (
    <div className="flex max-h-full min-h-0 w-full min-w-0 flex-col">
      <DataGrid<ImportReviewTableRow>
        table={table}
        recordCount={rows.length}
        isLoading={isLoading}
        renderBodyRow={renderBodyRow}
        tableLayout={{
          width: 'fixed',
          dense: true,
          columnsFill: true,
          columnsPinnable: true,
          headerSticky: true,
          rowBorderWhenExpanded: false,
        }}
      >
        <div className={VIEWPORT_FILLED_DATA_GRID_SHELL_CLASSNAME}>
          <DataGridContainer
            className={VIEWPORT_FILLED_DATA_GRID_CONTAINER_CLASSNAME}
          >
            <DataGridScrollArea
              className={VIEWPORT_FILLED_DATA_GRID_SCROLL_AREA_CLASSNAME}
              orientation={VIEWPORT_FILLED_DATA_GRID_SCROLL_ORIENTATION}
            >
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
          <DataGridPagination
            sizes={[...IMPORT_REVIEW_PAGE_SIZE_OPTIONS]}
            className={VIEWPORT_FILLED_DATA_GRID_PAGINATION_CLASSNAME}
          />
        </div>
      </DataGrid>
    </div>
  );
};
