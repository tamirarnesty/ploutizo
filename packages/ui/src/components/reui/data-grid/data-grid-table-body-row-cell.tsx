'use client';

import type { Cell, Column } from '@tanstack/react-table';
import type { CSSProperties, ReactNode } from 'react';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  getDataGridCssColumnWidth,
  getDataGridUsesCssColumnSizing,
} from '@/components/reui/data-grid/data-grid-column-layout';
import { getDataGridTableColumnPinPresentation } from '@/components/reui/data-grid/data-grid-table-cell-pinning';
import { getDataGridTablePinningStyles } from '@/components/reui/data-grid/data-grid-table-pinning';
import {
  dataGridBodyCellSpacingVariants,
  dataGridTablePinnedBodyCellClasses,
} from '@/components/reui/data-grid/data-grid-table-shared';
import { getDataGridTableBodyCellClassName } from '@/components/reui/data-grid/data-grid-table-body-cell-classnames';
import { cn } from '@/lib/utils';

export const DataGridTableBodyRowCell = <TData,>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  cell: Cell<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) => {
  const { props } = useDataGrid();
  const { column, row } = cell;
  const pinPresentation = getDataGridTableColumnPinPresentation(column);
  const edgeColumnCount = row.getVisibleCells().length;

  return (
    <td
      key={cell.id}
      ref={dndRef}
      {...(props.tableLayout?.columnsDraggable && !pinPresentation.isPinned
        ? { cell }
        : {})}
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
        ...(dndStyle ? dndStyle : null),
      }}
      data-pinned={pinPresentation.isPinned || undefined}
      data-last-col={pinPresentation.dataLastCol}
      className={getDataGridTableBodyCellClassName(
        cell,
        props.tableLayout,
        props.tableClassNames,
        edgeColumnCount
      )}
    >
      {children}
    </td>
  );
};

export const DataGridTableBodyRowSkeletonCell = <TData,>({
  children,
  column,
}: {
  children: ReactNode;
  column: Column<TData>;
}) => {
  const { props, table } = useDataGrid();
  const edgeColumnCount = table.getVisibleFlatColumns().length;

  return (
    <td
      style={
        getDataGridUsesCssColumnSizing(props.tableLayout)
          ? {
              width: getDataGridCssColumnWidth(
                `--col-${column.id}-size`,
                column.columnDef.meta?.grow
              ),
            }
          : undefined
      }
      className={cn(
        'align-middle',
        dataGridBodyCellSpacingVariants({
          size: props.tableLayout?.dense ? 'dense' : 'default',
        }),
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          'truncate',
        column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          dataGridTablePinnedBodyCellClasses,
        column.getIndex() === 0 || column.getIndex() === edgeColumnCount - 1
          ? props.tableClassNames?.edgeCell
          : ''
      )}
    >
      {children}
    </td>
  );
};
