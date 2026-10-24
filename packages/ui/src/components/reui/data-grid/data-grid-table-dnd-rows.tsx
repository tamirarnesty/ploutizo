'use client';

'use no memo';

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type CollisionDetection,
  DndContext,
  type DndContextProps,
  type DragCancelEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  type SortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender } from '@tanstack/react-table';
import { cn } from 'cn';
import { createPortal } from 'react-dom';

import { GripHorizontalIcon } from 'lucide-react';
import type { Cell, Header, Row } from '@tanstack/react-table';
import type {
  DataGridFeatures,
  DataGridTableInstance,
} from '@/components/reui/data-grid/data-grid';
import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@/components/button';
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableFillBodyCell,
  DataGridTableFillHeadCell,
  DataGridTableFoot,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
  DataGridTableViewport,
} from '@/components/reui/data-grid/data-grid-table';
import {
  getDataGridHeadCellResizeHeader,
  getDataGridTableMergedHeaderGroups,
  renderDataGridTableHeadCellContent,
} from '@/components/reui/data-grid/data-grid-table-layout';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';

type SortableContextValue = ReturnType<typeof useSortable>;
const SortableRowContext = createContext<Pick<
  SortableContextValue,
  'attributes' | 'listeners'
> | null>(null);

/**
 * Tree metadata attached to every sortable row, readable from
 * `active.data.current` / `over.data.current` in any drag event. Cross-parent
 * drops can be resolved from it without re-deriving the shape of the table.
 */
type DataGridTableDndRowData = {
  type: 'data-grid-row';
  /** Tree depth, 0 for root rows. */
  depth: number;
  /** Index within the parent's children, or within the root rows. */
  index: number;
  /** Parent row id, or null for root rows. */
  parentId: string | null;
};

/**
 * Per-row render slot for drop indicators and depth guides. The returned node
 * is positioned over the row, so it never adds a column, shifts striping, or
 * gets clipped by a truncating resizable cell.
 */
type DataGridTableDndRowDecoration<TData extends object> = (context: {
  row: Row<DataGridFeatures, TData>;
  isDragging: boolean;
  isOver: boolean;
}) => ReactNode;

const DataGridTableDndRowHandle = ({
  className,
  disabled,
  disabledLabel,
}: {
  className?: string;
  /**
   * Renders the grip inert instead of withdrawing it. A grid that reorders on
   * one truth (manual order) and sorts on another cannot honour both at once,
   * but dropping the handle entirely collapses the gutter and reads as broken
   * rather than as unavailable. Keep the column's shape, mute the control.
   */
  disabled?: boolean;
  /** Announced and shown on hover in place of the drag affordance. */
  disabledLabel?: string;
}) => {
  const { i18n } = useDataGrid();
  const context = useContext(SortableRowContext);
  const resolvedDisabledLabel =
    disabledLabel ?? i18n.labels.reorderingUnavailable;

  if (!context || disabled) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          'size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing',
          disabled && 'cursor-not-allowed',
          className
        )}
        aria-label={
          disabled ? resolvedDisabledLabel : i18n.labels.dragToReorderRow
        }
        title={disabled ? resolvedDisabledLabel : undefined}
        disabled
      >
        <GripHorizontalIcon aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        'size-7 cursor-grab opacity-70 hover:bg-transparent hover:opacity-100 active:cursor-grabbing',
        className
      )}
      aria-label={i18n.labels.dragToReorderRow}
      {...context.attributes}
      {...context.listeners}
    >
      <GripHorizontalIcon aria-hidden="true" />
    </Button>
  );
};

const holdRowsInPlaceStrategy: SortingStrategy = () => null;

