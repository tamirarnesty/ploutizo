import { type Header, type Table } from '@tanstack/react-table';
import {
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';

type DataGridResizeStartEvent =
  | ReactMouseEvent<HTMLDivElement>
  | ReactTouchEvent<HTMLDivElement>;

type DataGridResizeDocumentEvent =
  | globalThis.MouseEvent
  | globalThis.TouchEvent;

const isDataGridTouchEvent = (
  event: DataGridResizeStartEvent | DataGridResizeDocumentEvent
): event is ReactTouchEvent<HTMLDivElement> | globalThis.TouchEvent => {
  return 'touches' in event;
};

const getDataGridResizeEventClientX = (
  event: DataGridResizeStartEvent | DataGridResizeDocumentEvent
) => {
  if (isDataGridTouchEvent(event)) {
    if (event.touches.length > 0) {
      return event.touches[0].clientX;
    }

    if (event.changedTouches.length > 0) {
      return event.changedTouches[0].clientX;
    }

    return undefined;
  }

  return event.clientX;
};

export const startDataGridColumnResizeOnEnd = <TData>(
  event: DataGridResizeStartEvent,
  header: Header<TData, unknown>,
  table: Table<TData>
) => {
  const column = table.getColumn(header.column.id);

  if (!column || !column.getCanResize()) return;
  if (isDataGridTouchEvent(event) && event.touches.length > 1) return;

  event.persist();

  const ownerDocument = event.currentTarget.ownerDocument;
  const previousBodyCursor = ownerDocument.body.style.cursor;
  const previousDocumentCursor = ownerDocument.documentElement.style.cursor;
  const startSize = header.getSize();
  const dragStartClientX = getDataGridResizeEventClientX(event);
  const headerCell = event.currentTarget.closest('th');
  const headerRect = headerCell?.getBoundingClientRect();
  const startOffset =
    headerRect &&
    Number.isFinite(
      table.options.columnResizeDirection === 'rtl'
        ? headerRect.left
        : headerRect.right
    )
      ? table.options.columnResizeDirection === 'rtl'
        ? headerRect.left
        : headerRect.right
      : dragStartClientX;

  if (typeof dragStartClientX !== 'number' || typeof startOffset !== 'number') {
    return;
  }

  ownerDocument.body.style.cursor = 'col-resize';
  ownerDocument.documentElement.style.cursor = 'col-resize';

  const columnSizingStart = header
    .getLeafHeaders()
    .map(
      (leafHeader) =>
        [leafHeader.column.id, leafHeader.column.getSize()] as [string, number]
    );
  const directionMultiplier =
    table.options.columnResizeDirection === 'rtl' ? -1 : 1;

  const updateOffset = (clientXPos?: number, commit = false) => {
    if (typeof clientXPos !== 'number') return;

    const nextColumnSizing: Record<string, number> = {};
    const deltaOffset = (clientXPos - dragStartClientX) * directionMultiplier;
    const deltaPercentage = Math.max(deltaOffset / startSize, -0.999999);

    columnSizingStart.forEach(([columnId, headerSize]) => {
      nextColumnSizing[columnId] =
        Math.round(
          Math.max(headerSize + headerSize * deltaPercentage, 0) * 100
        ) / 100;
    });

    table.setColumnSizingInfo((old) => ({
      ...old,
      startOffset,
      startSize,
      deltaOffset,
      deltaPercentage,
      columnSizingStart,
      isResizingColumn: column.id,
    }));

    if (commit) {
      table.setColumnSizing((old) => ({
        ...old,
        ...nextColumnSizing,
      }));
    }
  };

  const endResize = (clientXPos?: number) => {
    updateOffset(clientXPos, true);
    table.setColumnSizingInfo((old) => ({
      ...old,
      isResizingColumn: false,
      startOffset: null,
      startSize: null,
      deltaOffset: null,
      deltaPercentage: null,
      columnSizingStart: [],
    }));
    ownerDocument.body.style.cursor = previousBodyCursor;
    ownerDocument.documentElement.style.cursor = previousDocumentCursor;
  };

  const mouseMoveHandler = (moveEvent: globalThis.MouseEvent) => {
    updateOffset(moveEvent.clientX);
  };
  const mouseUpHandler = (upEvent: globalThis.MouseEvent) => {
    ownerDocument.removeEventListener('mousemove', mouseMoveHandler);
    ownerDocument.removeEventListener('mouseup', mouseUpHandler);
    endResize(upEvent.clientX);
  };
  const touchMoveHandler = (moveEvent: globalThis.TouchEvent) => {
    if (moveEvent.cancelable) {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
    }

    updateOffset(getDataGridResizeEventClientX(moveEvent));
  };
  const touchEndHandler = (endEvent: globalThis.TouchEvent) => {
    ownerDocument.removeEventListener('touchmove', touchMoveHandler);
    ownerDocument.removeEventListener('touchend', touchEndHandler);

    if (endEvent.cancelable) {
      endEvent.preventDefault();
      endEvent.stopPropagation();
    }

    endResize(getDataGridResizeEventClientX(endEvent));
  };

  const passiveIfSupported = { passive: false } as const;

  if (isDataGridTouchEvent(event)) {
    ownerDocument.addEventListener(
      'touchmove',
      touchMoveHandler,
      passiveIfSupported
    );
    ownerDocument.addEventListener(
      'touchend',
      touchEndHandler,
      passiveIfSupported
    );
  } else {
    ownerDocument.addEventListener(
      'mousemove',
      mouseMoveHandler,
      passiveIfSupported
    );
    ownerDocument.addEventListener(
      'mouseup',
      mouseUpHandler,
      passiveIfSupported
    );
  }

  table.setColumnSizingInfo((old) => ({
    ...old,
    startOffset,
    startSize,
    deltaOffset: 0,
    deltaPercentage: 0,
    columnSizingStart,
    isResizingColumn: column.id,
  }));
};
