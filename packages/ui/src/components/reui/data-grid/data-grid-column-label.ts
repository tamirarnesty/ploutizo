import { type Column } from '@tanstack/react-table';

/** Label for headers / column visibility: `meta.headerTitle`, string `columnDef.header`, or `column.id`. */
export const getColumnHeaderLabel = <TData, TValue>(
  column: Column<TData, TValue>
): string => {
  const meta = column.columnDef.meta as { headerTitle?: string } | undefined;
  if (typeof meta?.headerTitle === 'string') return meta.headerTitle;
  const defHeader = column.columnDef.header;
  if (typeof defHeader === 'string') return defHeader;
  return String(column.id);
};
