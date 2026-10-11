import { type Row, type Table } from '@tanstack/react-table';
import { type DataGridProps } from '@/components/reui/data-grid/data-grid';
import { dataGridRowBorderClasses } from '@/components/reui/data-grid/data-grid-table-shared';
import { cn } from '@/lib/utils';

export const getDataGridTableBodyRowClassName = <TData extends object>(
  props: DataGridProps<TData>,
  table: Table<TData>,
  options: {
    isExpanded: boolean;
    isRowPinned: boolean | string;
    pinnedBoundary?: 'top' | 'bottom';
    showRowBorder: boolean;
  }
) =>
  cn(
    'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
    props.onRowClick && 'cursor-pointer',
    !props.tableLayout?.stripped && dataGridRowBorderClasses,
    props.tableLayout?.cellBorder && '*:last:border-e-0',
    props.tableLayout?.stripped &&
      'odd:bg-muted/90 hover:bg-transparent odd:hover:bg-muted',
    table.options.enableRowSelection && '*:first:relative',
    props.tableLayout?.rowsPinnable &&
      options.isRowPinned &&
      'bg-muted/30 hover:bg-muted/50',
    options.pinnedBoundary === 'top' &&
      '[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)]',
    options.pinnedBoundary === 'bottom' &&
      '[&>td]:shadow-[0_2px_0_rgba(0,0,0,0.03)]',
    props.tableClassNames?.bodyRow
  );

export const getDataGridTableExpandedRowClassName = <TData extends object>(
  props: DataGridProps<TData>
) => cn(!props.tableLayout?.stripped && dataGridRowBorderClasses);

export const splitExpandedRowCells = <TData>(row: Row<TData>) => {
  const visibleCells = row.getVisibleCells();
  return {
    visibleCells,
    leftCells: visibleCells.filter(
      (cell) => cell.column.getIsPinned() === 'left'
    ),
    centerCells: visibleCells.filter((cell) => !cell.column.getIsPinned()),
    rightCells: visibleCells.filter(
      (cell) => cell.column.getIsPinned() === 'right'
    ),
  };
};
