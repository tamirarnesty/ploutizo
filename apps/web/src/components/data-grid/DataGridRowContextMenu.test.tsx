/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useMemo } from 'react';
import { useTable } from '@tanstack/react-table';
import { ContextMenuItem } from '@ploutizo/ui/components/context-menu';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { dataGridFeatures } from '@ploutizo/ui/components/reui/data-grid/data-grid-features';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import type { DataGridFeatures } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridRowContextMenu } from './DataGridRowContextMenu';
import type { ColumnDef } from '@tanstack/react-table';

type DemoRow = { id: string; label: string };

const columns: ColumnDef<DataGridFeatures, DemoRow>[] = [
  { accessorKey: 'label', header: 'Label' },
];

const DataGridContextMenuHarness = () => {
  const data = useMemo<DemoRow[]>(() => [{ id: '1', label: 'Coffee' }], []);
  const tableColumns = useMemo(() => columns, []);
  const table = useTable({
    features: dataGridFeatures,
    data,
    columns: tableColumns,
    manualPagination: true,
    getRowId: (row) => row.id,
  });

  return (
    <DataGrid table={table} recordCount={data.length}>
      <DataGridRowContextMenu<DemoRow>
        renderMenu={(row) => (
          <>
            <ContextMenuItem>Edit {row.label}</ContextMenuItem>
            <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
          </>
        )}
      >
        <DataGridTable />
      </DataGridRowContextMenu>
    </DataGrid>
  );
};

afterEach(() => {
  cleanup();
});

describe('DataGridRowContextMenu', () => {
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
