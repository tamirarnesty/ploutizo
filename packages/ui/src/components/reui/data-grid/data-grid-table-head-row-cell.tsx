'use client';

import { cva } from 'class-variance-authority';
import type { Header } from '@tanstack/react-table';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  getDataGridCssColumnWidth,
  getDataGridUsesCssColumnSizing,
} from '@/components/reui/data-grid/data-grid-column-layout';
import { getDataGridTableColumnPinPresentation } from '@/components/reui/data-grid/data-grid-table-cell-pinning';
import { startDataGridColumnResizeOnEnd } from '@/components/reui/data-grid/data-grid-table-column-resize';
import { getDataGridTablePinningStyles } from '@/components/reui/data-grid/data-grid-table-pinning';
import { cn } from '@/lib/utils';

const headerCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'h-8 px-2',
      default: 'px-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const getDataGridTableHeadCellStyle = <TData,>(
  header: Header<TData, unknown>,
  tableLayout: ReturnType<typeof useDataGrid>['props']['tableLayout'],
  dndStyle?: CSSProperties
): CSSProperties => {
  const { column } = header;
  return {
    ...(tableLayout?.width === 'fixed' &&
      !getDataGridUsesCssColumnSizing(tableLayout) && {
        width: header.getSize(),
      }),
    ...(tableLayout?.columnsPinnable &&
      column.getCanPin() &&
      getDataGridTablePinningStyles(column)),
    ...(getDataGridUsesCssColumnSizing(tableLayout) && {
      width: getDataGridCssColumnWidth(
        `--header-${header.id}-size`,
        column.columnDef.meta?.grow
      ),
    }),
    ...(dndStyle ? dndStyle : null),
  };
};

const getDataGridTableHeadCellClassName = <TData,>(
  header: Header<TData, unknown>,
  tableLayout: ReturnType<typeof useDataGrid>['props']['tableLayout'],
  tableClassNames: ReturnType<typeof useDataGrid>['props']['tableClassNames']
) => {
  const { column } = header;
  const isLastVisibleColumn =
    column.getIndex() ===
    header.getContext().table.getVisibleLeafColumns().length - 1;
  const headerCellSpacing = headerCellSpacingVariants({
    size: tableLayout?.dense ? 'dense' : 'default',
  });

  return cn(
    'relative h-9 text-left align-middle font-normal text-secondary-foreground/80 rtl:text-right [&:has([role=checkbox])]:pe-0',
    headerCellSpacing,
    tableLayout?.cellBorder && 'border-e',
    tableLayout?.columnsResizable &&
      column.getCanResize() &&
      'overflow-visible',
    tableLayout?.columnsResizable &&
      column.getCanResize() &&
      isLastVisibleColumn &&
      'pe-8',
    tableLayout?.columnsPinnable &&
      column.getCanPin() &&
      'data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s! [&[data-pinned][data-last-col]]:border-border',
    header.column.columnDef.meta?.headerClassName,
    column.getIndex() === 0 ||
      column.getIndex() === header.headerGroup.headers.length - 1
      ? tableClassNames?.edgeCell
      : ''
  );
};

export const DataGridTableHeadRowCell = <TData,>({
  children,
  header,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  header: Header<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) => {
  const { props } = useDataGrid();
  const { column } = header;
  const pinPresentation = getDataGridTableColumnPinPresentation(column);

  return (
    <th
      key={header.id}
      ref={dndRef}
      style={getDataGridTableHeadCellStyle(header, props.tableLayout, dndStyle)}
      data-pinned={pinPresentation.isPinned || undefined}
      data-last-col={pinPresentation.dataLastCol}
      className={getDataGridTableHeadCellClassName(
        header,
        props.tableLayout,
        props.tableClassNames
      )}
    >
      {children}
    </th>
  );
};

export const DataGridTableHeadRowCellResize = <TData,>({
  header,
}: {
  header: Header<TData, unknown>;
}) => {
  const { props, table } = useDataGrid();
  const { column } = header;
  const isLastVisibleColumn =
    column.getIndex() ===
    header.getContext().table.getVisibleLeafColumns().length - 1;
  const isResizeModeOnEnd =
    (props.tableLayout?.columnsResizeMode ?? table.options.columnResizeMode) ===
    'onEnd';

  const handleResizeStart = (
    event: ReactMouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (isResizeModeOnEnd) {
      startDataGridColumnResizeOnEnd(event, header, table);
      return;
    }

    header.getResizeHandler()(event);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${column.id} column`}
      tabIndex={0}
      onDoubleClick={() => column.resetSize()}
      onMouseDown={handleResizeStart}
      onTouchStart={handleResizeStart}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          column.resetSize();
        }
      }}
      className={cn(
        'user-select-none absolute top-0 z-10 flex h-full cursor-col-resize touch-none',
        isLastVisibleColumn
          ? 'end-0 w-5 justify-end before:hidden'
          : '-end-2 w-5 justify-center before:absolute before:inset-y-0 before:w-px before:-translate-x-px before:bg-border',
        column.getIsResizing() &&
          (isResizeModeOnEnd
            ? 'opacity-100'
            : isLastVisibleColumn
              ? 'opacity-100 before:absolute before:inset-y-0 before:end-0 before:block before:w-0.5 before:bg-primary'
              : 'opacity-100 before:block before:w-0.5 before:bg-primary')
      )}
    />
  );
};
