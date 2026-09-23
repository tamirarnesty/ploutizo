'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/context-menu';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';

export const DATA_GRID_ROW_ID_ATTR = 'data-grid-row-id';

/** Stamped on body and expanded `<tr>` when `renderRowContextMenu` is enabled. */
export const getDataGridRowContextMenuRowProps = (rowId: string) => ({
  [DATA_GRID_ROW_ID_ATTR]: rowId,
});

const resolveRowFromContextMenuTarget = <TData extends object>(
  target: EventTarget | null,
  table: ReturnType<typeof useDataGrid>['table']
): TData | null => {
  if (!(target instanceof Element)) return null;
  const rowElement = target.closest(`tbody tr[${DATA_GRID_ROW_ID_ATTR}]`);
  if (!(rowElement instanceof HTMLTableRowElement)) return null;
  const rowId = rowElement.getAttribute(DATA_GRID_ROW_ID_ATTR);
  if (!rowId) return null;
  const row = table.getRowModel().rows.find((entry) => entry.id === rowId);
  return row?.original ?? null;
};

type DataGridRowContextMenuShellProps<TData extends object> = {
  renderRowContextMenu: (row: TData) => ReactNode;
  children: ReactNode;
};

/**
 * Single viewport context menu for a data grid. On open, resolves the TanStack row
 * from the event target via `data-grid-row-id` on the nearest body `<tr>`; header
 * and other targets cancel open. `select-text` on the trigger preserves cell copy;
 * the native browser menu is suppressed inside the trigger.
 */
export const DataGridRowContextMenuShell = <TData extends object>({
  renderRowContextMenu,
  children,
}: DataGridRowContextMenuShellProps<TData>) => {
  const { table } = useDataGrid();
  const [openRow, setOpenRow] = useState<TData | null>(null);
  const contentRowRef = useRef<TData | null>(null);

  const displayedRow = openRow ?? contentRowRef.current;

  return (
    <ContextMenu
      onOpenChange={(open, eventDetails) => {
        if (!open) {
          setOpenRow(null);
          return;
        }

        const resolved = resolveRowFromContextMenuTarget<TData>(
          eventDetails.event.target,
          table
        );
        if (!resolved) {
          eventDetails.cancel();
          return;
        }

        contentRowRef.current = resolved;
        setOpenRow(resolved);
      }}
    >
      <ContextMenuTrigger className="block w-full min-w-0 select-text">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {displayedRow ? renderRowContextMenu(displayedRow) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};
