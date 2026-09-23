'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/context-menu';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';

export const DATA_GRID_ROW_ID_ATTR = 'data-grid-row-id';

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

type RowContextMenuRegistration<TData> = {
  registerRowContextMenu: (row: TData) => void;
};

const DataGridRowContextMenuContext =
  createContext<RowContextMenuRegistration<unknown> | null>(null);

/** Registers the TanStack row before the viewport context menu opens. */
export const useDataGridRowContextMenuRegistration = <
  TData,
>(): RowContextMenuRegistration<TData> | null => {
  const context = useContext(DataGridRowContextMenuContext);
  return context as RowContextMenuRegistration<TData> | null;
};

type DataGridRowContextMenuShellProps<TData extends object> = {
  renderRowContextMenu: (row: TData) => ReactNode;
  children: ReactNode;
};

/**
 * Single context menu for a data grid table viewport. Body and expanded rows call
 * `registerRowContextMenu` on `contextmenu`; header right-clicks cancel open.
 * Native browser menu may still be suppressed inside the trigger.
 */
export const DataGridRowContextMenuShell = <TData extends object>({
  renderRowContextMenu,
  children,
}: DataGridRowContextMenuShellProps<TData>) => {
  const { table } = useDataGrid();
  const [activeRow, setActiveRow] = useState<TData | null>(null);
  const activeRowRef = useRef<TData | null>(null);
  const pendingRowRef = useRef<TData | null>(null);

  const registerRowContextMenu = useCallback((row: TData) => {
    pendingRowRef.current = row;
    activeRowRef.current = row;
    setActiveRow(row);
  }, []);

  const registration = useMemo(
    () => ({ registerRowContextMenu }),
    [registerRowContextMenu]
  );

  const displayedRow = activeRow ?? activeRowRef.current;

  return (
    <DataGridRowContextMenuContext.Provider
      value={registration as RowContextMenuRegistration<unknown>}
    >
      <ContextMenu
        onOpenChange={(open, eventDetails) => {
          if (!open) {
            activeRowRef.current = null;
            pendingRowRef.current = null;
            setActiveRow(null);
            return;
          }

          if (!pendingRowRef.current) {
            const resolved = resolveRowFromContextMenuTarget<TData>(
              eventDetails.event.target,
              table
            );
            if (resolved) {
              activeRowRef.current = resolved;
              setActiveRow(resolved);
            }
          }

          if (!pendingRowRef.current && !activeRowRef.current) {
            eventDetails.cancel();
            return;
          }

          pendingRowRef.current = null;
        }}
      >
        <ContextMenuTrigger className="block w-full min-w-0 select-text">
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {displayedRow ? renderRowContextMenu(displayedRow) : null}
        </ContextMenuContent>
      </ContextMenu>
    </DataGridRowContextMenuContext.Provider>
  );
};
