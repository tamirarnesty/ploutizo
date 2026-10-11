import { type Row, type Table } from '@tanstack/react-table';

export const getDataGridTableRowSections = <TData>(
  table: Table<TData>,
  rowsPinnable?: boolean
) => {
  if (!rowsPinnable) {
    return {
      topRows: [] as Row<TData>[],
      centerRows: table.getRowModel().rows,
      bottomRows: [] as Row<TData>[],
    };
  }

  return {
    topRows: table.getTopRows(),
    centerRows: table.getCenterRows(),
    bottomRows: table.getBottomRows(),
  };
};
