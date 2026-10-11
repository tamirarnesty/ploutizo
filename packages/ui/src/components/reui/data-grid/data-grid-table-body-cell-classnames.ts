import { type Cell } from '@tanstack/react-table';
import { type DataGridProps } from '@/components/reui/data-grid/data-grid';
import {
  dataGridBodyCellSpacingVariants,
  dataGridTablePinnedBodyCellClasses,
} from '@/components/reui/data-grid/data-grid-table-shared';
import { cn } from '@/lib/utils';

export const getDataGridTableBodyCellClassName = <TData>(
  cell: Cell<TData, unknown>,
  tableLayout: DataGridProps<object>['tableLayout'],
  tableClassNames: DataGridProps<object>['tableClassNames'],
  edgeColumnCount: number
) => {
  const { column } = cell;
  const bodyCellSpacing = dataGridBodyCellSpacingVariants({
    size: tableLayout?.dense ? 'dense' : 'default',
  });

  return cn(
    'align-middle',
    bodyCellSpacing,
    tableLayout?.cellBorder && 'border-e',
    tableLayout?.columnsResizable && column.getCanResize() && 'truncate',
    cell.column.columnDef.meta?.cellClassName,
    tableLayout?.columnsPinnable &&
      column.getCanPin() &&
      dataGridTablePinnedBodyCellClasses,
    column.getIndex() === 0 || column.getIndex() === edgeColumnCount - 1
      ? tableClassNames?.edgeCell
      : ''
  );
};
