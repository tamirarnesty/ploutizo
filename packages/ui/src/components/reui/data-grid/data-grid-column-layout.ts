import { type Table } from '@tanstack/react-table';

import { type DataGridProps } from './data-grid';

export type DataGridTableLayout = NonNullable<
  DataGridProps<object>['tableLayout']
>;

/** CSS-var column sizing (resize handles and/or grow-to-fill). */
export const getDataGridUsesCssColumnSizing = (
  tableLayout?: DataGridTableLayout
) => Boolean(tableLayout?.columnsResizable || tableLayout?.columnsFill);

export const getDataGridGrowColumn = <TData extends object>(
  table: Table<TData>
) =>
  table.getVisibleLeafColumns().find((column) => column.columnDef.meta?.grow);

/** Trailing filler col: resizable grids without a grow column. */
export const getDataGridShowTrailingFillColumn = <TData extends object>(
  tableLayout: DataGridTableLayout | undefined,
  table: Table<TData>
) => Boolean(tableLayout?.columnsResizable && !getDataGridGrowColumn(table));

export const getDataGridCssColumnWidth = (cssVar: string, grow?: boolean) =>
  grow
    ? `calc(var(${cssVar}) * 1px + var(--data-grid-fill-size, 0px))`
    : `calc(var(${cssVar}) * 1px)`;
