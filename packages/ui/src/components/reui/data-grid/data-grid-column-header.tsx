'use client';

import { memo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import type { Column } from '@tanstack/react-table';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import { getColumnHeaderLabel } from '@/components/reui/data-grid/data-grid-column-label';
import {
  getDataGridColumnHeaderClassNames,
  getDataGridColumnHeaderSortIcon,
} from '@/components/reui/data-grid/data-grid-column-header-utils';
import {
  DataGridColumnHeaderLabelView,
  DataGridColumnHeaderMenuView,
  DataGridColumnHeaderSortButtonView,
} from '@/components/reui/data-grid/data-grid-column-header-views';
import { useDataGridColumnHeaderMenuItems } from '@/components/reui/data-grid/data-grid-column-header-menu';

interface DataGridColumnHeaderProps<
  TData,
  TValue,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string;
  icon?: ReactNode;
  pinnable?: boolean;
  filter?: ReactNode;
  visibility?: boolean;
  /** Sort-menu labels. Defaults are the registry copy, "Asc" and "Desc". */
  ascendingLabel?: string;
  descendingLabel?: string;
}

const DataGridColumnHeaderInner = <TData, TValue>({
  column,
  title,
  icon,
  className,
  filter,
  visibility = false,
  ascendingLabel = 'Asc',
  descendingLabel = 'Desc',
}: DataGridColumnHeaderProps<TData, TValue>) => {
  const { isLoading, table, props, recordCount } = useDataGrid();
  const resolvedTitle = title ?? getColumnHeaderLabel(column);
  const { headerButtonClassName, headerLabelClassName } =
    getDataGridColumnHeaderClassNames(className);

  const columnOrder = table.getState().columnOrder;
  const columnVisibilityKey = JSON.stringify(table.getState().columnVisibility);
  const isSorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const canResize = column.getCanResize();
  const columnIndex = columnOrder.indexOf(column.id);
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex < columnOrder.length - 1;

  const handleSort = () => {
    if (isSorted === 'asc') {
      column.toggleSorting(true);
    } else if (isSorted === 'desc') {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  };

  const sortIcon = getDataGridColumnHeaderSortIcon(canSort, isSorted);
  const sharedViewProps = {
    resolvedTitle,
    icon,
    className,
    headerButtonClassName,
    headerLabelClassName,
    sortIcon,
    isLoading,
    recordCount,
  };

  const hasControls =
    props.tableLayout?.columnsMovable ||
    (props.tableLayout?.columnsVisibility && visibility) ||
    (props.tableLayout?.columnsPinnable && canPin) ||
    filter;

  const menuItems = useDataGridColumnHeaderMenuItems({
    column,
    table,
    tableLayout: props.tableLayout,
    filter,
    visibility,
    ascendingLabel,
    descendingLabel,
    canSort,
    isSorted,
    canPin,
    isPinned,
    columnIndex,
    columnOrder,
    canMoveLeft,
    canMoveRight,
    columnVisibilityKey,
  });

  if (hasControls) {
    return (
      <DataGridColumnHeaderMenuView
        {...sharedViewProps}
        menuItems={menuItems}
        showUnpin={Boolean(
          props.tableLayout?.columnsPinnable && canPin && isPinned
        )}
        onUnpin={() => column.pin(false)}
      />
    );
  }

  if (canSort || (props.tableLayout?.columnsResizable && canResize)) {
    return (
      <DataGridColumnHeaderSortButtonView
        {...sharedViewProps}
        onSort={handleSort}
      />
    );
  }

  return (
    <DataGridColumnHeaderLabelView
      resolvedTitle={resolvedTitle}
      icon={icon}
      headerLabelClassName={headerLabelClassName}
    />
  );
};

const DataGridColumnHeader = memo(
  DataGridColumnHeaderInner
) as typeof DataGridColumnHeaderInner;

export { DataGridColumnHeader, type DataGridColumnHeaderProps };
