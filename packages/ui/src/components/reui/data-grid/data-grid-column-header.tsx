'use client';

// Opted out of React Compiler with the rest of the grid (see data-grid.tsx).
'use no memo';

import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { Subscribe } from '@tanstack/react-table';
import { cn } from 'cn';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  PinOffIcon,
  Settings2Icon,
} from 'lucide-react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import type {
  DataGridFeatures,
  DataGridTableInstance,
} from '@/components/reui/data-grid/data-grid';
import type { Column } from '@tanstack/react-table';
import {
  getColumnHeaderLabel,
  getDataGridHeaderSpans,
} from '@/components/reui/data-grid/data-grid-cells';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';

import { Button } from '@/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';

interface DataGridColumnHeaderProps<
  TData extends object,
  TValue,
> extends HTMLAttributes<HTMLDivElement> {
  column: Column<DataGridFeatures, TData, TValue>;
  /** When omitted, uses `column.columnDef.meta.headerTitle`, then a string `columnDef.header`, then `column.id`. */
  title?: string;
  icon?: ReactNode;
  /** Reserved; pin controls are gated by tableLayout.columnsPinnable + column.getCanPin(). */
  pinnable?: boolean;
  filter?: ReactNode;
  visibility?: boolean;
}

// Unpinning moves a column into another header list (pinned, windowed center),
// which remounts its header, so the focus request outlives the button: the next
// header rendered for that column takes it. `column` is a stable reference.
const pendingUnpinFocus = new WeakSet<object>();

const getDataGridColumnMovePlan = <TData extends object, TValue>(
  column: Column<DataGridFeatures, TData, TValue>,
  table: DataGridTableInstance<TData>,
  isPinned: ReturnType<Column<DataGridFeatures, TData, TValue>['getIsPinned']>
) => {
  // The order a move rewrites: the consumer's columnOrder (TanStack defaults it
  // to []), then every leaf it leaves out, in definition order - the same
  // completion TanStack applies when rendering, so a rendered neighbour is
  // always present to re-seat beside, even after columns are added later.
  const columnOrderState = table.state.columnOrder;
  const columnOrderIds = new Set(columnOrderState);
  const definitionOrder = table
    .getAllColumns()
    .flatMap((topColumn) => topColumn.getLeafColumns())
    .map((leafColumn) => leafColumn.id);
  const columnOrder = [
    ...columnOrderState,
    ...definitionOrder.filter((id) => !columnOrderIds.has(id)),
  ];

  // Move neighbours come from what is RENDERED: the column's own pin bucket,
  // visible columns only. Stepping through the raw columnOrder would trade
  // places with a hidden or pinned column - an enabled click that moves nothing.
  // With grouping in TanStack's default "reorder" mode, grouped columns render
  // first whatever columnOrder says: they neither move nor serve as a target.
  const groupedColumnMode = (
    table.options as { groupedColumnMode?: false | 'reorder' | 'remove' }
  ).groupedColumnMode;
  const isHoistedByGrouping = (target: object) =>
    groupedColumnMode !== false &&
    typeof (target as { getIsGrouped?: unknown }).getIsGrouped === 'function' &&
    (target as { getIsGrouped: () => boolean }).getIsGrouped();
  const renderedLeaves = (
    isPinned === 'start'
      ? table.getStartVisibleLeafColumns()
      : isPinned === 'end'
        ? table.getEndVisibleLeafColumns()
        : table.getCenterVisibleLeafColumns()
  )
    .filter((leafColumn) => !isHoistedByGrouping(leafColumn))
    .map((leafColumn) => leafColumn.id);
  const renderedOrder = new Map(renderedLeaves.map((id, index) => [id, index]));
  const byRenderedOrder = (a: string, b: string) =>
    renderedOrder.get(a)! - renderedOrder.get(b)!;
  const headerSpans = getDataGridHeaderSpans(table);
  const coveredIds = new Set(
    [...headerSpans.values()].flat().map((leafColumn) => leafColumn.id)
  );
  const renderedPeers = (column.parent?.columns ?? table.getAllColumns())
    .filter((sibling) => !coveredIds.has(sibling.id))
    .map((sibling) =>
      [...sibling.getLeafColumns(), ...(headerSpans.get(sibling.id) ?? [])]
        .map((leafColumn) => leafColumn.id)
        .filter((id) => renderedOrder.has(id))
        .sort(byRenderedOrder)
    )
    .filter((leaves) => leaves.length > 0)
    .sort((a, b) => byRenderedOrder(a[0], b[0]));
  const renderedIndex = column.columns.length
    ? -1
    : renderedPeers.findIndex((leaves) => leaves[0] === column.id);
  const leftNeighbour =
    renderedIndex > 0 ? renderedPeers[renderedIndex - 1] : undefined;
  const rightNeighbour =
    renderedIndex !== -1 && renderedIndex < renderedPeers.length - 1
      ? renderedPeers[renderedIndex + 1]
      : undefined;

  /** Re-seats this column, with the leaves its header spans, beside a rendered
   * neighbour; every other column, hidden or pinned, keeps its place. */
  const moveBeside = (neighbour: string[], side: 'before' | 'after') => {
    const moving = renderedPeers[renderedIndex] ?? [column.id];
    const movingIds = new Set(moving);
    const newOrder = columnOrder.filter((id) => !movingIds.has(id));
    const anchor =
      side === 'before' ? neighbour[0] : neighbour[neighbour.length - 1];
    const at = anchor === undefined ? -1 : newOrder.indexOf(anchor);
    if (at === -1) return;
    newOrder.splice(side === 'before' ? at : at + 1, 0, ...moving);
    table.setColumnOrder(newOrder);
  };

  return {
    canMoveLeft: leftNeighbour !== undefined,
    canMoveRight: rightNeighbour !== undefined,
    leftNeighbour,
    moveBeside,
    rightNeighbour,
  };
};

