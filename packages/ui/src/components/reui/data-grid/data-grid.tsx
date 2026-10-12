'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  Column,
  ColumnFiltersState,
  RowData,
  SortingState,
  Table,
} from '@tanstack/react-table';

import { cn } from '@/lib/utils';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerTitle?: string;
    headerClassName?: string;
    cellClassName?: string;
    /** Absorbs leftover viewport width when `tableLayout.columnsFill` is enabled. */
    grow?: boolean;
    skeleton?: ReactNode;
    expandedContent?: (row: TData) => ReactNode;
  }
}

export type DataGridApiFetchParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  filters?: ColumnFiltersState;
  searchQuery?: string;
};

export type DataGridApiResponse<T> = {
  data: Array<T>;
  empty: boolean;
  pagination: {
    total: number;
    page: number;
  };
};

export interface DataGridContextProps<TData extends object> {
  props: DataGridProps<TData>;
  table: Table<TData>;
  recordCount: number;
  isLoading: boolean;
}

export type DataGridRequestParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
};

export interface DataGridProps<TData extends object> {
  className?: string;
  table?: Table<TData>;
  recordCount: number;
  children?: ReactNode;
  onRowClick?: (row: TData) => void;
  /** Menu items for right-click / long-press on body and expanded rows. */
  renderRowContextMenu?: (row: TData) => ReactNode;
  /** Wrap each body row (main + expanded `<tr>` siblings). Provider-friendly — no extra DOM node. */
  renderBodyRow?: (row: TData, content: ReactNode) => ReactNode;
  isLoading?: boolean;
  loadingMode?: 'skeleton' | 'spinner';
  loadingMessage?: ReactNode | string;
  fetchingMoreMessage?: ReactNode | string;
  allRowsLoadedMessage?: ReactNode | string;
  emptyMessage?: ReactNode | string;
  tableLayout?: {
    dense?: boolean;
    cellBorder?: boolean;
    rowBorder?: boolean;
    /** Bottom border on the body row while expanded. Defaults to `rowBorder`. */
    rowBorderWhenExpanded?: boolean;
    rowRounded?: boolean;
    stripped?: boolean;
    headerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    width?: 'auto' | 'fixed';
    columnsVisibility?: boolean;
    columnsResizable?: boolean;
    /** Measure viewport slack and give it to the column with `meta.grow`. */
    columnsFill?: boolean;
    columnsResizeMode?: 'onChange' | 'onEnd';
    columnsPinnable?: boolean;
    columnsMovable?: boolean;
    columnsDraggable?: boolean;
    rowsDraggable?: boolean;
    rowsPinnable?: boolean;
  };
  tableClassNames?: {
    base?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
    body?: string;
    bodyRow?: string;
    footer?: string;
    edgeCell?: string;
  };
}

const DataGridContext = createContext<DataGridContextProps<any> | undefined>(
  undefined
);

function useDataGrid() {
  const context = useContext(DataGridContext);
  if (!context) {
    throw new Error('useDataGrid must be used within a DataGridProvider');
  }
  return context;
}

type TableLayoutOptions = NonNullable<DataGridProps<object>['tableLayout']>;
type TableClassNameOptions = NonNullable<
  DataGridProps<object>['tableClassNames']
>;

const parseSerializedPartial = <T extends object>(
  serialized: string
): Partial<T> =>
  serialized === 'null' ? {} : (JSON.parse(serialized) as Partial<T>);