const DataGridTableDndRow = <TData extends object>({
  row,
  renderRowDecoration,
  dropIndicator = true,
}: {
  row: Row<DataGridFeatures, TData>;
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  dropIndicator?: boolean;
}) => {
  const rowData: DataGridTableDndRowData = {
    type: 'data-grid-row',
    depth: row.depth,
    index: row.index,
    parentId: row.getParentRow()?.id ?? null,
  };

  const {
    transform,
    setNodeRef,
    isDragging,
    isOver,
    attributes,
    listeners,
    index,
    activeIndex,
    overIndex,
  } = useSortable({
    id: row.id,
    data: rowData,
  });

  const dropEdge =
    dropIndicator && activeIndex !== -1 && index === overIndex && !isDragging
      ? activeIndex < overIndex
        ? 'bottom'
        : 'top'
      : null;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // dnd-kit's transition is deliberately dropped. A transition on a transform
    // property of a `tr` does not merely fail to animate in Chrome, it stops the
    // transform applying at all: the element sits at the start value forever.
    // The drag source escapes it because dnd-kit disables its own transition
    // while it is being dragged, which is why the carried row used to be the
    // ONLY one that moved and every other row silently refused to open a gap.
    // Displacement therefore lands in one step, which is what a table wants.
    zIndex: isDragging ? 1 : 0,
    position: 'relative',
    cursor: isDragging ? 'grabbing' : undefined,
    ...(isDragging && {
      opacity: 0.4,
      outline: '1px dashed var(--border)',
      outlineOffset: '-1px',
    }),
  };

  const decoration = renderRowDecoration?.({ row, isDragging, isOver });
  const cells = row.getVisibleCells();
  const lastCell = cells[cells.length - 1];

  const renderCell = (cell: Cell<DataGridFeatures, TData, unknown>) => (
    <DataGridTableBodyRowCell cell={cell} key={cell.id}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
      {decoration && cell === lastCell ? (
        // Rides inside the last cell rather than in a `td` of its own.
        // An absolutely positioned `td` is still a cell as far as table
        // layout is concerned, so it added a NINTH column with no width
        // of its own, and under `table-layout: fixed` that new column
        // swallowed the whole surplus the real columns had been sharing,
        // so every column snapped back to its declared size and the row's
        // content visibly narrowed the moment a drag began. A plain
        // element adds no column. It anchors to the ROW, the nearest
        // positioned ancestor, and spans the full width, unless the last
        // cell is a sticky end-pinned one: that cell is positioned itself
        // and confines the decoration to its own width.
        <div
          aria-hidden="true"
          data-slot="data-grid-table-row-decoration"
          className="pointer-events-none absolute inset-0"
        >
          {decoration}
        </div>
      ) : null}
      {dropEdge && cell === lastCell ? (
        <div
          aria-hidden="true"
          data-slot="data-grid-table-row-drop-indicator"
          data-edge={dropEdge}
          className="pointer-events-none absolute inset-0 z-20"
        >
          <span className="absolute inset-y-0 start-0 w-0.5 bg-primary" />
        </div>
      ) : null}
    </DataGridTableBodyRowCell>
  );

  const sortableValue = useMemo(
    () => ({ attributes, listeners }),
    [attributes, listeners]
  );

  return (
    <SortableRowContext.Provider value={sortableValue}>
      <DataGridTableBodyRow
        row={row}
        dndRef={setNodeRef}
        dndStyle={style}
        dndDragging={isDragging}
      >
        {[
          ...cells
            .filter((cell) => cell.column.getIsPinned() !== 'end')
            .map(renderCell),
          <DataGridTableFillBodyCell key="__data-grid-fill" />,
          ...cells
            .filter((cell) => cell.column.getIsPinned() === 'end')
            .map(renderCell),
        ]}
      </DataGridTableBodyRow>
      {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
    </SortableRowContext.Provider>
  );
};

