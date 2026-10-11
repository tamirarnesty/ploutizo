'use client';

import { memo } from 'react';
import type { Row, Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import {
  DataGridTableEmpty,
  DataGridTableRenderedRow,
} from '@/components/reui/data-grid/data-grid-table';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/spinner';

export type DataGridTableVirtualBodyProps<TData> = {
  table: Table<TData>;
  columnCount: number;
  topRows: Array<Row<TData>>;
  centerRows: Array<Row<TData>>;
  bottomRows: Array<Row<TData>>;
  virtualItems: Array<VirtualItem>;
  totalSize: number;
  isVirtualizationEnabled: boolean;
  isInfiniteMode: boolean;
  isFetchingMore: boolean;
  hasMore?: boolean;
  loadingMoreMessage: ReactNode;
  allRowsLoadedMessage: ReactNode;
  measureRowRef?: (element: HTMLTableRowElement | null) => void;
};

const DataGridTableVirtualSpacer = ({
  columnCount,
  height,
}: {
  columnCount: number;
  height: number;
}) => {
  if (height <= 0) return null;

  return (
    <tr aria-hidden="true">
      <td colSpan={columnCount} style={{ height, padding: 0 }} />
    </tr>
  );
};

const DataGridTableVirtualStatusRow = ({
  children,
  className,
  columnCount,
}: {
  children: ReactNode;
  className?: string;
  columnCount: number;
}) => (
  <tr>
    <td
      colSpan={columnCount}
      className={cn(
        'py-4 text-center text-sm text-muted-foreground',
        className
      )}
    >
      {children}
    </td>
  </tr>
);

const appendTopRows = <TData,>(
  rows: Array<ReactNode>,
  topRows: Array<Row<TData>>,
  hasMiddleSection: boolean
) => {
  topRows.forEach((row, index) => {
    rows.push(
      <DataGridTableRenderedRow
        key={row.id}
        row={row}
        pinnedBoundary={
          index === topRows.length - 1 && hasMiddleSection ? 'top' : undefined
        }
      />
    );
  });
};

const appendCenterRows = <TData,>(
  rows: Array<ReactNode>,
  options: {
    centerRows: Array<Row<TData>>;
    columnCount: number;
    virtualItems: Array<VirtualItem>;
    totalSize: number;
    isVirtualizationEnabled: boolean;
    hasCenterRows: boolean;
    measureRowRef?: (element: HTMLTableRowElement | null) => void;
  }
) => {
  const {
    centerRows,
    columnCount,
    virtualItems,
    totalSize,
    isVirtualizationEnabled,
    hasCenterRows,
    measureRowRef,
  } = options;

  if (!isVirtualizationEnabled) {
    centerRows.forEach((row) => {
      rows.push(<DataGridTableRenderedRow key={row.id} row={row} />);
    });
    return;
  }

  const leadingSpacerHeight =
    hasCenterRows && virtualItems.length > 0
      ? (virtualItems[0]?.start ?? 0)
      : 0;
  const trailingSpacerHeight =
    hasCenterRows && virtualItems.length > 0
      ? Math.max(
          0,
          totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0)
        )
      : 0;

  if (leadingSpacerHeight > 0) {
    rows.push(
      <DataGridTableVirtualSpacer
        key="virtual-spacer-start"
        columnCount={columnCount}
        height={leadingSpacerHeight}
      />
    );
  }

  virtualItems.forEach((virtualRow) => {
    const row = centerRows[virtualRow.index];
    if (!row) return;
    rows.push(
      <DataGridTableRenderedRow key={row.id} row={row} rowRef={measureRowRef} />
    );
  });

  if (trailingSpacerHeight > 0) {
    rows.push(
      <DataGridTableVirtualSpacer
        key="virtual-spacer-end"
        columnCount={columnCount}
        height={trailingSpacerHeight}
      />
    );
  }
};

const appendBottomRows = <TData,>(
  rows: Array<ReactNode>,
  bottomRows: Array<Row<TData>>,
  topRows: Array<Row<TData>>,
  hasMiddleSection: boolean
) => {
  bottomRows.forEach((row, index) => {
    rows.push(
      <DataGridTableRenderedRow
        key={row.id}
        row={row}
        pinnedBoundary={
          index === 0 && (topRows.length > 0 || hasMiddleSection)
            ? 'bottom'
            : undefined
        }
      />
    );
  });
};

const DataGridTableVirtualBody = <TData,>({
  table,
  columnCount,
  topRows,
  centerRows,
  bottomRows,
  virtualItems,
  totalSize,
  isVirtualizationEnabled,
  isInfiniteMode,
  isFetchingMore,
  hasMore,
  loadingMoreMessage,
  allRowsLoadedMessage,
  measureRowRef,
}: DataGridTableVirtualBodyProps<TData>) => {
  const totalRows = topRows.length + centerRows.length + bottomRows.length;

  if (!totalRows) return <DataGridTableEmpty />;

  const hasCenterRows = centerRows.length > 0;
  const showFetchingRow = isInfiniteMode && isFetchingMore;
  const showCompleteRow = isInfiniteMode && hasMore === false && totalRows > 0;
  const hasMiddleSection = hasCenterRows || showFetchingRow || showCompleteRow;
  const renderedRows: Array<ReactNode> = [];

  appendTopRows(renderedRows, topRows, hasMiddleSection);
  appendCenterRows(renderedRows, {
    centerRows,
    columnCount,
    virtualItems,
    totalSize,
    isVirtualizationEnabled,
    hasCenterRows,
    measureRowRef,
  });

  if (showFetchingRow) {
    renderedRows.push(
      <DataGridTableVirtualStatusRow
        key="virtual-status-loading"
        columnCount={columnCount}
      >
        <div className="flex items-center justify-center gap-2">
          <Spinner className="size-4 opacity-60" />
          {loadingMoreMessage}
        </div>
      </DataGridTableVirtualStatusRow>
    );
  }

  if (showCompleteRow) {
    renderedRows.push(
      <DataGridTableVirtualStatusRow
        key="virtual-status-complete"
        columnCount={columnCount}
        className="py-3 text-xs"
      >
        {allRowsLoadedMessage}
      </DataGridTableVirtualStatusRow>
    );
  }

  appendBottomRows(renderedRows, bottomRows, topRows, hasMiddleSection);

  return <>{renderedRows}</>;
};

export const MemoizedDataGridTableVirtualBody = memo(
  DataGridTableVirtualBody,
  (_prev, next) => !!next.table.getState().columnSizingInfo.isResizingColumn
) as typeof DataGridTableVirtualBody;
