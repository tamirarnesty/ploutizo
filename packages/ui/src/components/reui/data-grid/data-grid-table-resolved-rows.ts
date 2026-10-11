import { type Row, type Table } from '@tanstack/react-table';
import { type DataGridTablePinnedBoundary } from '@/components/reui/data-grid/data-grid-table-body-row';
import { getDataGridTableRowSections } from '@/components/reui/data-grid/data-grid-table-row-sections';

export const getDataGridTableResolvedRows = <TData>(
  table: Table<TData>,
  rowsPinnable?: boolean
) => {
  const { topRows, centerRows, bottomRows } = getDataGridTableRowSections(
    table,
    rowsPinnable
  );
  const resolvedRows: {
    row: Row<TData>;
    pinnedBoundary?: DataGridTablePinnedBoundary;
  }[] = [];

  topRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === topRows.length - 1 &&
        (centerRows.length > 0 || bottomRows.length > 0)
          ? 'top'
          : undefined,
    });
  });

  centerRows.forEach((row) => {
    resolvedRows.push({ row });
  });

  bottomRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === 0 && (centerRows.length > 0 || topRows.length > 0)
          ? 'bottom'
          : undefined,
    });
  });

  return resolvedRows;
};