const DataGridTableDndRowsBody = <TData extends object>({
  table,
  dataIds,
  renderRowDecoration,
  dropIndicator,
  sortingStrategy,
}: {
  table: DataGridTableInstance<TData>;
  dataIds: UniqueIdentifier[];
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  dropIndicator?: boolean;
  sortingStrategy: SortingStrategy;
}) => {
  const { isLoading, props } = useDataGrid();
  const pagination = table.state.pagination;

  if (props.loadingMode === 'skeleton' && isLoading && pagination?.pageSize) {
    return (
      <>
        {Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
          <DataGridTableBodyRowSkeleton key={rowIndex}>
            {[
              ...[
                ...table.getStartVisibleLeafColumns(),
                ...table.getCenterVisibleLeafColumns(),
              ].map((column) => (
                <DataGridTableBodyRowSkeletonCell
                  column={column}
                  key={column.id}
                >
                  {column.columnDef.meta?.skeleton}
                </DataGridTableBodyRowSkeletonCell>
              )),
              <DataGridTableFillBodyCell key="__data-grid-fill" />,
              ...table.getEndVisibleLeafColumns().map((column) => (
                <DataGridTableBodyRowSkeletonCell
                  column={column}
                  key={column.id}
                >
                  {column.columnDef.meta?.skeleton}
                </DataGridTableBodyRowSkeletonCell>
              )),
            ]}
          </DataGridTableBodyRowSkeleton>
        ))}
      </>
    );
  }

  if (!table.getRowModel().rows.length) return <DataGridTableEmpty />;

  return (
    <SortableContext items={dataIds} strategy={sortingStrategy}>
      {table.getRowModel().rows.map((row: Row<DataGridFeatures, TData>) => {
        return (
          <DataGridTableDndRow
            row={row}
            renderRowDecoration={renderRowDecoration}
            dropIndicator={dropIndicator}
            key={row.id}
          />
        );
      })}
    </SortableContext>
  );
};

const MemoizedDataGridTableDndRowsBody = memo(
  DataGridTableDndRowsBody,
  (_prev, next) => !!next.table.state.columnResizing?.isResizingColumn
) as typeof DataGridTableDndRowsBody;

