import { useRef, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@ploutizo/ui/components/context-menu';
import { useDataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import type { ReactNode } from 'react';

const resolveRowFromContextMenuTarget = <TData extends object>(
  target: EventTarget | null,
  rows: readonly { id: string; original: TData }[]
): TData | null => {
  if (!(target instanceof Element)) return null;
  const rowElement = target.closest('tbody tr[data-row-id]');
  if (!(rowElement instanceof HTMLTableRowElement)) return null;
  const rowId = rowElement.getAttribute('data-row-id');
  if (!rowId) return null;
  const row = rows.find((entry) => entry.id === rowId);
  return row?.original ?? null;
};

type DataGridRowContextMenuProps<TData extends object> = {
  renderMenu: (row: TData) => ReactNode;
  children: ReactNode;
};

/**
 * Right-click menu for body rows. The grid stamps `data-row-id` on each body
 * `<tr>`; header clicks and anything outside a body row cancel the menu.
 */
export const DataGridRowContextMenu = <TData extends object>({
  renderMenu,
  children,
}: DataGridRowContextMenuProps<TData>) => {
  const { table } = useDataGrid<TData>();
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
          table.getRowModel().rows
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
        {displayedRow ? renderMenu(displayedRow) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};
