'use client';

import { useMemo } from 'react';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  CheckIcon,
  Settings2Icon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Column, Table } from '@tanstack/react-table';
import type { DataGridProps } from '@/components/reui/data-grid/data-grid';
import { getColumnHeaderLabel } from '@/components/reui/data-grid/data-grid-column-label';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/dropdown-menu';

type UseDataGridColumnHeaderMenuItemsParams<TData, TValue> = {
  column: Column<TData, TValue>;
  table: Table<TData>;
  tableLayout: DataGridProps<object>['tableLayout'];
  filter?: ReactNode;
  visibility: boolean;
  ascendingLabel: string;
  descendingLabel: string;
  canSort: boolean;
  isSorted: false | 'asc' | 'desc';
  canPin: boolean;
  isPinned: false | 'left' | 'right';
  columnIndex: number;
  columnOrder: Array<string>;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  columnVisibilityKey: string;
};

export const useDataGridColumnHeaderMenuItems = <TData, TValue>({
  column,
  table,
  tableLayout,
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
}: UseDataGridColumnHeaderMenuItemsParams<TData, TValue>) =>
  useMemo(() => {
    const items: Array<ReactNode> = [];
    let hasPreviousSection = false;

    if (filter) {
      items.push(
        <DropdownMenuGroup key="group-filter">
          <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
        </DropdownMenuGroup>
      );
      hasPreviousSection = true;
    }

    if (canSort) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-sort" />);
      }
      items.push(
        <DropdownMenuItem
          key="sort-asc"
          onClick={() => {
            if (isSorted === 'asc') {
              column.clearSorting();
            } else {
              column.toggleSorting(false);
            }
          }}
          disabled={!canSort}
        >
          <ArrowUpIcon className="size-3.5!" />
          <span className="grow">{ascendingLabel}</span>
          {isSorted === 'asc' && (
            <CheckIcon className="size-4 text-primary opacity-100!" />
          )}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="sort-desc"
          onClick={() => {
            if (isSorted === 'desc') {
              column.clearSorting();
            } else {
              column.toggleSorting(true);
            }
          }}
          disabled={!canSort}
        >
          <ArrowDownIcon className="size-3.5!" />
          <span className="grow">{descendingLabel}</span>
          {isSorted === 'desc' && (
            <CheckIcon className="size-4 text-primary opacity-100!" />
          )}
        </DropdownMenuItem>
      );
      hasPreviousSection = true;
    }

    if (tableLayout?.columnsPinnable && canPin) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-pin" />);
      }
      items.push(
        <DropdownMenuItem
          key="pin-left"
          onClick={() => column.pin(isPinned === 'left' ? false : 'left')}
        >
          <ArrowLeftToLineIcon className="size-3.5!" aria-hidden="true" />
          <span className="grow">Pin to left</span>
          {isPinned === 'left' && (
            <CheckIcon className="size-4 text-primary opacity-100!" />
          )}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="pin-right"
          onClick={() => column.pin(isPinned === 'right' ? false : 'right')}
        >
          <ArrowRightToLineIcon className="size-3.5!" aria-hidden="true" />
          <span className="grow">Pin to right</span>
          {isPinned === 'right' && (
            <CheckIcon className="size-4 text-primary opacity-100!" />
          )}
        </DropdownMenuItem>
      );
      hasPreviousSection = true;
    }

    if (tableLayout?.columnsMovable) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-move" />);
      }
      items.push(
        <DropdownMenuItem
          key="move-left"
          onClick={() => {
            if (columnIndex > 0) {
              const newOrder = [...columnOrder];
              const [movedColumn] = newOrder.splice(columnIndex, 1);
              newOrder.splice(columnIndex - 1, 0, movedColumn);
              table.setColumnOrder(newOrder);
            }
          }}
          disabled={!canMoveLeft || isPinned !== false}
        >
          <ArrowLeftIcon className="size-3.5!" aria-hidden="true" />
          <span>Move to Left</span>
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="move-right"
          onClick={() => {
            if (columnIndex < columnOrder.length - 1) {
              const newOrder = [...columnOrder];
              const [movedColumn] = newOrder.splice(columnIndex, 1);
              newOrder.splice(columnIndex + 1, 0, movedColumn);
              table.setColumnOrder(newOrder);
            }
          }}
          disabled={!canMoveRight || isPinned !== false}
        >
          <ArrowRightIcon className="size-3.5!" aria-hidden="true" />
          <span>Move to Right</span>
        </DropdownMenuItem>
      );
      hasPreviousSection = true;
    }

    if (tableLayout?.columnsVisibility && visibility) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-visibility" />);
      }
      items.push(
        <DropdownMenuSub key="visibility">
          <DropdownMenuSubTrigger>
            <Settings2Icon className="size-3.5!" />
            <span>Columns</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent side="right">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {getColumnHeaderLabel(col)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return items;
  }, [
    filter,
    canSort,
    isSorted,
    column,
    tableLayout?.columnsPinnable,
    tableLayout?.columnsMovable,
    tableLayout?.columnsVisibility,
    canPin,
    isPinned,
    canMoveLeft,
    canMoveRight,
    visibility,
    table,
    columnIndex,
    columnOrder,
    columnVisibilityKey,
    ascendingLabel,
    descendingLabel,
  ]);
