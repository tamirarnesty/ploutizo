import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import { getDataGridShowTrailingFillColumn } from '@/components/reui/data-grid/data-grid-column-layout';

export const DataGridTableFillHeadCell = () => {
  const { props, table } = useDataGrid();

  if (!getDataGridShowTrailingFillColumn(props.tableLayout, table)) return null;

  return (
    <th
      aria-hidden="true"
      data-slot="data-grid-table-fill-head-cell"
      style={{ width: 'var(--data-grid-fill-size, 0px)' }}
      className="p-0"
    />
  );
};

export const DataGridTableFillBodyCell = () => {
  const { props, table } = useDataGrid();

  if (!getDataGridShowTrailingFillColumn(props.tableLayout, table)) return null;

  return (
    <td
      aria-hidden="true"
      data-slot="data-grid-table-fill-body-cell"
      style={{ width: 'var(--data-grid-fill-size, 0px)' }}
      className="p-0"
    />
  );
};

export const DataGridTableFillFootCell = () => {
  const { props, table } = useDataGrid();

  if (!getDataGridShowTrailingFillColumn(props.tableLayout, table)) return null;

  return (
    <td
      aria-hidden="true"
      data-slot="data-grid-table-fill-foot-cell"
      style={{ width: 'var(--data-grid-fill-size, 0px)' }}
      className="border-t p-0"
    />
  );
};
