import { type Row, type Table } from '@tanstack/react-table';
import { type DataGridTablePinnedBoundary } from '@/components/reui/data-grid/data-grid-table-body-row';

/** Row grouping for the data grid table. Kept out of the component module so that file only exports components. */

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

  for (const [index, row] of topRows.entries()) {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === topRows.length - 1 &&
        (centerRows.length > 0 || bottomRows.length > 0)
          ? 'top'
          : undefined,
    });
  }

  for (const row of centerRows) {
    resolvedRows.push({ row });
  }

  for (const [index, row] of bottomRows.entries()) {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === 0 && (centerRows.length > 0 || topRows.length > 0)
          ? 'bottom'
          : undefined,
    });
  }

  return resolvedRows;
};
