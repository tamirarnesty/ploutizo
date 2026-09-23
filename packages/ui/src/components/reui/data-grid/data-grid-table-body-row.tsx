import { cva } from 'class-variance-authority';
import type { Cell, Row, Table } from '@tanstack/react-table';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import { getDataGridRowContextMenuRowProps } from '@/components/reui/data-grid/data-grid-row-context-menu';
import {
  getDataGridCssColumnWidth,
  getDataGridShowTrailingFillColumn,
  getDataGridUsesCssColumnSizing,
} from '@/components/reui/data-grid/data-grid-column-layout';
import { getDataGridTablePinningStyles } from '@/components/reui/data-grid/data-grid-table-pinning';
import {
  assignDataGridTableRef,
  dataGridRowBorderClasses,
  getDataGridBodyRowBorderEnabled,
} from '@/components/reui/data-grid/data-grid-table-shared';
import { DataGridTableFillBodyCell } from '@/components/reui/data-grid/data-grid-table-trailing-fill';
import { cn } from '@/lib/utils';

const bodyCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2 py-1.5',
      default: 'px-3 py-2',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export type DataGridTablePinnedBoundary = 'top' | 'bottom';

const DataGridTableBodyRowExpandedPinnedCell = <TData,>({
  cell,
  row,
}: {
  cell: Cell<TData, unknown>;
  row: Row<TData>;
}) => {
  const { props } = useDataGrid();
  const { column } = cell;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned =
    isPinned === 'right' && column.getIsFirstColumn('right');
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <td
      aria-hidden="true"
      style={{
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getDataGridTablePinningStyles(column)),
        ...(getDataGridUsesCssColumnSizing(props.tableLayout) && {
          width: getDataGridCssColumnWidth(
            `--col-${column.id}-size`,
            cell.column.columnDef.meta?.grow
          ),
        }),
      }}
      data-pinned={isPinned || undefined}
      data-last-col={
        isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined
      }
      className={cn(
        'align-middle',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          'truncate',
        cell.column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          'data-pinned:backdrop-blur-xs" data-pinned:bg-background/90 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border',
        column.getIndex() === 0 ||
          column.getIndex() === row.getVisibleCells().length - 1
          ? props.tableClassNames?.edgeCell
          : ''
      )}
    />
  );
};

const getDataGridTableExpandedContent = <TData,>(
  table: Table<TData>,
  row: Row<TData>
) =>
  table
    .getAllColumns()
    .find((column) => column.columnDef.meta?.expandedContent)
    ?.columnDef.meta?.expandedContent?.(row.original);

export const DataGridTableBodyRow = <TData,>({
  children,
  row,
  pinnedBoundary,
  rowRef,
  dndRef,
  dndStyle,
  stampRowContextMenuIdentity = false,
}: {
  children: ReactNode;
  row: Row<TData>;
  pinnedBoundary?: DataGridTablePinnedBoundary;
  rowRef?: Ref<HTMLTableRowElement>;
  dndRef?: Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
  stampRowContextMenuIdentity?: boolean;
}) => {
  const { props, table } = useDataGrid();
  const isRowPinned = row.getIsPinned();
  const rowBorder = props.tableLayout?.rowBorder ?? false;
  const isExpanded = row.getIsExpanded();
  const showRowBorder = getDataGridBodyRowBorderEnabled(
    rowBorder,
    props.tableLayout?.rowBorderWhenExpanded,
    isExpanded
  );

  return (
    <tr
      {...(stampRowContextMenuIdentity
        ? getDataGridRowContextMenuRowProps(row.id)
        : undefined)}
      ref={(node) => {
        assignDataGridTableRef(rowRef, node);
        assignDataGridTableRef(dndRef, node);
      }}
      style={dndStyle ?? undefined}
      data-state={
        table.options.enableRowSelection && row.getIsSelected()
          ? 'selected'
          : undefined
      }
      data-expanded={isExpanded || undefined}
      data-row-border={showRowBorder || undefined}
      data-row-pinned={isRowPinned || undefined}
      data-row-pinned-boundary={pinnedBoundary}
      onClick={() => props.onRowClick && props.onRowClick(row.original)}
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped && dataGridRowBorderClasses,
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped &&
          'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
        table.options.enableRowSelection && '*:first:relative',
        props.tableLayout?.rowsPinnable &&
          isRowPinned &&
          'bg-muted/30 hover:bg-muted/50',
        pinnedBoundary === 'top' && '[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)]',
        pinnedBoundary === 'bottom' &&
          '[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)]',
        props.tableClassNames?.bodyRow
      )}
    >
      {children}
      <DataGridTableFillBodyCell />
    </tr>
  );
};

export const DataGridTableBodyRowExpandded = <TData,>({
  row,
  stampRowContextMenuIdentity = false,
}: {
  row: Row<TData>;
  stampRowContextMenuIdentity?: boolean;
}) => {
  const { props, table } = useDataGrid();
  const expandedContent = getDataGridTableExpandedContent(table, row);

  if (!expandedContent) return null;

  const rowBorder = props.tableLayout?.rowBorder ?? false;
  const expandedRowClassName = cn(
    !props.tableLayout?.stripped && dataGridRowBorderClasses
  );
  const visibleCells = row.getVisibleCells();
  const fillColumnCount = getDataGridShowTrailingFillColumn(
    props.tableLayout,
    table
  )
    ? 1
    : 0;
  const rowIdentityProps = stampRowContextMenuIdentity
    ? getDataGridRowContextMenuRowProps(row.id)
    : undefined;

  if (!props.tableLayout?.columnsPinnable) {
    return (
      <tr
        {...rowIdentityProps}
        data-row-border={rowBorder || undefined}
        className={expandedRowClassName}
      >
        <td colSpan={visibleCells.length + fillColumnCount}>
          {expandedContent}
        </td>
      </tr>
    );
  }

  const leftCells = visibleCells.filter(
    (cell) => cell.column.getIsPinned() === 'left'
  );
  const centerCells = visibleCells.filter((cell) => !cell.column.getIsPinned());
  const rightCells = visibleCells.filter(
    (cell) => cell.column.getIsPinned() === 'right'
  );

  return (
    <tr
      {...rowIdentityProps}
      data-row-border={rowBorder || undefined}
      className={expandedRowClassName}
    >
      {leftCells.map((cell) => (
        <DataGridTableBodyRowExpandedPinnedCell
          key={`expanded-${cell.id}`}
          cell={cell}
          row={row}
        />
      ))}
      <td
        colSpan={Math.max(centerCells.length, 1)}
        className="p-0 align-middle"
      >
        {expandedContent}
      </td>
      {rightCells.map((cell) => (
        <DataGridTableBodyRowExpandedPinnedCell
          key={`expanded-${cell.id}`}
          cell={cell}
          row={row}
        />
      ))}
      <DataGridTableFillBodyCell />
    </tr>
  );
};
