/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach } from 'vitest';
import { describe, expect, it } from 'vitest';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ContextMenuItem } from '@/components/context-menu';
import { DataGrid } from '@/components/reui/data-grid/data-grid';
import { DataGridTable } from '@/components/reui/data-grid/data-grid-table';

type DemoRow = { id: string; label: string };

const columns: ColumnDef<DemoRow>[] = [
  { accessorKey: 'label', header: 'Label' },
];

const DataGridContextMenuHarness = () => {
  const data: DemoRow[] = [{ id: '1', label: 'Coffee' }];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      renderRowContextMenu={(row) => (
        <>
          <ContextMenuItem>Edit {row.label}</ContextMenuItem>
          <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
        </>
      )}
    >
      <DataGridTable />
    </DataGrid>
  );
};

afterEach(() => {
  cleanup();
});

describe('DataGrid renderRowContextMenu', () => {
  it('opens menu items from a body row right-click', async () => {
    render(<DataGridContextMenuHarness />);

    fireEvent.contextMenu(screen.getByText('Coffee'));

    const menu = await screen.findByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['Edit Coffee', 'Delete']);
  });

  it('does not open the row menu from a header right-click', () => {
    render(<DataGridContextMenuHarness />);

    fireEvent.contextMenu(screen.getByRole('columnheader', { name: 'Label' }));

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
