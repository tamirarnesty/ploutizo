'use client';

import { flexRender } from '@tanstack/react-table';
import type { HeaderGroup } from '@tanstack/react-table';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
} from '@/components/reui/data-grid/data-grid-table';

export const DataGridTableVirtualHeader = <TData,>() => {
  const { table, props } = useDataGrid();

  return (
    <DataGridTableHead>
      {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
        <DataGridTableHeadRow headerGroup={headerGroup} key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const { column } = header;

            return (
              <DataGridTableHeadRowCell header={header} key={header.id}>
                {header.isPlaceholder ? null : props.tableLayout
                    ?.columnsResizable && column.getCanResize() ? (
                  <div className="truncate">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </div>
                ) : (
                  flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )
                )}
                {props.tableLayout?.columnsResizable &&
                  column.getCanResize() && (
                    <DataGridTableHeadRowCellResize header={header} />
                  )}
              </DataGridTableHeadRowCell>
            );
          })}
        </DataGridTableHeadRow>
      ))}
    </DataGridTableHead>
  );
};