function DataGridProvider<TData extends object>({
  children,
  table,
  recordCount,
  isLoading = false,
  loadingMode,
  loadingMessage,
  fetchingMoreMessage,
  allRowsLoadedMessage,
  emptyMessage,
  onRowClick,
  renderRowContextMenu,
  renderBodyRow,
  className,
  tableLayout,
  tableClassNames,
}: DataGridProps<TData> & { table: Table<TData> }) {
  const tableState = table.getState();
  const resolvedColumnsResizeMode = tableLayout?.columnsResizeMode ?? 'onEnd';

  // Keep resize mode aligned with the DataGrid contract every render so
  // consumer-level useReactTable options cannot flip it back between drags.
  if (tableLayout?.columnsResizable) {
    table.options.columnResizeMode = resolvedColumnsResizeMode;
  }

  const tableLayoutKey = JSON.stringify(tableLayout ?? null);
  const tableClassNamesKey = JSON.stringify(tableClassNames ?? null);

  const { sorting, pagination, columnFilters } = tableState;
  const {
    rowSelection,
    expanded,
    columnVisibility,
    columnOrder,
    columnPinning,
    globalFilter,
  } = tableState;

  // Memoize context value so consumers don't re-render during column resize.
  // Column sizing state is intentionally excluded from deps -- CSS variables
  // on the <table> element handle width updates without React re-renders.
  // The table state fields below are deps only: they invalidate the value
  // when row models derived from them change.
  const value = useMemo(() => {
    const contextTableLayout = JSON.parse(tableLayoutKey) as TableLayoutOptions;
    const contextTableClassNames = JSON.parse(
      tableClassNamesKey
    ) as TableClassNameOptions;

    return {
      props: {
        recordCount,
        isLoading,
        loadingMode,
        loadingMessage,
        fetchingMoreMessage,
        allRowsLoadedMessage,
        emptyMessage,
        onRowClick,
        renderRowContextMenu,
        renderBodyRow,
        className,
        tableLayout: contextTableLayout,
        tableClassNames: contextTableClassNames,
      },
      table,
      recordCount,
      isLoading,
    };
  }, [
    table,
    recordCount,
    isLoading,
    loadingMode,
    loadingMessage,
    fetchingMoreMessage,
    allRowsLoadedMessage,
    emptyMessage,
    onRowClick,
    renderRowContextMenu,
    renderBodyRow,
    className,
    tableLayoutKey,
    tableClassNamesKey,
    sorting,
    pagination,
    columnFilters,
    rowSelection,
    expanded,
    columnVisibility,
    columnOrder,
    columnPinning,
    globalFilter,
  ]);

  return (
    <DataGridContext.Provider value={value}>
      {children}
    </DataGridContext.Provider>
  );
}

const DEFAULT_TABLE_LAYOUT: NonNullable<DataGridProps<object>['tableLayout']> =
  {
    dense: false,
    cellBorder: false,
    rowBorder: true,
    rowRounded: false,
    stripped: false,
    headerSticky: false,
    headerBackground: true,
    headerBorder: true,
    width: 'fixed',
    columnsVisibility: false,
    columnsResizable: false,
    columnsResizeMode: 'onEnd',
    columnsPinnable: false,
    columnsMovable: false,
    columnsDraggable: false,
    rowsDraggable: false,
    rowsPinnable: false,
  };

const DEFAULT_TABLE_CLASS_NAMES: NonNullable<
  DataGridProps<object>['tableClassNames']
> = {
  base: '',
  header: '',
  headerRow: '',
  headerSticky: 'sticky top-0 z-15 bg-background/90 backdrop-blur-xs',
  body: '',
  bodyRow: '',
  footer: '',
  edgeCell: '',
};

function DataGrid<TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TData>) {
  // Serialize layout props so merged objects stay referentially stable across
  // parent re-renders (e.g. column resize) when values are unchanged.
  const tableLayoutKey = JSON.stringify(props.tableLayout ?? null);
  const tableClassNamesKey = JSON.stringify(props.tableClassNames ?? null);
  const tableLayout = useMemo(
    () => ({
      ...DEFAULT_TABLE_LAYOUT,
      ...parseSerializedPartial<TableLayoutOptions>(tableLayoutKey),
    }),
    [tableLayoutKey]
  );
  const tableClassNames = useMemo(
    () => ({
      ...DEFAULT_TABLE_CLASS_NAMES,
      ...parseSerializedPartial<TableClassNameOptions>(tableClassNamesKey),
    }),
    [tableClassNamesKey]
  );

  const mergedProps: DataGridProps<TData> = {
    loadingMode: 'skeleton',
    ...props,
    tableLayout,
    tableClassNames,
  };

  // Ensure table is provided
  if (!table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  return (
    <DataGridProvider table={table} {...mergedProps}>
      {children}
    </DataGridProvider>
  );
}

function DataGridContainer({
  children,
  className,
  border = true,
}: {
  children: ReactNode;
  className?: string;
  border?: boolean;
}) {
  return (
    <div
      data-slot="data-grid"
      className={cn(
        'w-full overflow-hidden',
        border && 'rounded-lg border border-border',
        className
      )}
    >
      {children}
    </div>
  );
}

export { useDataGrid, DataGridProvider, DataGrid, DataGridContainer };
