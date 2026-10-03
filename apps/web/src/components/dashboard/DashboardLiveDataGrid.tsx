import { CardContent } from '@ploutizo/ui/components/card';
import { DataGrid } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DataGridScrollArea } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';
import { DataGridTable } from '@ploutizo/ui/components/reui/data-grid/data-grid-table';
import type { DataGridProps } from '@ploutizo/ui/components/reui/data-grid/data-grid';
import { DashboardLiveCard } from '@/components/dashboard/DashboardLiveCard';
import { dashboardLiveCardErrorMessage } from '@/components/dashboard/dashboardLiveCardErrorMessage';
import { PAGINATED_DATA_GRID_SCROLL_ORIENTATION } from '@/components/data-grid/dataGridSharedLayout';
import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';

type DashboardLiveDataGridProps<TData extends object> = {
  table: Table<TData>;
  recordCount: number;
  isLoading: boolean;
  title: string;
  /** Lowercase resource phrase for the error message, e.g. "card balances". */
  errorResource: string;
  isError: boolean;
  action?: ReactNode;
  className?: string;
  tableClassNames?: DataGridProps<TData>['tableClassNames'];
  children: ReactNode;
};

export const DashboardLiveDataGrid = <TData extends object>({
  table,
  recordCount,
  isLoading,
  title,
  errorResource,
  isError,
  action,
  className,
  tableClassNames,
  children,
}: DashboardLiveDataGridProps<TData>) => (
  <DataGrid
    table={table}
    recordCount={recordCount}
    isLoading={isLoading}
    tableLayout={{
      width: 'auto',
      dense: true,
    }}
    tableClassNames={tableClassNames}
  >
    <DashboardLiveCard
      title={title}
      action={action}
      isLoading={isLoading}
      isError={isError}
      errorMessage={dashboardLiveCardErrorMessage(errorResource)}
      className={className}
    >
      {children}
    </DashboardLiveCard>
  </DataGrid>
);

type DashboardLiveDataGridScrollTableProps = {
  cardContentClassName?: string;
};

export const DashboardLiveDataGridScrollTable = ({
  cardContentClassName = 'border-b px-0 py-0',
}: DashboardLiveDataGridScrollTableProps) => (
  <CardContent className={cardContentClassName}>
    <DataGridScrollArea orientation={PAGINATED_DATA_GRID_SCROLL_ORIENTATION}>
      <DataGridTable />
    </DataGridScrollArea>
  </CardContent>
);
