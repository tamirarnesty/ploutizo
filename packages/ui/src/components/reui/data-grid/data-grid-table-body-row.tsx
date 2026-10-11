import type { Row, Table } from '@tanstack/react-table';
import type { CSSProperties, ReactNode, Ref } from 'react';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import { getDataGridRowContextMenuRowProps } from '@/components/reui/data-grid/data-grid-row-context-menu-props';
import { getDataGridShowTrailingFillColumn } from '@/components/reui/data-grid/data-grid-column-layout';
import {
  getDataGridTableBodyRowClassName,
  getDataGridTableExpandedRowClassName,
  splitExpandedRowCells,
} from '@/components/reui/data-grid/data-grid-table-body-row-classnames';
import {
  assignDataGridTableRef,
  getDataGridBodyRowBorderEnabled,
} from '@/components/reui/data-grid/data-grid-table-shared';
import { DataGridTableBodyRowExpandedPinnedCell } from '@/components/reui/data-grid/data-grid-table-body-row-expanded-pinned-cell';
import { DataGridTableFillBodyCell } from '@/components/reui/data-grid/data-grid-table-trailing-fill';

export type DataGridTablePinnedBoundary = 'top' | 'bottom';

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
}: {
  children: ReactNode;
  row: Row<TData>;
  pinnedBoundary?: DataGridTablePinnedBoundary;
  rowRef?: Ref<HTMLTableRowElement>;
  dndRef?: Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
}) => {
  const { props, table } = useDataGrid();
  const stampRowContextMenuIdentity = Boolean(props.renderRowContextMenu);
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
      className={getDataGridTableBodyRowClassName(props, table, {
        isExpanded,
        isRowPinned,
        pinnedBoundary,
        showRowBorder,
      })}
    >
      {children}
      <DataGridTableFillBodyCell />
    </tr>
  );
};

export const DataGridTableBodyRowExpanded = <TData,>({
  row,
}: {
  row: Row<TData>;
}) => {
  const { props, table } = useDataGrid();
  const stampRowContextMenuIdentity = Boolean(props.renderRowContextMenu);
  const expandedContent = getDataGridTableExpandedContent(table, row);

  if (!expandedContent) return null;

  const rowBorder = props.tableLayout?.rowBorder ?? false;
  const expandedRowClassName = getDataGridTableExpandedRowClassName(props);
  const { visibleCells, leftCells, centerCells, rightCells } =
    splitExpandedRowCells(row);
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
