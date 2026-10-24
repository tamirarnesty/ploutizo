'use no memo';

import {
  Fragment,
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  type DndContextProps,
  type DragEndEvent,
  KeyboardSensor,
  type KeyboardSensorProps,
  type Modifier,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender } from '@tanstack/react-table';

import { GripVerticalIcon } from 'lucide-react';
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
  getDataGridHeadCellSizeVar,
  getDataGridTableMergedHeaderGroups,
  renderDataGridTableHeadCellContent,
} from '@/components/reui/data-grid/data-grid-table-layout';
import { getDataGridHeaderSpans } from '@/components/reui/data-grid/data-grid-cells';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';

const EMPTY_COVERED_HEADERS: readonly Header<
  DataGridFeatures,
  never,
  unknown
>[] = [];

const dataGridDndHeaderIsLocked = (
  isPinned: boolean,
  isGroup: boolean,
  isSpan: boolean
) => isPinned || isGroup || isSpan;

const renderDataGridTableDndHeader = <TData extends object>({
  header,
  coveredHeaders,
  i18n,
  props,
  column,
  isPinned,
  isGroup,
  isSpan,
  attributes,
  isDragging,
  listeners,
  setNodeRef,
  transform,
  transition,
}: {
  header: Header<DataGridFeatures, TData, unknown>;
  coveredHeaders: Header<DataGridFeatures, TData, unknown>[];
  i18n: { labels: { dragToReorder: string } };
  props: {
    tableLayout?: { columnsPinnable?: boolean; columnsResizable?: boolean };
  };
  column: Header<DataGridFeatures, TData, unknown>['column'];
  isPinned: boolean;
  isGroup: boolean;
  isSpan: boolean;
  attributes: Record<string, unknown>;
  isDragging: boolean;
  listeners: Record<string, unknown> | undefined;
  setNodeRef: (node: HTMLElement | null) => void;
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null;
  transition: string | undefined;
}) => {
  const canOrder =
    (column.columnDef as { enableColumnOrdering?: boolean })
      .enableColumnOrdering !== false &&
    !isPinned &&
    !isGroup &&
    !isSpan;
  const resizeHeader = getDataGridHeadCellResizeHeader(header, coveredHeaders);
  const isSticky =
    !!props.tableLayout?.columnsPinnable && column.getCanPin() && isPinned;
  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    ...(!isSticky && {
      position: 'relative',
      transform: CSS.Translate.toString(transform),
      zIndex: isDragging ? 1 : 0,
    }),
    transition,
    cursor: isDragging ? 'grabbing' : undefined,
    whiteSpace: 'nowrap',
    width: props.tableLayout?.columnsResizable
      ? getDataGridHeadCellSizeVar(header, coveredHeaders)
      : coveredHeaders.reduce(
          (sum, covered) => sum + covered.column.getSize(),
          header.column.getSize()
        ),
  };
  return (
    <DataGridTableHeadRowCell
      header={header}
      coveredHeaders={coveredHeaders}
      dndStyle={style}
      dndRef={setNodeRef}
    >
      <div className="flex items-center justify-start gap-0.5">
        {canOrder && (
          <Button
            size="icon-sm"
            variant="ghost"
            className={`-ms-2 size-6 ${isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
            {...attributes}
            {...listeners}
            aria-label={i18n.labels.dragToReorder}
          >
            <GripVerticalIcon
              className="opacity-60 hover:opacity-100"
              aria-hidden="true"
            />
          </Button>
        )}
        <div className="grow">{renderDataGridTableHeadCellContent(header)}</div>
        {props.tableLayout?.columnsResizable &&
          resizeHeader.column.getCanResize() && (
            <DataGridTableHeadRowCellResize header={resizeHeader} />
          )}
      </div>
    </DataGridTableHeadRowCell>
  );
};

const DataGridTableDndHeader = <TData extends object>({
  header,
  coveredHeaders = EMPTY_COVERED_HEADERS as unknown as Header<
    DataGridFeatures,
    TData,
    unknown
  >[],
}: {
  header: Header<DataGridFeatures, TData, unknown>;
  coveredHeaders?: Header<DataGridFeatures, TData, unknown>[];
}) => {
  const { i18n, props } = useDataGrid();
  const { column } = header;

  const isPinned = !!column.getIsPinned();
  const isGroup = column.columns.length > 0;
  const isSpan = coveredHeaders.length > 0;

  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: header.column.id,
    disabled: dataGridDndHeaderIsLocked(isPinned, isGroup, isSpan),
  });

  return renderDataGridTableDndHeader<TData>({
    header,
    coveredHeaders,
    i18n,
    props,
    column,
    isPinned,
    isGroup,
    isSpan,
    attributes: attributes as unknown as Record<string, unknown>,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  });
};

const DataGridTableDndCell = <TData extends object>({
  cell,
}: {
  cell: Cell<DataGridFeatures, TData, unknown>;
}) => {
  const { props } = useDataGrid();
  const { isDragging, setNodeRef, transform, transition } = useSortable({
    id: cell.column.id,
    disabled: !!cell.column.getIsPinned(),
  });

  const isSticky =
    !!props.tableLayout?.columnsPinnable &&
    cell.column.getCanPin() &&
    !!cell.column.getIsPinned();

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    ...(!isSticky && {
      position: 'relative',
      transform: CSS.Translate.toString(transform),
      zIndex: isDragging ? 1 : 0,
    }),
    transition,
    cursor: isDragging ? 'grabbing' : undefined,
    width: props.tableLayout?.columnsResizable
      ? `calc(var(--col-${cell.column.id}-size) * 1px)`
      : cell.column.getSize(),
  };

  return (
    <DataGridTableBodyRowCell cell={cell} dndStyle={style} dndRef={setNodeRef}>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </DataGridTableBodyRowCell>
  );
};

const DataGridTableDndBodyRows = <TData extends object>({
  table,
}: {
  table: DataGridTableInstance<TData>;
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
    <>
      {table.getRowModel().rows.map((row: Row<DataGridFeatures, TData>) => {
        return (
          <Fragment key={row.id}>
            <DataGridTableBodyRow row={row}>
              <SortableContext
                items={table.state.columnOrder}
                strategy={horizontalListSortingStrategy}
              >
                {[
                  ...[
                    ...row.getStartVisibleCells(),
                    ...row.getCenterVisibleCells(),
                  ].map((cell: Cell<DataGridFeatures, TData, unknown>) => (
                    <DataGridTableDndCell cell={cell} key={cell.id} />
                  )),
                  <DataGridTableFillBodyCell key="__data-grid-fill" />,
                  ...row
                    .getEndVisibleCells()
                    .map((cell: Cell<DataGridFeatures, TData, unknown>) => (
                      <DataGridTableDndCell cell={cell} key={cell.id} />
                    )),
                ]}
              </SortableContext>
            </DataGridTableBodyRow>
            {row.getIsExpanded() && <DataGridTableBodyRowExpandded row={row} />}
          </Fragment>
        );
      })}
    </>
  );
};

const MemoizedDataGridTableDndBodyRows = memo(
  DataGridTableDndBodyRows,
  (_prev, next) => !!next.table.state.columnResizing?.isResizingColumn
) as typeof DataGridTableDndBodyRows;

// dnd-kit's KeyboardSensor scrolls instead of moving when the target sits
// past the middle of a scroller, and assumes scrollLeft runs 0 to max. RTL
// runs -max to 0, so from the start edge ArrowRight became a scrollTo that
// clamps to 0 and swallowed the keypress. The sensor gets an LTR-shaped view
// of RTL scrollers, scrolled instantly: a smooth scroll drops a key pressed
// before it settles. The document scroller and the coordinate getter's copy
// stay real elements: both are matched by identity inside dnd-kit.
const toLtrScrollView = (element: Element): Element => {
  if (
    element === element.ownerDocument.scrollingElement ||
    getComputedStyle(element).direction !== 'rtl'
  ) {
    return element;
  }
  const offset = () => element.scrollWidth - element.clientWidth;
  return new Proxy(element, {
    get(target, key) {
      if (key === 'scrollLeft') return target.scrollLeft + offset();
      if (key === 'scrollTo') {
        return (options: ScrollToOptions) =>
          target.scrollTo(
            options.left === undefined
              ? options
              : {
                  ...options,
                  left: options.left - offset(),
                  behavior: 'instant',
                }
          );
      }
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
};

const getDataGridDropBesideSpans = <TData extends object>(
  table: DataGridTableInstance<TData>,
  event: DragEndEvent
): DragEndEvent => {
  const { active, over } = event;
  if (!over || active.id === over.id) return event;

  const rendered = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ].map((column) => column.id);
  const from = rendered.indexOf(String(active.id));
  const to = rendered.indexOf(String(over.id));
  if (from === -1 || to === -1) return event;

  for (const [ownerId, covered] of getDataGridHeaderSpans(table)) {
    const leaves = [ownerId, ...covered.map((column) => column.id)];
    if (!leaves.includes(String(over.id))) continue;
    if (leaves.includes(String(active.id))) return event;
    const edge = from < to ? leaves[leaves.length - 1] : leaves[0];
    return edge === String(over.id)
      ? event
      : { ...event, over: { ...over, id: edge } };
  }

  return event;
};

class DataGridKeyboardSensor extends KeyboardSensor {
  constructor(props: KeyboardSensorProps) {
    const { context, options } = props;
    const getCoordinates = options.coordinateGetter;
    super({
      ...props,
      context: {
        get current() {
          const current = context.current;
          return {
            ...current,
            scrollableAncestors:
              current.scrollableAncestors.map(toLtrScrollView),
          };
        },
      },
      options: getCoordinates
        ? {
            ...options,
            coordinateGetter: (event, args) =>
              getCoordinates(event, { ...args, context: context.current }),
          }
        : options,
    });
  }
}

const DataGridTableDnd = <TData extends object>({
  handleDragEnd,
  footerContent,
  accessibility,
}: {
  handleDragEnd: (event: DragEndEvent) => void;
  footerContent?: ReactNode;
  /**
   * Forwarded to dnd-kit's `DndContext`: its screen-reader instructions and
   * live-region announcements, which default to dnd-kit's English strings.
   */
  accessibility?: DndContextProps['accessibility'];
}) => {
  const { table, props } = useDataGrid();
  const mergedHeaderGroups = getDataGridTableMergedHeaderGroups(table);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    // Keyboard reordering moves one sortable position per keypress instead
    // of the sensor's raw 25px default.
    useSensor(DataGridKeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isDraggingColumn) return;

    const { body, documentElement } = document;
    const previousBodyCursor = body.style.cursor;
    const previousDocumentCursor = documentElement.style.cursor;

    body.style.cursor = 'grabbing';
    documentElement.style.cursor = 'grabbing';

    return () => {
      body.style.cursor = previousBodyCursor;
      documentElement.style.cursor = previousDocumentCursor;
    };
  }, [isDraggingColumn]);

  const modifiers = useMemo(() => {
    const restrictToTableBounds: Modifier = ({
      draggingNodeRect,
      transform,
    }) => {
      if (!draggingNodeRect || !containerRef.current) {
        return { ...transform, y: 0 };
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const edgeOffset = 0;

      const minX = containerRect.left - draggingNodeRect.left - edgeOffset;
      const maxX =
        containerRect.right -
        draggingNodeRect.left -
        draggingNodeRect.width +
        edgeOffset;

      return {
        ...transform,
        x: Math.min(Math.max(transform.x, minX), maxX),
        y: 0, // Lock vertical movement
      };
    };

    return [restrictToTableBounds];
  }, []);

  return (
    <DndContext
      accessibility={accessibility}
      collisionDetection={closestCenter}
      id={useId()}
      modifiers={modifiers}
      onDragCancel={() => setIsDraggingColumn(false)}
      onDragEnd={(event) => {
        setIsDraggingColumn(false);
        handleDragEnd(getDataGridDropBesideSpans(table, event));
      }}
      onDragStart={() => setIsDraggingColumn(true)}
      sensors={sensors}
    >
      <DataGridTableViewport
        viewportRef={containerRef}
        className={
          isDraggingColumn
            ? 'relative cursor-grabbing [&_*]:cursor-grabbing!'
            : 'relative'
        }
      >
        <DataGridTableBase>
          <DataGridTableHead>
            {mergedHeaderGroups.map((headerGroup, index) => {
              return (
                <DataGridTableHeadRow
                  key={headerGroup.id}
                  rowId={headerGroup.id}
                >
                  <SortableContext
                    items={table.state.columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {[
                      ...[
                        ...headerGroup.startHeaders,
                        ...headerGroup.centerHeaders,
                      ].map((header) => (
                        <DataGridTableDndHeader
                          header={header}
                          coveredHeaders={headerGroup.coveredHeaders.get(
                            header.id
                          )}
                          key={header.id}
                        />
                      )),
                      ...(index === 0
                        ? [
                            <DataGridTableFillHeadCell
                              key="__data-grid-fill"
                              rowSpan={mergedHeaderGroups.length}
                            />,
                          ]
                        : []),
                      ...headerGroup.endHeaders.map((header) => (
                        <DataGridTableDndHeader
                          header={header}
                          coveredHeaders={headerGroup.coveredHeaders.get(
                            header.id
                          )}
                          key={header.id}
                        />
                      )),
                    ]}
                  </SortableContext>
                </DataGridTableHeadRow>
              );
            })}
          </DataGridTableHead>

          {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
            <DataGridTableRowSpacer />
          )}

          <DataGridTableBody>
            <MemoizedDataGridTableDndBodyRows table={table} />
          </DataGridTableBody>

          {footerContent && (
            <DataGridTableFoot>{footerContent}</DataGridTableFoot>
          )}
        </DataGridTableBase>
      </DataGridTableViewport>
    </DndContext>
  );
};

export { DataGridTableDnd };