const buildDataGridColumnHeaderMenuItems = <TData extends object, TValue>({
  filter,
  canSort,
  isSorted,
  column,
  tableLayout,
  canPin,
  isPinned,
  visibility,
  table,
  i18n,
}: {
  filter: ReactNode;
  canSort: boolean;
  isSorted: false | 'asc' | 'desc';
  column: Column<DataGridFeatures, TData, TValue>;
  tableLayout:
    | {
        columnsPinnable?: boolean;
        columnsMovable?: boolean;
        columnsVisibility?: boolean;
      }
    | undefined;
  canPin: boolean;
  isPinned: ReturnType<Column<DataGridFeatures, TData, TValue>['getIsPinned']>;
  visibility: boolean;
  table: DataGridTableInstance<TData>;
  i18n: {
    labels: {
      sortAscending: string;
      sortDescending: string;
      pinColumnStart: string;
      pinColumnEnd: string;
      moveColumnStart: string;
      moveColumnEnd: string;
      columnsMenu: string;
    };
  };
}) => {
  const {
    canMoveLeft,
    canMoveRight,
    leftNeighbour,
    moveBeside,
    rightNeighbour,
  } = getDataGridColumnMovePlan(
    column,
    table as unknown as DataGridTableInstance<TData>,
    isPinned
  );
  const items: ReactNode[] = [];
  let hasPreviousSection = false;

  // Filter section
  if (filter) {
    items.push(
      <DropdownMenuGroup key="group-filter">
        <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
      </DropdownMenuGroup>
    );
    hasPreviousSection = true;
  }

  // Sort section
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
        <span className="grow">{i18n.labels.sortAscending}</span>
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
        <span className="grow">{i18n.labels.sortDescending}</span>
        {isSorted === 'desc' && (
          <CheckIcon className="size-4 text-primary opacity-100!" />
        )}
      </DropdownMenuItem>
    );
    hasPreviousSection = true;
  }

  // Pin section
  if (tableLayout?.columnsPinnable && canPin) {
    if (hasPreviousSection) {
      items.push(<DropdownMenuSeparator key="sep-pin" />);
    }
    items.push(
      <DropdownMenuItem
        key="pin-left"
        onClick={() => column.pin(isPinned === 'start' ? false : 'start')}
      >
        <ArrowLeftToLineIcon className="size-3.5!" aria-hidden="true" />
        <span className="grow">{i18n.labels.pinColumnStart}</span>
        {isPinned === 'start' && (
          <CheckIcon className="size-4 text-primary opacity-100!" />
        )}
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="pin-right"
        onClick={() => column.pin(isPinned === 'end' ? false : 'end')}
      >
        <ArrowRightToLineIcon className="size-3.5!" aria-hidden="true" />
        <span className="grow">{i18n.labels.pinColumnEnd}</span>
        {isPinned === 'end' && (
          <CheckIcon className="size-4 text-primary opacity-100!" />
        )}
      </DropdownMenuItem>
    );
    hasPreviousSection = true;
  }

  // Move section
  if (tableLayout?.columnsMovable) {
    if (hasPreviousSection) {
      items.push(<DropdownMenuSeparator key="sep-move" />);
    }
    items.push(
      <DropdownMenuItem
        key="move-left"
        onClick={() => {
          if (leftNeighbour) moveBeside(leftNeighbour, 'before');
        }}
        disabled={!canMoveLeft || isPinned !== false}
      >
        <ArrowLeftIcon className="size-3.5!" aria-hidden="true" />
        <span>{i18n.labels.moveColumnStart}</span>
      </DropdownMenuItem>,
      <DropdownMenuItem
        key="move-right"
        onClick={() => {
          if (rightNeighbour) moveBeside(rightNeighbour, 'after');
        }}
        disabled={!canMoveRight || isPinned !== false}
      >
        <ArrowRightIcon className="size-3.5!" aria-hidden="true" />
        <span>{i18n.labels.moveColumnEnd}</span>
      </DropdownMenuItem>
    );
    hasPreviousSection = true;
  }

  // Visibility section
  if (tableLayout?.columnsVisibility && visibility) {
    if (hasPreviousSection) {
      items.push(<DropdownMenuSeparator key="sep-visibility" />);
    }
    items.push(
      <DropdownMenuSub key="visibility">
        <DropdownMenuSubTrigger>
          <Settings2Icon className="size-3.5!" />
          <span>{i18n.labels.columnsMenu}</span>
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
                className={
                  getColumnHeaderLabel(col) === col.id
                    ? 'capitalize'
                    : undefined
                }
              >
                {getColumnHeaderLabel(col)}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return items;
};

const columnHeaderTitle = <TData extends object, TValue>(
  title: string | undefined,
  column: Column<DataGridFeatures, TData, TValue>
) => title ?? getColumnHeaderLabel(column);

const columnHeaderVisibilityKey = (
  columnsVisibility: boolean | undefined,
  visibility: boolean,
  columnVisibility: unknown
) => (columnsVisibility && visibility ? JSON.stringify(columnVisibility) : '');

const columnHeaderSortIcon = (
  canSort: boolean,
  isSorted: false | 'asc' | 'desc'
) =>
  canSort &&
  (isSorted === 'desc' ? (
    <ArrowDownIcon className="size-3.25" aria-hidden="true" />
  ) : isSorted === 'asc' ? (
    <ArrowUpIcon className="size-3.25" aria-hidden="true" />
  ) : (
    <ChevronsUpDownIcon className="mt-px size-3.25" aria-hidden="true" />
  ));

const columnHeaderUnpinClearsResizeHandle = <TData extends object, TValue>(
  columnsResizable: boolean | undefined,
  canResize: boolean,
  isPinned: ReturnType<Column<DataGridFeatures, TData, TValue>['getIsPinned']>,
  column: Column<DataGridFeatures, TData, TValue>,
  centerCount: number,
  endCount: number
) =>
  Boolean(
    columnsResizable &&
    canResize &&
    isPinned === 'start' &&
    !(column.getIsLastColumn('start') && centerCount === 0 && endCount === 0)
  );

const columnHeaderHasControls = (
  columnsMovable: boolean | undefined,
  columnsVisibility: boolean | undefined,
  visibility: boolean,
  columnsPinnable: boolean | undefined,
  canPin: boolean,
  filter: ReactNode
) =>
  columnsMovable ||
  (columnsVisibility && visibility) ||
  (columnsPinnable && canPin) ||
  filter;

const renderDataGridColumnHeaderFace = ({
  hasControls,
  menuTriggerRef,
  headerButtonClassName,
  isLoading,
  icon,
  resolvedTitle,
  sortIcon,
  menuItems,
  columnsPinnable,
  canPin,
  isPinned,
  unpinClearsResizeHandle,
  column,
  unpinLabel,
  canSort,
  columnsResizable,
  canResize,
  handleSort,
  headerLabelClassName,
}: {
  hasControls: unknown;
  menuTriggerRef: Ref<HTMLButtonElement>;
  headerButtonClassName: string;
  isLoading: boolean;
  icon: ReactNode;
  resolvedTitle: string;
  sortIcon: ReactNode;
  menuItems: ReactNode;
  columnsPinnable?: boolean;
  canPin: boolean;
  isPinned: false | 'start' | 'end' | 'left' | 'right';
  unpinClearsResizeHandle: boolean;
  column: { pin: (value: false | 'start' | 'end') => void };
  unpinLabel: string;
  canSort: boolean;
  columnsResizable?: boolean;
  canResize: boolean;
  handleSort: () => void;
  headerLabelClassName: string;
}) => {
  if (hasControls) {
    return (
      <div className="-ms-2 flex h-full items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            ref={menuTriggerRef}
            render={
              <Button
                variant="ghost"
                className={headerButtonClassName}
                disabled={isLoading}
              >
                {icon && icon}
                {resolvedTitle}
                {sortIcon}
              </Button>
            }
          />
          <DropdownMenuContent className="w-40" align="start">
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
        {columnsPinnable && canPin && isPinned && (
          <span
            className={cn(
              '-me-1 flex min-w-7 shrink-[999]',
              unpinClearsResizeHandle && 'pe-4'
            )}
          >
            <Button
              size="icon-sm"
              variant="ghost"
              className="size-7 rounded-lg"
              onClick={(event) => {
                const scrollArea = event.currentTarget.closest<HTMLElement>(
                  '[data-slot="scroll-area-viewport"]'
                );
                pendingUnpinFocus.add(column);
                column.pin(false);
                // A column the virtual window leaves unmounted claims nothing,
                // so the grid's scroll area takes focus instead of the page.
                requestAnimationFrame(() => {
                  if (pendingUnpinFocus.delete(column)) scrollArea?.focus();
                });
              }}
              aria-label={unpinLabel}
              title={unpinLabel}
            >
              <PinOffIcon
                className="size-3.5! opacity-50!"
                aria-hidden="true"
              />
            </Button>
          </span>
        )}
      </div>
    );
  }

  if (canSort || (columnsResizable && canResize)) {
    return (
      <div className="-ms-2 flex h-full items-center">
        <Button
          variant="ghost"
          className={headerButtonClassName}
          disabled={isLoading}
          onClick={handleSort}
        >
          {icon && icon}
          {resolvedTitle}
          {sortIcon}
        </Button>
      </div>
    );
  }

  return (
    <div className={headerLabelClassName}>
      {icon && icon}
      {resolvedTitle}
    </div>
  );
};

function DataGridColumnHeaderInner<TData extends object, TValue>({
  column,
  title,
  icon,
  className,
  filter,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { i18n, isLoading, table, props } = useDataGrid();
  const resolvedTitle = columnHeaderTitle(title, column);
  const columnVisibilityKey = columnHeaderVisibilityKey(
    props.tableLayout?.columnsVisibility,
    visibility,
    table.state.columnVisibility
  );
  const isSorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (pendingUnpinFocus.delete(column)) menuTriggerRef.current?.focus();
  });
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const canResize = column.getCanResize();
  const handleSort = () => {
    if (!canSort) return;
    if (isSorted === 'asc') {
      column.toggleSorting(true);
    } else if (isSorted === 'desc') {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  };
  const headerLabelClassName = cn(
    'inline-flex h-full items-center gap-1.5 text-[0.8125rem] leading-[calc(1.125/0.8125)] font-normal text-secondary-foreground/80 [&_svg]:size-3.5 [&_svg]:opacity-60',
    className
  );
  const headerButtonClassName = cn(
    'h-6 rounded-lg px-2 font-normal text-secondary-foreground/80 hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground',
    className
  );
  const sortIcon = columnHeaderSortIcon(canSort, isSorted);
  const unpinClearsResizeHandle = columnHeaderUnpinClearsResizeHandle(
    props.tableLayout?.columnsResizable,
    canResize,
    isPinned,
    column,
    table.getCenterVisibleLeafColumns().length,
    table.getEndVisibleLeafColumns().length
  );
  const hasControls = columnHeaderHasControls(
    props.tableLayout?.columnsMovable,
    props.tableLayout?.columnsVisibility,
    visibility,
    props.tableLayout?.columnsPinnable,
    canPin,
    filter
  );

  const columnsPinnable = props.tableLayout?.columnsPinnable;
  const columnsMovable = props.tableLayout?.columnsMovable;
  const columnsVisibility = props.tableLayout?.columnsVisibility;
  const sortAscendingLabel = i18n.labels.sortAscending;
  const sortDescendingLabel = i18n.labels.sortDescending;
  const pinColumnStartLabel = i18n.labels.pinColumnStart;
  const pinColumnEndLabel = i18n.labels.pinColumnEnd;
  const moveColumnStartLabel = i18n.labels.moveColumnStart;
  const moveColumnEndLabel = i18n.labels.moveColumnEnd;
  const columnsMenuLabel = i18n.labels.columnsMenu;

  const menuItems = useMemo(
    () =>
      buildDataGridColumnHeaderMenuItems({
        filter,
        canSort,
        isSorted,
        column,
        tableLayout: {
          columnsPinnable,
          columnsMovable,
          columnsVisibility,
        },
        canPin,
        isPinned,
        visibility,
        table: table as unknown as DataGridTableInstance<TData>,
        i18n: {
          labels: {
            sortAscending: sortAscendingLabel,
            sortDescending: sortDescendingLabel,
            pinColumnStart: pinColumnStartLabel,
            pinColumnEnd: pinColumnEndLabel,
            moveColumnStart: moveColumnStartLabel,
            moveColumnEnd: moveColumnEndLabel,
            columnsMenu: columnsMenuLabel,
          },
        },
      }),
    [
      filter,
      canSort,
      isSorted,
      column,
      columnsPinnable,
      columnsMovable,
      columnsVisibility,
      canPin,
      isPinned,
      visibility,
      table,
      sortAscendingLabel,
      sortDescendingLabel,
      pinColumnStartLabel,
      pinColumnEndLabel,
      moveColumnStartLabel,
      moveColumnEndLabel,
      columnsMenuLabel,
      columnVisibilityKey, // Needed to update checkbox states when visibility changes
    ]
  );

  return renderDataGridColumnHeaderFace({
    hasControls,
    menuTriggerRef,
    headerButtonClassName,
    isLoading,
    icon,
    resolvedTitle,
    sortIcon,
    menuItems,
    columnsPinnable: props.tableLayout?.columnsPinnable,
    canPin,
    isPinned,
    unpinClearsResizeHandle,
    column,
    unpinLabel: i18n.labels.unpinColumn(resolvedTitle),
    canSort,
    columnsResizable: props.tableLayout?.columnsResizable,
    canResize,
    handleSort,
    headerLabelClassName,
  });
}

const DataGridColumnHeaderMemo = memo(DataGridColumnHeaderInner) as <
  TData extends object,
  TValue,
>(
  props: DataGridColumnHeaderProps<TData, TValue> & {
    /** Internal: the state slices the header re-renders on. Not part of the public API. */
    subscribedState?: unknown;
  }
) => ReactNode;

/**
 * Sort and pin state reaches this header through builder calls on `column`
 * (`getIsSorted()`, `getIsPinned()`), and `column` keeps its identity across
 * renders, so anything memoized against it (the `memo` below, or a consumer's
 * compiled header template) never re-runs those reads: frozen sort arrows and
 * pin controls. The `Subscribe` below turns the slices this header actually
 * reads into a real reactive dependency, and threading the selection through
 * as a prop is what lets it past the `memo`.
 */
function DataGridColumnHeader<TData extends object, TValue>(
  props: DataGridColumnHeaderProps<TData, TValue>
) {
  const { table } = useDataGrid();

  return (
    <Subscribe
      source={table.store}
      selector={(state) => ({
        sorting: state.sorting,
        columnPinning: state.columnPinning,
        columnOrder: state.columnOrder,
        columnVisibility: state.columnVisibility,
      })}
    >
      {(subscribed) => (
        <DataGridColumnHeaderMemo {...props} subscribedState={subscribed} />
      )}
    </Subscribe>
  );
}

export { DataGridColumnHeader };
export type { DataGridColumnHeaderProps };
