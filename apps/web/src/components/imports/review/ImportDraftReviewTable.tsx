import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTable } from '@tanstack/react-table';
import {
  DataGrid,
  DataGridContainer,
} from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { dataGridFeatures } from '@ploutizo/ui/components/reui/data-grid/data-grid-features';
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
import {
  ImportReviewColumnsRuntimeContext,
  buildImportReviewColumns,
} from './buildImportReviewColumns';
import { focusImportReviewRow } from './focusImportReviewRow';
import { useStableImportReviewTableRows } from './useStableImportReviewTableRows';
import type { ImportReviewColumnsRuntime } from './buildImportReviewColumns';
import type { RefObject } from 'react';
import type {
  ColumnPinningState,
  ExpandedState,
  PaginationState,
  SortingState,
  Updater,
} from '@tanstack/react-table';
import type { ImportReviewTableRow } from './useStableImportReviewTableRows';
import type { ImportDraftReviewState } from '../lib/useImportDraftReviewState';

const NO_SORTING: SortingState = [];

const INITIAL_COLUMN_PINNING: ColumnPinningState = {
  start: ['selection'],
  end: [],
};

interface ImportDraftReviewGridHandlers {
  onSortingChange: (updater: Updater<SortingState>) => void;
  onPaginationChange: (updater: Updater<PaginationState>) => void;
}

interface ImportDraftReviewGridProps {
  draftId: string;
  tableRows: ImportReviewTableRow[];
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  recordCount: number;
  isLoading: boolean;
  focusRowId: string | null;
  headerChecked: boolean;
  headerIndeterminate: boolean;
  hasSelectableRows: boolean;
  initialExpanded: ExpandedState;
  runtimeRef: RefObject<ImportReviewColumnsRuntime>;
  handlersRef: RefObject<ImportDraftReviewGridHandlers>;
}

const ImportDraftReviewGrid = memo(
  ({
    draftId,
    tableRows,
    pageIndex,
    pageSize,
    sorting,
    recordCount,
    isLoading,
    focusRowId,
    initialExpanded,
    runtimeRef,
    handlersRef,
  }: ImportDraftReviewGridProps) => {
    const columns = useMemo(
      () => buildImportReviewColumns({ draftId, runtimeRef }),
      [draftId, runtimeRef]
    );
    const onSortingChange = useCallback(
      (updater: Updater<SortingState>) => {
        handlersRef.current.onSortingChange(updater);
      },
      [handlersRef]
    );
    const onPaginationChange = useCallback(
      (updater: Updater<PaginationState>) => {
        handlersRef.current.onPaginationChange(updater);
      },
      [handlersRef]
    );
    const table = useTable({
      features: dataGridFeatures,
      data: tableRows,
      columns,
      enableColumnResizing: false,
      initialState: {
        expanded: initialExpanded,
        columnPinning: INITIAL_COLUMN_PINNING,
      },
      state: {
        pagination: { pageIndex, pageSize },
        sorting,
      },
      manualSorting: true,
      onSortingChange,
      onPaginationChange,
      getRowId: (row) => row.id,
      getRowCanExpand: () => true,
    });
    const tableRef = useRef(table);
    useLayoutEffect(() => {
      tableRef.current = table;
    });

    useEffect(() => {
      if (!focusRowId) return;
      tableRef.current.setExpanded((current) => {
        if (current === true || current[focusRowId]) return current;
        return { ...current, [focusRowId]: true };
      });
      const frame = window.requestAnimationFrame(() => {
        focusImportReviewRow(focusRowId);
      });
      return () => window.cancelAnimationFrame(frame);
    }, [focusRowId]);

    return (
      <div className="flex max-h-full min-h-0 w-full min-w-0 flex-col">
        <DataGrid
          table={table}
          recordCount={recordCount}
          isLoading={isLoading}
          tableLayout={{
            width: 'fixed',
            dense: true,
            columnsResizable: true,
            columnsPinnable: true,
            headerSticky: true,
          }}
          tableClassNames={{
            bodyRow: '[&:has(+tr:not([data-row-id]))>td]:border-b-0',
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
  },
  (prev, next) =>
    prev.draftId === next.draftId &&
    prev.tableRows === next.tableRows &&
    prev.pageIndex === next.pageIndex &&
    prev.pageSize === next.pageSize &&
    prev.sorting === next.sorting &&
    prev.recordCount === next.recordCount &&
    prev.isLoading === next.isLoading &&
    prev.focusRowId === next.focusRowId &&
    prev.headerChecked === next.headerChecked &&
    prev.headerIndeterminate === next.headerIndeterminate &&
    prev.hasSelectableRows === next.hasSelectableRows &&
    prev.initialExpanded === next.initialExpanded &&
    prev.runtimeRef === next.runtimeRef &&
    prev.handlersRef === next.handlersRef
);

interface ImportDraftReviewTableProps {
  draftId?: string;
  reviewState: ImportDraftReviewState;
  focusRowId?: string | null;
}

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
  // A newly focused row clears the sort so the row shows where the issue list points.
  const [sortingState, setSortingState] = useState<{
    value: SortingState;
    focusRowId: string | null;
  }>({ value: [], focusRowId });
  const sorting =
    focusRowId !== null && sortingState.focusRowId !== focusRowId
      ? NO_SORTING
      : sortingState.value;
  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      setSortingState({
        value: typeof updater === 'function' ? updater(sorting) : updater,
        focusRowId,
      });
      setPagination((current) =>
        current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
      );
    },
    [focusRowId, setPagination, sorting]
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

  const runtimeRef = useRef<ImportReviewColumnsRuntime>({
    headerChecked,
    headerIndeterminate,
    onHeaderCheckedChange: setAllSelection,
    isLoading,
    hasSelectableRows,
    onSelectionChange: setRowSelection,
  });
  const handlersRef = useRef<ImportDraftReviewGridHandlers>({
    onSortingChange,
    onPaginationChange: setPagination,
  });
  useLayoutEffect(() => {
    runtimeRef.current = {
      headerChecked,
      headerIndeterminate,
      onHeaderCheckedChange: setAllSelection,
      isLoading,
      hasSelectableRows,
      onSelectionChange: setRowSelection,
    };
    handlersRef.current = {
      onSortingChange,
      onPaginationChange: setPagination,
    };
  });

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

  const columnsRuntime = useMemo(
    () => ({
      headerChecked,
      headerIndeterminate,
      onHeaderCheckedChange: setAllSelection,
      isLoading,
      hasSelectableRows,
      onSelectionChange: setRowSelection,
    }),
    [
      hasSelectableRows,
      headerChecked,
      headerIndeterminate,
      isLoading,
      setAllSelection,
      setRowSelection,
    ]
  );

  return (
    <ImportReviewColumnsRuntimeContext.Provider value={columnsRuntime}>
      <ImportDraftReviewGrid
        draftId={draftId ?? ''}
        tableRows={tableRows}
        pageIndex={tablePagination.pageIndex}
        pageSize={tablePagination.pageSize}
        sorting={sorting}
        recordCount={rows.length}
        isLoading={isLoading}
        focusRowId={focusRowId}
        headerChecked={headerChecked}
        headerIndeterminate={headerIndeterminate}
        hasSelectableRows={hasSelectableRows}
        initialExpanded={initialExpanded}
        runtimeRef={runtimeRef}
        handlersRef={handlersRef}
      />
    </ImportReviewColumnsRuntimeContext.Provider>
  );
};
