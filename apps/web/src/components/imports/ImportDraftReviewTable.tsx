import { useMemo } from 'react';
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
import { buildImportReviewColumns } from './buildImportReviewColumns';
import { isImportRowSelectable } from './importRowSelection';
import {
  countImportReviewPageRows,
  resolveImportReviewTablePagination,
} from './useImportDraftReviewState';
import type { ImportDraftReviewState } from './useImportDraftReviewState';

interface ImportDraftReviewTableProps {
  reviewState: ImportDraftReviewState;
}

export const ImportDraftReviewTable = ({
  reviewState,
}: ImportDraftReviewTableProps) => {
  const {
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

  const columns = useMemo(
    () =>
      buildImportReviewColumns({
        headerChecked,
        headerIndeterminate,
        onHeaderCheckedChange: setAllSelection,
        onToggleAllExpanded: toggleAllRowsExpanded,
        allRowsExpanded,
        isLoading,
        hasSelectableRowsOnPage: currentPageSelectableRows.length > 0,
        onSelectionChange: setRowSelection,
        onExpandedChange: (row, nextExpanded) =>
          setRowExpanded(row.id, nextExpanded),
        isRowSelectable: isImportRowSelectable,
        isRowExpanded,
      }),
    [
      allRowsExpanded,
      currentPageSelectableRows.length,
      headerChecked,
      headerIndeterminate,
      isLoading,
      isRowExpanded,
      setAllSelection,
      setRowExpanded,
      setRowSelection,
      toggleAllRowsExpanded,
    ]
  );

  const table = useReactTable({
    data: rows,
    columns,
    enableColumnResizing: false,
    state: {
      pagination: tablePagination,
      expanded,
      columnPinning: { left: ['selection'] },
    },
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="flex max-h-full min-h-0 w-full min-w-0 flex-col">
      <DataGrid
        table={table}
        recordCount={rows.length}
        isLoading={isLoading}
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