const useDataGridTableDndRowsState = <TData extends object>({
  handleDragEnd,
  dataIds,
  footerContent,
  collisionDetection = closestCenter,
  modifiers,
  sortingStrategy = holdRowsInPlaceStrategy,
  renderRowDecoration,
  dropIndicator = true,
  onDragStart,
  onDragMove,
  onDragOver,
  onDragCancel,
  accessibility,
}: {
  handleDragEnd: (event: DragEndEvent) => void;
  dataIds: UniqueIdentifier[];
  footerContent?: ReactNode;
  /** Overrides the default `closestCenter` strategy. */
  collisionDetection?: CollisionDetection;
  /**
   * Replaces the default axis restriction, e.g. drop `restrictToVerticalAxis`
   * to allow the horizontal gesture that tree re-parenting relies on. The
   * table container clamp is always applied after these, so a dragged row
   * cannot leave the grid.
   */
  modifiers?: Modifier[];
  /**
   * Replaces the default `verticalListSortingStrategy`. Return null from a
   * strategy to leave every row exactly where it is. A tree needs that: its drop
   * is either INTO the hovered row or BETWEEN two rows, and which one it is
   * flips as the pointer crosses a single row, so a gap that opens for one and
   * shuts for the other flickers the whole surface. Such a caller draws its own
   * insertion line instead, and pairs this with a modifier that holds the
   * carried row still, since a gap nothing moves into is just a hole.
   */
  sortingStrategy?: SortingStrategy;
  /** Per-row slot for drop indicators and depth guides. */
  renderRowDecoration?: DataGridTableDndRowDecoration<TData>;
  /**
   * Draws a line on the seam the carried row would land on. On by default;
   * pass `false` when `renderRowDecoration` paints its own insertion affordance
   * and the two would compete.
   */
  dropIndicator?: boolean;
  onDragStart?: (event: DragStartEvent) => void;
  onDragMove?: (event: DragMoveEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragCancel?: (event: DragCancelEvent) => void;
  /**
   * Forwarded to dnd-kit's `DndContext`: its screen-reader instructions and
   * live-region announcements, which default to dnd-kit's English strings.
   */
  accessibility?: DndContextProps['accessibility'];
}) => {
  const { table, props } = useDataGrid<TData>();
  const mergedHeaderGroups = getDataGridTableMergedHeaderGroups(table);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  // DragOverlay positions with `position: fixed` against viewport coordinates,
  // so any ancestor that establishes a containing block (`content-visibility`,
  // `contain`, `transform`, `filter`, `will-change`) re-anchors it. Card grids
  // use the first two to defer off-screen work, which offsets the clone and
  // the container clamp. Portal to document.body once a drag starts. Reading
  // document during render would disagree with the server, and a drag cannot
  // start before hydration.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [carried, setCarried] = useState<{
    id: UniqueIdentifier;
    width: number;
    height: number;
    columns: number[];
    padding: { start: string; end: string }[];
  } | null>(null);

  const pickUpRow = useCallback((id: UniqueIdentifier) => {
    const container = tableContainerRef.current;
    const head = container?.querySelector('thead tr');
    if (!container || !head) {
      setCarried(null);
      return;
    }

    const source = Array.from(
      container.querySelectorAll<HTMLElement>('tbody tr[data-row-id]')
    ).find((candidate) => candidate.dataset.rowId === String(id));
    const height = source?.getBoundingClientRect().height ?? 0;

    const columns = Array.from(source?.children ?? head.children)
      .filter(
        (cell) =>
          cell.getAttribute('data-slot') !== 'data-grid-table-fill-body-cell' &&
          cell.getAttribute('data-slot') !== 'data-grid-table-fill-head-cell'
      )
      .map((cell) => cell.getBoundingClientRect().width);

    const padding = Array.from(source?.children ?? [])
      .filter(
        (cell) =>
          cell.getAttribute('data-slot') !== 'data-grid-table-fill-body-cell'
      )
      .map((cell) => {
        const style = getComputedStyle(cell);
        return { start: style.paddingInlineStart, end: style.paddingInlineEnd };
      });

    setCarried({
      id,
      width: columns.reduce((total, width) => total + width, 0),
      height,
      columns,
      padding,
    });
  }, []);

  const carriedRow = carried
    ? table
        .getRowModel()
        .rows.find((row: Row<DataGridFeatures, TData>) => row.id === carried.id)
    : undefined;

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    // Keyboard reordering moves one sortable position per keypress instead
    // of the sensor's raw 25px default.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isDraggingRow) return;

    const { body, documentElement } = document;
    const previousBodyCursor = body.style.cursor;
    const previousDocumentCursor = documentElement.style.cursor;

    body.style.cursor = 'grabbing';
    documentElement.style.cursor = 'grabbing';

    return () => {
      body.style.cursor = previousBodyCursor;
      documentElement.style.cursor = previousDocumentCursor;
    };
  }, [isDraggingRow]);

  const resolvedModifiers = useMemo(() => {
    const restrictToTableContainer: Modifier = ({
      transform,
      draggingNodeRect,
    }) => {
      if (!tableContainerRef.current || !draggingNodeRect) {
        return transform;
      }

      const containerRect = tableContainerRef.current.getBoundingClientRect();
      const { x, y } = transform;

      const minX = containerRect.left - draggingNodeRect.left;
      const maxX = containerRect.right - draggingNodeRect.right;
      const minY = containerRect.top - draggingNodeRect.top;
      const maxY = containerRect.bottom - draggingNodeRect.bottom;

      return {
        ...transform,
        x: modifiers ? x : Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    };

    return [
      ...(modifiers ?? [restrictToVerticalAxis]),
      restrictToTableContainer,
    ];
  }, [modifiers]);

  return (
    <DndContext
      id={useId()}
      accessibility={accessibility}
      collisionDetection={collisionDetection}
      modifiers={resolvedModifiers}
      onDragCancel={(event) => {
        setIsDraggingRow(false);
        setCarried(null);
        onDragCancel?.(event);
      }}
      onDragEnd={(event) => {
        setIsDraggingRow(false);
        setCarried(null);
        handleDragEnd(event);
      }}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragStart={(event) => {
        setPortalTarget(document.body);
        setIsDraggingRow(true);
        pickUpRow(event.active.id);
        onDragStart?.(event);
      }}
      sensors={sensors}
    >
      <DataGridTableViewport
        viewportRef={tableContainerRef}
        className={
          isDraggingRow
            ? 'relative cursor-grabbing [&_*]:cursor-grabbing!'
            : 'relative'
        }
      >
        <DataGridTableBase>
          <DataGridTableHead>
            {mergedHeaderGroups.map((headerGroup, index) => {
              const renderHeader = (
                header: Header<DataGridFeatures, TData, unknown>
              ) => {
                const coveredHeaders = headerGroup.coveredHeaders.get(
                  header.id
                );
                const resizeHeader = getDataGridHeadCellResizeHeader(
                  header,
                  coveredHeaders
                );

                return (
                  <DataGridTableHeadRowCell
                    header={header}
                    coveredHeaders={coveredHeaders}
                    key={header.id}
                  >
                    {renderDataGridTableHeadCellContent(header)}
                    {props.tableLayout?.columnsResizable &&
                      resizeHeader.column.getCanResize() && (
                        <DataGridTableHeadRowCellResize header={resizeHeader} />
                      )}
                  </DataGridTableHeadRowCell>
                );
              };

              return (
                <DataGridTableHeadRow
                  key={headerGroup.id}
                  rowId={headerGroup.id}
                >
                  {[
                    ...[
                      ...headerGroup.startHeaders,
                      ...headerGroup.centerHeaders,
                    ].map(renderHeader),
                    ...(index === 0
                      ? [
                          <DataGridTableFillHeadCell
                            key="__data-grid-fill"
                            rowSpan={mergedHeaderGroups.length}
                          />,
                        ]
                      : []),
                    ...headerGroup.endHeaders.map(renderHeader),
                  ]}
                </DataGridTableHeadRow>
              );
            })}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
            <DataGridTableRowSpacer />
          )}

          <DataGridTableBody>
            <MemoizedDataGridTableDndRowsBody
              table={table}
              dataIds={dataIds}
              renderRowDecoration={renderRowDecoration}
              dropIndicator={dropIndicator}
              sortingStrategy={sortingStrategy}
            />
          </DataGridTableBody>

          {footerContent && (
            <DataGridTableFoot>{footerContent}</DataGridTableFoot>
          )}
        </DataGridTableBase>
      </DataGridTableViewport>

      {portalTarget
        ? createPortal(
            <DragOverlay dropAnimation={null}>
              {carried && carriedRow ? (
                <table
                  aria-hidden="true"
                  style={{ width: carried.width, tableLayout: 'fixed' }}
                  className="pointer-events-none cursor-grabbing rounded-md border border-border bg-background shadow-lg"
                >
                  <tbody>
                    {/* Padding rides on the inner element, not the cell. A `td` can
                  never render narrower than its own horizontal padding, so a
                  column resized below that would silently widen here and the
                  clone would stop matching the row it came from. Height comes
                  from the measured source row for the same reason the widths
                  do: the clone has no row of its own to inherit it from. */}
                    <tr
                      style={{ height: carried.height || undefined }}
                      className="[&>td]:p-0 [&>td]:align-middle"
                    >
                      {carriedRow
                        .getVisibleCells()
                        .map(
                          (
                            cell: Cell<DataGridFeatures, TData, unknown>,
                            index: number
                          ) => (
                            <td
                              key={cell.id}
                              style={{
                                width:
                                  carried.columns[index] ??
                                  cell.column.getSize(),
                              }}
                            >
                              <div
                                className={cn(
                                  'truncate',
                                  !carried.padding[index] && 'px-3'
                                )}
                                style={{
                                  paddingInlineStart:
                                    carried.padding[index]?.start,
                                  paddingInlineEnd: carried.padding[index]?.end,
                                }}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </div>
                            </td>
                          )
                        )}
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </DragOverlay>,
            portalTarget
          )
        : null}
    </DndContext>
  );
};

const DataGridTableDndRows = <TData extends object>(
  props: Parameters<typeof useDataGridTableDndRowsState<TData>>[0]
) => {
  return useDataGridTableDndRowsState<TData>(props);
};

export { DataGridTableDndRowHandle, DataGridTableDndRows };
export type { DataGridTableDndRowData, DataGridTableDndRowDecoration };
