'use client';

import type { Cell, Row } from '@tanstack/react-table';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  getDataGridCssColumnWidth,
  getDataGridUsesCssColumnSizing,
} from '@/components/reui/data-grid/data-grid-column-layout';
import { getDataGridTableColumnPinPresentation } from '@/components/reui/data-grid/data-grid-table-cell-pinning';
import { getDataGridTablePinningStyles } from '@/components/reui/data-grid/data-grid-table-pinning';
import { getDataGridTableBodyCellClassName } from '@/components/reui/data-grid/data-grid-table-body-cell-classnames';

export const DataGridTableBodyRowExpandedPinnedCell = <TData,>({
  cell,
  row,
}: {
  cell: Cell<TData, unknown>;
  row: Row<TData>;
}) => {
  const { props } = useDataGrid();
  const { column } = cell;
  const pinPresentation = getDataGridTableColumnPinPresentation(column);

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
      data-pinned={pinPresentation.isPinned || undefined}
      data-last-col={pinPresentation.dataLastCol}
      className={getDataGridTableBodyCellClassName(
        cell,
        props.tableLayout,
        props.tableClassNames,
        row.getVisibleCells().length
      )}
    />
  );
};
