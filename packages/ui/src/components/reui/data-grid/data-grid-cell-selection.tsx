'use client';

'use no memo';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Subscribe } from '@tanstack/react-table';

import { cn } from 'cn';
import type {
  DataGridCellChange,
  DataGridCellRejection,
  DataGridCellsChangeDetails,
  DataGridColumnCellEdit,
  DataGridTableInstance,
} from '@/components/reui/data-grid/data-grid';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from 'react';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import { Button } from '@/components/button';

/** Where a finished edit sends the focused cell, or null to stay. */
type DataGridEditorAdvance = 'down' | 'up' | 'right' | 'left' | null;

interface DataGridFocusCellOptions {
  /** Also open the cell's editor, the way Enter would. */
  edit?: boolean;
}

/** Imperative surface of the cell-selection controller. */
interface DataGridCellSelectionApi {
  /**
   * Moves the grid's cell focus AND the document focus together, retrying
   * briefly while the row mounts, so a freshly created row is typeable
   * without an extra click. `edit: true` also opens the cell's editor the
   * way Enter would. Registered once the controller is wired; null while
   * cell selection is off.
   */
  focusCell: (
    rowId: string,
    columnId: string,
    options?: DataGridFocusCellOptions
  ) => void;
  /** Clears every range and the focused cell. */
  clearSelection: () => void;
  /** Scrolls a rendered cell into view without moving focus. */
  scrollToCell: (rowId: string, columnId: string) => void;
}

interface DataGridEditorSession {
  rowId: string;
  columnId: string;
  control: 'text' | 'textarea';
  initialValue: string;
  baseline: string;
  label: string;
}

function serializeDataGridClipboardField(field: string): string {
  // Excel and Sheets quote a field containing a delimiter and double inner
  // quotes; everything else ships bare.
  return /[\t\n\r"]/.test(field)
    ? '"' + field.replaceAll('"', '""') + '"'
    : field;
}

/** Row-major grid to TSV, CRLF rows, Excel-style quoting. */
function serializeDataGridClipboardText(grid: string[][]): string {
  return grid
    .map((line) => line.map(serializeDataGridClipboardField).join('\t'))
    .join('\r\n');
}

/**
 * TSV to a row-major grid. A stateful scan, not a split: a quoted field may
 * contain tabs, quotes and both newline flavors, which is exactly what Excel
 * emits for a multi-line cell.
 */
function parseDataGridClipboardText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === '\t') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  rows.push(row);

  // Excel terminates the payload with one newline; that final empty line is
  // an artifact of the format, not a data row.
  const last = rows[rows.length - 1];
  if (rows.length > 1 && last?.length === 1 && last[0] === '') rows.pop();

  return rows;
}

function tileDataGridClipboardBlock(
  block: string[][],
  rowCount: number,
  columnCount: number
): string[][] {
  const tiled: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const source = block[r % block.length] ?? [];
    const line: string[] = [];
    for (let c = 0; c < columnCount; c++) {
      line.push(source[c % (source.length || 1)] ?? '');
    }
    tiled.push(line);
  }
  return tiled;
}

function escapeDataGridClipboardHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// A minimal text/html flavor alongside the TSV keeps type fidelity when the
// paste target is Excel or Sheets. Newlines inside a field become <br>, the
// HTML representation of a multi-line cell; raw newlines would collapse to
// spaces on paste.
function renderDataGridClipboardHtml(grid: string[][]): string {
  const body = grid
    .map(
      (line) =>
        '<tr>' +
        line
          .map(
            (field) =>
              '<td>' +
              escapeDataGridClipboardHtml(field).replace(
                /\r\n|\r|\n/g,
                '<br>'
              ) +
              '</td>'
          )
          .join('') +
        '</tr>'
    )
    .join('');
  return '<table><tbody>' + body + '</tbody></table>';
}

function getDataGridDisplayOrderedColumns<TData extends object>(
  table: DataGridTableInstance<TData>
) {
  return [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
}

function getDataGridWritableCellEdit<TData extends object>(
  column: {
    columnDef: { meta?: { cellEdit?: DataGridColumnCellEdit<TData> } };
  },
  row?: TData
): DataGridColumnCellEdit<TData> | null {
  const cellEdit = column.columnDef.meta?.cellEdit;
  if (!cellEdit || cellEdit.editable === false) return null;
  if (
    typeof cellEdit.editable === 'function' &&
    row !== undefined &&
    !cellEdit.editable(row)
  ) {
    return null;
  }
  return cellEdit;
}

function getDataGridRenderedRowIds<TData extends object>(
  table: DataGridTableInstance<TData>,
  viewport: HTMLElement | null | undefined
): Set<string> | null {
  if (!viewport) return null;
  if (
    table.getRowModel().rows.length === table.getRowsInDisplayOrder().length
  ) {
    return null;
  }
  const rendered = new Set<string>(
    table.getRowModel().rows.map((row: { id: string }) => row.id)
  );
  for (const rowEl of Array.from(
    viewport.querySelectorAll('tbody tr[data-row-id]')
  )) {
    const id = rowEl.getAttribute('data-row-id');
    if (id) rendered.add(id);
  }
  return rendered;
}

function getDataGridVisibleSelectedCellCount<TData extends object>(
  table: DataGridTableInstance<TData>,
  viewport: HTMLElement | null
): number {
  const bounds = table.getCellSelectionBounds();
  if (!bounds.length) return 0;
  const rows = table.getRowsInDisplayOrder();
  const columns = getDataGridDisplayOrderedColumns(table);
  const rendered = getDataGridRenderedRowIds(table, viewport);
  let count = 0;
  for (const bound of bounds) {
    let rowCount = 0;
    for (let r = bound.minRowIndex; r <= bound.maxRowIndex; r++) {
      const row = rows[r];
      if (row && (!rendered || rendered.has(row.id))) rowCount += 1;
    }
    let columnCount = 0;
    for (let c = bound.minColumnIndex; c <= bound.maxColumnIndex; c++) {
      const column = columns[c];
      if (column && column.columnDef.enableCellSelection !== false) {
        columnCount += 1;
      }
    }
    count += rowCount * columnCount;
  }
  return count;
}

/**
 * The bound of the ACTIVE (most recent) region. getCellSelectionBounds()
 * sorts geometrically, so its last entry is merely the bottom-right
 * rectangle; the focused cell anchors the newest range, so the bound
 * containing it is the active one. Falls back to the geometric last when
 * the focused cell sits in no bound (the newest range was an exclude).
 */
function getDataGridActiveBound<TData extends object>(
  table: DataGridTableInstance<TData>
) {
  const bounds = table.getCellSelectionBounds();
  if (!bounds.length) return null;
  const focused = table.getFocusedCell();
  if (focused) {
    // O(1): v9 caches the display index on the row itself.
    const rowIndex = focused.row.getDisplayIndex();
    const columnIndex = getDataGridDisplayOrderedColumns(table).findIndex(
      (column) => column.id === focused.column.id
    );
    const containing = bounds.find(
      (bound) =>
        rowIndex >= bound.minRowIndex &&
        rowIndex <= bound.maxRowIndex &&
        columnIndex >= bound.minColumnIndex &&
        columnIndex <= bound.maxColumnIndex
    );
    if (containing) return containing;
  }
  return bounds[bounds.length - 1] ?? null;
}

/**
 * Resolves the cell one visual step away from a given cell: selectable
 * columns for horizontal, RENDERED row order for vertical. The feature's
 * own move/extend resolve rows through the page slice and stall on pinned
 * rows (a bottom-pinned draft), while id-addressed cells work everywhere.
 * "edge" means the step is at the grid boundary; null means the position
 * is not resolvable here and the caller should use the feature's move.
 */
function getDataGridStepTarget<TData extends object>(
  table: DataGridTableInstance<TData>,
  viewport: HTMLElement,
  from: { rowId: string; columnId: string },
  direction: 'up' | 'down' | 'left' | 'right'
): { rowId: string; columnId: string } | 'edge' | null {
  if (direction === 'left' || direction === 'right') {
    const selectable = getDataGridDisplayOrderedColumns(table).filter(
      (column) => column.columnDef.enableCellSelection !== false
    );
    const index = selectable.findIndex((column) => column.id === from.columnId);
    if (index === -1) return null;
    const next = selectable[index + (direction === 'right' ? 1 : -1)];
    return next ? { rowId: from.rowId, columnId: next.id } : 'edge';
  }
  const renderedIds = Array.from(
    viewport.querySelectorAll('tbody tr[data-row-id]')
  ).map((row) => row.getAttribute('data-row-id'));
  const index = renderedIds.indexOf(from.rowId);
  if (index === -1) return null;
  const nextId = renderedIds[index + (direction === 'down' ? 1 : -1)];
  return nextId ? { rowId: nextId, columnId: from.columnId } : 'edge';
}

/**
 * Shift+Arrow: the feature keeps focus on the anchor and grows the range
 * from its active corner. When its own extend cannot resolve the step
 * (the active corner sits on a pinned row, or the next visual row is a
 * pinned row outside the page slice), re-derive the active corner from
 * the bounds and step it in visual space through selectCellRange.
 */
function extendDataGridSelection<TData extends object>(
  table: DataGridTableInstance<TData>,
  viewport: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right'
): { rowId: string; columnId: string } | null {
  const activeCorner = () => {
    const focused = table.getFocusedCell();
    if (!focused) return null;
    const bound = getDataGridActiveBound(table);
    if (!bound) return null;
    const rows = table.getRowsInDisplayOrder();
    const allColumns = getDataGridDisplayOrderedColumns(table);
    const rowIndex = focused.row.getDisplayIndex();
    const columnIndex = allColumns.findIndex(
      (column) => column.id === focused.column.id
    );
    return {
      rowId:
        rows[
          rowIndex === bound.minRowIndex ? bound.maxRowIndex : bound.minRowIndex
        ]?.id ?? focused.row.id,
      columnId:
        allColumns[
          columnIndex === bound.minColumnIndex
            ? bound.maxColumnIndex
            : bound.minColumnIndex
        ]?.id ?? focused.column.id,
    };
  };
  const boundKey = () => {
    const bounds = table.getCellSelectionBounds();
    const bound = bounds[bounds.length - 1];
    return bound
      ? `${bounds.length}:${bound.minRowIndex}-${bound.maxRowIndex}:${bound.minColumnIndex}-${bound.maxColumnIndex}`
      : 'none';
  };
  const before = boundKey();
  table.extendCellSelection(direction);
  if (boundKey() !== before) return activeCorner();
  const focused = table.getFocusedCell();
  if (!focused) return null;
  const active = activeCorner() ?? {
    rowId: focused.row.id,
    columnId: focused.column.id,
  };
  const target = getDataGridStepTarget(table, viewport, active, direction);
  if (!target || target === 'edge') return null;
  table.selectCellRange(
    {
      anchorRowId: focused.row.id,
      anchorColumnId: focused.column.id,
      focusRowId: target.rowId,
      focusColumnId: target.columnId,
    },
    { mode: 'replace' }
  );
  return target;
}

function getDataGridActiveRegionGrid<TData extends object>(
  table: DataGridTableInstance<TData>,
  viewport?: HTMLElement | null
): string[][] | null {
  const bound = getDataGridActiveBound(table);
  if (!bound) return null;

  const rows = table.getRowsInDisplayOrder();
  const columns = getDataGridDisplayOrderedColumns(table);
  const rendered = getDataGridRenderedRowIds(table, viewport);
  const grid: string[][] = [];

  for (let r = bound.minRowIndex; r <= bound.maxRowIndex; r++) {
    const row = rows[r];
    if (!row || (rendered && !rendered.has(row.id))) continue;
    const cells = row.getAllCellsByColumnId();
    const line: string[] = [];
    for (let c = bound.minColumnIndex; c <= bound.maxColumnIndex; c++) {
      const column = columns[c];
      if (!column || column.columnDef.enableCellSelection === false) continue;
      const value = cells[column.id]?.getValue();
      const format = column.columnDef.meta?.cellEdit?.format;
      line.push(format ? format(value, row.original) : String(value ?? ''));
    }
    grid.push(line);
  }

  return grid.length ? grid : null;
}

function buildDataGridClearDetails<TData extends object>(
  table: DataGridTableInstance<TData>,
  source: 'clear' | 'cut',
  activeRegionOnly: boolean,
  viewport?: HTMLElement | null
): DataGridCellsChangeDetails<TData> | null {
  const allBounds = table.getCellSelectionBounds();
  const activeBound = getDataGridActiveBound(table);
  const bounds = activeRegionOnly
    ? activeBound
      ? [activeBound]
      : []
    : allBounds;
  if (!bounds.length) return null;

  const rows = table.getRowsInDisplayOrder();
  const columns = getDataGridDisplayOrderedColumns(table);
  const rendered = getDataGridRenderedRowIds(table, viewport);
  const changes: DataGridCellChange<TData>[] = [];

  for (const bound of bounds) {
    for (let r = bound.minRowIndex; r <= bound.maxRowIndex; r++) {
      const row = rows[r];
      if (!row || (rendered && !rendered.has(row.id))) continue;
      const cells = row.getAllCellsByColumnId();
      for (let c = bound.minColumnIndex; c <= bound.maxColumnIndex; c++) {
        const column = columns[c];
        if (!column || column.columnDef.enableCellSelection === false) continue;
        const cellEdit = getDataGridWritableCellEdit<TData>(
          column,
          row.original
        );
        if (!cellEdit) continue;
        changes.push({
          rowId: row.id,
          columnId: column.id,
          row: row.original,
          previousValue: cells[column.id]?.getValue(),
          value: cellEdit.clearValue ?? null,
        });
      }
    }
  }

  return changes.length ? { source, changes, rejected: [] } : null;
}

type DataGridPasteTarget = {
  /** Display indexes of the pasted region's first and last row. */
  startRowIndex: number;
  endRowIndex: number;
  /** How many rows a paste actually wrote (hidden rows are skipped). */
  rowCount?: number;
  /** Display indexes of the pasted region's first and last column. */
  startColumnIndex: number;
  endColumnIndex: number;
};

function buildDataGridPasteDetails<TData extends object>(
  table: DataGridTableInstance<TData>,
  block: string[][],
  viewport?: HTMLElement | null
): {
  details: DataGridCellsChangeDetails<TData>;
  target: DataGridPasteTarget;
} | null {
  if (!block.length) return null;
  const bound = getDataGridActiveBound(table);
  if (!bound) return null;

  const rows = table.getRowsInDisplayOrder();
  const columns = getDataGridDisplayOrderedColumns(table);
  const rendered = getDataGridRenderedRowIds(table, viewport);

  const targetColumns: Array<{
    column: (typeof columns)[number];
    displayIndex: number;
  }> = [];
  let regionColumns = 0;
  for (let c = bound.minColumnIndex; c < columns.length; c++) {
    const column = columns[c];
    if (!column || column.columnDef.enableCellSelection === false) continue;
    targetColumns.push({ column, displayIndex: c });
    if (c <= bound.maxColumnIndex) regionColumns += 1;
  }
  if (!regionColumns) return null;

  const blockRows = block.length;
  const blockColumns = block.reduce(
    (max, line) => Math.max(max, line.length),
    1
  );
  const regionRows = bound.maxRowIndex - bound.minRowIndex + 1;

  let rowCount: number;
  let columnCount: number;
  if (blockRows === 1 && blockColumns === 1) {
    rowCount = regionRows;
    columnCount = regionColumns;
  } else if (
    regionRows % blockRows === 0 &&
    regionColumns % blockColumns === 0
  ) {
    rowCount = regionRows;
    columnCount = regionColumns;
  } else {
    rowCount = blockRows;
    columnCount = blockColumns;
  }

  const tiled = tileDataGridClipboardBlock(block, rowCount, columnCount);
  const startRowIndex = bound.minRowIndex;

  const targetRows: Array<{
    row: (typeof rows)[number];
    displayIndex: number;
  }> = [];
  for (let r = startRowIndex; r < rows.length; r++) {
    if (targetRows.length === rowCount) break;
    const row = rows[r];
    if (!row || (rendered && !rendered.has(row.id))) continue;
    targetRows.push({ row, displayIndex: r });
  }

  const changes: DataGridCellChange<TData>[] = [];
  const rejected: DataGridCellRejection[] = [];

  for (let r = 0; r < targetRows.length; r++) {
    const row = targetRows[r].row;
    const cells = row.getAllCellsByColumnId();
    for (let c = 0; c < columnCount; c++) {
      const column = targetColumns[c]?.column;
      if (!column) continue;
      const raw = tiled[r]?.[c] ?? '';
      const cellEdit = getDataGridWritableCellEdit<TData>(column, row.original);
      if (!cellEdit) {
        rejected.push({
          rowId: row.id,
          columnId: column.id,
          raw,
          reason: 'readonly',
        });
        continue;
      }
      const value = cellEdit.parse ? cellEdit.parse(raw, row.original) : raw;
      if (value === undefined) {
        rejected.push({
          rowId: row.id,
          columnId: column.id,
          raw,
          reason: 'invalid',
        });
        continue;
      }
      changes.push({
        rowId: row.id,
        columnId: column.id,
        row: row.original,
        previousValue: cells[column.id]?.getValue(),
        value,
      });
    }
  }

  if (!changes.length && !rejected.length) return null;
  const lastTarget =
    targetColumns[Math.min(columnCount, targetColumns.length) - 1];
  return {
    details: { source: 'paste', changes, rejected },
    target: {
      startRowIndex,
      endRowIndex:
        targetRows[targetRows.length - 1]?.displayIndex ?? startRowIndex,
      rowCount: targetRows.length,
      startColumnIndex: targetColumns[0].displayIndex,
      endColumnIndex: lastTarget.displayIndex,
    },
  };
}

function invertDataGridCellsChange<TData extends object>(
  details: DataGridCellsChangeDetails<TData>
): DataGridCellsChangeDetails<TData> {
  return {
    source: details.source,
    changes: details.changes.map((change) => ({
      ...change,
      value: change.previousValue,
      previousValue: change.value,
    })),
    rejected: [],
  };
}

function selectDataGridRegion<TData extends object>(
  table: DataGridTableInstance<TData>,
  target: DataGridPasteTarget
) {
  const rows = table.getRowsInDisplayOrder();
  const columns = getDataGridDisplayOrderedColumns(table);
  const anchorRow = rows[target.startRowIndex];
  const anchorColumn = columns[target.startColumnIndex];
  const focusRow = rows[Math.min(target.endRowIndex, rows.length - 1)];
  const focusColumn = columns[target.endColumnIndex];
  if (!anchorRow || !anchorColumn || !focusRow || !focusColumn) return;
  table.selectCellRange(
    {
      anchorRowId: anchorRow.id,
      anchorColumnId: anchorColumn.id,
      focusRowId: focusRow.id,
      focusColumnId: focusColumn.id,
    },
    { mode: 'replace' }
  );
}

const dataGridGestureOutlineClasses =
  'outline-primary pointer-events-none absolute z-[35] outline-1 outline-dashed -outline-offset-1';

function startDataGridFillSession<TData extends object>(options: {
  table: DataGridTableInstance<TData>;
  viewport: HTMLElement;
  onCellsChange: ((details: DataGridCellsChangeDetails<TData>) => void) | null;
}) {
  const { table, viewport, onCellsChange } = options;
  if (table.getCellSelectionBounds().length > 1) return;
  const bound = getDataGridActiveBound(table);
  if (!bound) return;

  const rows = table.getRowsInDisplayOrder();
  const columns = getDataGridDisplayOrderedColumns(table);
  const domRowIds = new Set<string>();
  for (const rowEl of Array.from(
    viewport.querySelectorAll('tbody tr[data-row-id]')
  )) {
    const id = rowEl.getAttribute('data-row-id');
    if (id) domRowIds.add(id);
  }
  const visibleRows: Array<{
    row: (typeof rows)[number];
    displayIndex: number;
  }> = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (domRowIds.has(row.id)) {
      visibleRows.push({ row, displayIndex: i });
    }
  }
  const visibleIndexById = new Map(
    visibleRows.map((entry, index) => [entry.row.id, index])
  );
  const sourceRows = visibleRows.filter(
    ({ displayIndex }) =>
      displayIndex >= bound.minRowIndex && displayIndex <= bound.maxRowIndex
  );
  const sourceEndVisibleIndex = sourceRows.length
    ? visibleIndexById.get(sourceRows[sourceRows.length - 1].row.id)!
    : -1;
  if (sourceEndVisibleIndex === -1) return;
  const columnIndexById = new Map(
    columns.map((column, index) => [column.id, index])
  );
  const isFillableColumn = (column: (typeof columns)[number]) =>
    column.columnDef.enableCellSelection !== false &&
    !!getDataGridWritableCellEdit<TData>(column);

  let extension: { axis: 'row' | 'column'; count: number } | null = null;
  let previewCells: Element[] = [];

  const previewOutline = viewport.ownerDocument.createElement('div');
  previewOutline.setAttribute('data-slot', 'data-grid-cell-fill-preview');
  previewOutline.className = dataGridGestureOutlineClasses;
  previewOutline.style.display = 'none';
  viewport.appendChild(previewOutline);
  viewport.setAttribute('data-cell-filling', '');

  const sourceCorner = (rowId: string, columnId: string | undefined) =>
    columnId
      ? viewport.querySelector(
          `tr[data-row-id="${CSS.escape(rowId)}"] td[data-col-id="${CSS.escape(columnId)}"]`
        )
      : null;
  const positionPreviewOutline = () => {
    const first = sourceRows.length
      ? sourceCorner(sourceRows[0].row.id, columns[bound.minColumnIndex]?.id)
      : null;
    const lastSource = sourceRows.length
      ? sourceCorner(
          sourceRows[sourceRows.length - 1].row.id,
          columns[bound.maxColumnIndex]?.id
        )
      : null;
    const far = previewCells.length
      ? previewCells[previewCells.length - 1]
      : lastSource;
    if (!first || !far) {
      previewOutline.style.display = 'none';
      return;
    }
    const firstRect = first.getBoundingClientRect();
    const farRect = far.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const left = Math.min(firstRect.left, farRect.left);
    const top = Math.min(firstRect.top, farRect.top);
    previewOutline.style.display = 'block';
    previewOutline.style.left = `${left - viewportRect.left + viewport.scrollLeft}px`;
    previewOutline.style.top = `${top - viewportRect.top + viewport.scrollTop}px`;
    previewOutline.style.width = `${Math.max(firstRect.right, farRect.right) - left}px`;
    previewOutline.style.height = `${Math.max(firstRect.bottom, farRect.bottom) - top}px`;
  };

  const clearPreview = () => {
    for (const cell of previewCells)
      cell.removeAttribute('data-cell-fill-target');
    previewCells = [];
    positionPreviewOutline();
  };

  const getExtensionTargets = () => {
    if (!extension) return null;
    const columnEntries = columns.map((column, displayIndex) => ({
      column,
      displayIndex,
    }));
    return extension.axis === 'row'
      ? {
          rowEntries: visibleRows.slice(
            sourceEndVisibleIndex + 1,
            sourceEndVisibleIndex + 1 + extension.count
          ),
          columnEntries: columnEntries
            .slice(bound.minColumnIndex, bound.maxColumnIndex + 1)
            .filter(({ column }) => isFillableColumn(column)),
        }
      : {
          rowEntries: sourceRows,
          columnEntries: columnEntries
            .slice(
              bound.maxColumnIndex + 1,
              bound.maxColumnIndex + 1 + extension.count
            )
            .filter(({ column }) => isFillableColumn(column)),
        };
  };

  const applyPreview = () => {
    clearPreview();
    const targets = getExtensionTargets();
    if (!targets) return;
    for (const { row } of targets.rowEntries) {
      const rowElement = viewport.querySelector(
        `tr[data-row-id="${CSS.escape(row.id)}"]`
      );
      if (!rowElement) continue;
      for (const { column } of targets.columnEntries) {
        if (!getDataGridWritableCellEdit<TData>(column, row.original)) continue;
        const cellElement = rowElement.querySelector(
          `td[data-col-id="${CSS.escape(column.id)}"]`
        );
        if (!cellElement) continue;
        cellElement.setAttribute('data-cell-fill-target', 'true');
        previewCells.push(cellElement);
      }
    }

    positionPreviewOutline();
  };

  const handleMove = (event: MouseEvent) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cellElement = element?.closest?.('td[data-col-id]');
    const rowElement = cellElement?.closest?.('tr[data-row-id]');
    if (!cellElement || !rowElement || !viewport.contains(cellElement)) return;

    const rowVisibleIndex = visibleIndexById.get(
      rowElement.getAttribute('data-row-id') ?? ''
    );
    const columnIndex = columnIndexById.get(
      cellElement.getAttribute('data-col-id') ?? ''
    );
    if (rowVisibleIndex === undefined || columnIndex === undefined) return;

    const rowsDelta = Math.max(0, rowVisibleIndex - sourceEndVisibleIndex);
    const columnsDelta = Math.max(0, columnIndex - bound.maxColumnIndex);
    const next: typeof extension =
      rowsDelta === 0 && columnsDelta === 0
        ? null
        : rowsDelta >= columnsDelta
          ? { axis: 'row', count: rowsDelta }
          : { axis: 'column', count: columnsDelta };

    if (next?.axis === extension?.axis && next?.count === extension?.count) {
      return;
    }
    extension = next;
    applyPreview();
  };

  const finish = (commit: boolean) => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleUp);
    document.removeEventListener('keydown', handleKey, true);
    clearPreview();
    previewOutline.remove();
    viewport.removeAttribute('data-cell-filling');
    if (!commit || !extension || !onCellsChange) return;
    const targets = getExtensionTargets();
    if (!targets || !targets.rowEntries.length) return;

    const changes: DataGridCellChange<TData>[] = [];
    const rejected: DataGridCellRejection[] = [];

    if (extension.axis === 'row') {
      for (let offset = 0; offset < targets.rowEntries.length; offset++) {
        const targetRow = targets.rowEntries[offset].row;
        const sourceRow = sourceRows[offset % sourceRows.length].row;
        const targetCells = targetRow.getAllCellsByColumnId();
        const sourceCells = sourceRow.getAllCellsByColumnId();
        for (const { column } of targets.columnEntries) {
          if (!getDataGridWritableCellEdit<TData>(column, targetRow.original)) {
            continue;
          }
          changes.push({
            rowId: targetRow.id,
            columnId: column.id,
            row: targetRow.original,
            previousValue: targetCells[column.id]?.getValue(),
            value: sourceCells[column.id]?.getValue(),
          });
        }
      }
    } else {
      const regionColumns = bound.maxColumnIndex - bound.minColumnIndex + 1;
      for (const { row } of targets.rowEntries) {
        const cells = row.getAllCellsByColumnId();
        for (const {
          column: targetColumn,
          displayIndex,
        } of targets.columnEntries) {
          const offset = displayIndex - (bound.maxColumnIndex + 1);
          const sourceColumn =
            columns[bound.minColumnIndex + (offset % regionColumns)];
          if (!sourceColumn) continue;
          const targetEdit = getDataGridWritableCellEdit<TData>(
            targetColumn,
            row.original
          );
          if (!targetEdit) continue;
          const sourceValue = cells[sourceColumn.id]?.getValue();
          let value: unknown = sourceValue;
          if (targetColumn.id !== sourceColumn.id && targetEdit.parse) {
            const sourceFormat = sourceColumn.columnDef.meta?.cellEdit?.format;
            const raw = sourceFormat
              ? sourceFormat(sourceValue, row.original)
              : String(sourceValue ?? '');
            const parsed = targetEdit.parse(raw, row.original);
            if (parsed === undefined) {
              rejected.push({
                rowId: row.id,
                columnId: targetColumn.id,
                raw,
                reason: 'invalid',
              });
              continue;
            }
            value = parsed;
          }
          changes.push({
            rowId: row.id,
            columnId: targetColumn.id,
            row: row.original,
            previousValue: cells[targetColumn.id]?.getValue(),
            value,
          });
        }
      }
    }

    if (changes.length || rejected.length) {
      onCellsChange({ source: 'fill', changes, rejected });
    }

    selectDataGridRegion(table, {
      startRowIndex: bound.minRowIndex,
      endRowIndex:
        extension.axis === 'row'
          ? targets.rowEntries[targets.rowEntries.length - 1].displayIndex
          : bound.maxRowIndex,
      startColumnIndex: bound.minColumnIndex,
      endColumnIndex:
        bound.maxColumnIndex +
        (extension.axis === 'column' ? extension.count : 0),
    });
  };

  const handleUp = () => finish(true);
  const handleKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    finish(false);
  };

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleUp);
  document.addEventListener('keydown', handleKey, true);
}

function isDataGridEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'input, textarea, select, [contenteditable], [data-cell-interactive]'
    ) != null
  );
}

function isDataGridInteractiveKeyTarget(target: EventTarget | null): boolean {
  return (
    isDataGridEditableTarget(target) ||
    (target instanceof Element &&
      target.closest('button, a, [role="checkbox"]') != null)
  );
}

/**
 * Headless spreadsheet controller: keyboard navigation, clipboard, clear and
 * the fill-handle drag. Mount once inside `<DataGrid>`, next to the table.
 * Renders only a hidden anchor; the real listeners attach to the grid's own
 * body viewport, which also receives focus (container-focus model), so a
 * virtualized row unmounting can never strand `document.activeElement`.
 */
const scheduleDataGridTimer = (callback: () => void, delay: number) =>
  setTimeout(callback, delay);

function useDataGridCellSelectionController<TData extends object>({
  apiRef,
  clipboard = true,
  keyboard = true,
}: {
  /** Receives the controller's imperative API, e.g. for create-row flows. */
  apiRef?: RefObject<DataGridCellSelectionApi | null>;
  /** Native copy, cut and paste handling. Defaults to true. */
  clipboard?: boolean;
  /**
   * Arrows (with Ctrl/Cmd edge jumps), Home/End, PageUp/PageDown, Enter,
   * F2, type-to-edit, Tab, Ctrl/Cmd+A, Delete, Escape. Defaults to true.
   */
  keyboard?: boolean;
}) {
  const context = useDataGrid<TData>();

  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [viewportEl, setViewportEl] = useState<HTMLElement | null>(null);
  const [editorSession, setEditorSession] =
    useState<DataGridEditorSession | null>(null);
  const { table } = context;
  const enabled =
    !!context.props.tableLayout?.cellSelection &&
    table.atoms.cellSelection != null;
  const [latest] = useState(() => ({
    table,
    onCellsChange: context.props.onCellsChange,
    cellSelectionMode: context.props.tableLayout?.cellSelectionMode,
    onCellEditRequest: context.props.onCellEditRequest,
    onCellsCopy: context.props.onCellsCopy,
    cellEditMode: context.props.tableLayout?.cellEditMode,
    onCellSelectionChange: context.props.onCellSelectionChange,
    apiRef,
  }));
  latest.table = table;
  latest.onCellsChange = context.props.onCellsChange;
  latest.cellSelectionMode = context.props.tableLayout?.cellSelectionMode;
  latest.onCellEditRequest = context.props.onCellEditRequest;
  latest.onCellsCopy = context.props.onCellsCopy;
  latest.cellEditMode = context.props.tableLayout?.cellEditMode;
  latest.onCellSelectionChange = context.props.onCellSelectionChange;
  latest.apiRef = apiRef;

  useEffect(() => {
    const anchor = enabled ? anchorRef.current : null;
    const root = anchor
      ? (anchor.closest('[data-slot="data-grid"]') ?? anchor.parentElement)
      : null;
    const viewports = root
      ? Array.from(
          root.querySelectorAll<HTMLElement>(
            '[data-slot="data-grid-table-viewport"]'
          )
        )
      : [];
    const resolvedViewport =
      viewports.find((node) =>
        node.querySelector('[data-slot="data-grid-table-body"]')
      ) ??
      viewports[0] ??
      null;
    const viewport = resolvedViewport ?? document.createElement('div');
    const attached = resolvedViewport !== null;

    const getTable = () => latest.table;
    const getOnCellsChange = () => latest.onCellsChange ?? null;
    const isRangeSelectionEnabled = () => latest.cellSelectionMode !== 'single';

    // The focusable element of the container-focus model. The table carries
    // role="grid", so putting DOM focus (and aria-activedescendant) on it is
    // what lets a screen reader follow the focused cell.
    const focusTarget =
      viewport.querySelector<HTMLElement>(
        'table[data-slot="data-grid-table"]'
      ) ?? viewport;

    const scrollTdIntoView = (cell: Element | null) =>
      // Optional call: jsdom and some embedded contexts ship elements
      // without scrollIntoView.
      cell?.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'instant',
      });

    const syncActiveDescendant = () => {
      const cell = viewport.querySelector<HTMLElement>('td[data-cell-focused]');
      if (cell?.id) focusTarget.setAttribute('aria-activedescendant', cell.id);
      else focusTarget.removeAttribute('aria-activedescendant');
    };

    const scrollFocusedIntoView = (
      targetRowIndex?: number,
      rowCount?: number,
      explicitCell?: { rowId: string; columnId: string }
    ) => {
      const queryScrollCell = () =>
        explicitCell
          ? viewport.querySelector(
              `tr[data-row-id="${CSS.escape(explicitCell.rowId)}"] td[data-col-id="${CSS.escape(explicitCell.columnId)}"]`
            )
          : viewport.querySelector('td[data-cell-focused]');
      // After the atom write React still has to commit the data attributes;
      // rAF lands after that commit. Instant, because the app-level
      // scroll-smooth would otherwise animate every keystroke.
      requestAnimationFrame(() => {
        const cell = queryScrollCell();
        syncActiveDescendant();
        if (cell || targetRowIndex == null || !rowCount) {
          scrollTdIntoView(cell);
          return;
        }
        let scroller: HTMLElement | null = viewport;
        while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
          scroller = scroller.parentElement;
        }
        if (!scroller) return;
        scroller.scrollTop =
          ((targetRowIndex + 0.5) / rowCount) * scroller.scrollHeight -
          scroller.clientHeight / 2;
        requestAnimationFrame(() => {
          scrollTdIntoView(queryScrollCell());
          syncActiveDescendant();
        });
      });
    };

    const requestCellEdit = (initialText?: string): boolean => {
      const table = getTable();
      const cell = table.getFocusedCell();
      if (!cell) return false;
      const cellEdit = getDataGridWritableCellEdit<TData>(
        cell.column,
        cell.row.original
      );
      if (cellEdit?.control) {
        const baseline = cellEdit.format
          ? cellEdit.format(cell.getValue(), cell.row.original)
          : String(cell.getValue() ?? '');
        const headerTitle = cell.column.columnDef.meta?.headerTitle;
        const header = cell.column.columnDef.header;
        setEditorSession({
          rowId: cell.row.id,
          columnId: cell.column.id,
          control: cellEdit.control,
          initialValue: initialText ?? baseline,
          baseline,
          label:
            typeof headerTitle === 'string'
              ? headerTitle
              : typeof header === 'string'
                ? header
                : cell.column.id,
        });
        return true;
      }
      const onCellEditRequest = latest.onCellEditRequest;
      if (cellEdit && onCellEditRequest) {
        onCellEditRequest({
          rowId: cell.row.id,
          columnId: cell.column.id,
          row: cell.row.original,
          previousValue: cell.getValue(),
          initialText,
        });
        return true;
      }
      if (initialText !== undefined) return false;
      const focusedCell = viewport.querySelector('td[data-cell-focused]');
      const control = focusedCell
        ? [
            '[role="combobox"]',
            'select',
            'input, textarea',
            'button, a, [role="checkbox"], [tabindex]:not([tabindex="-1"])',
          ]
            .map((candidate) =>
              focusedCell.querySelector<HTMLElement>(candidate)
            )
            .find(Boolean)
        : null;
      if (!control) return false;
      control.focus();
      control.click();
      return true;
    };

    let focusRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let focusReclaimTimer: ReturnType<typeof setTimeout> | undefined;
    const focusCell: DataGridCellSelectionApi['focusCell'] = (
      rowId,
      columnId,
      options
    ) => {
      clearTimeout(focusRetryTimer);
      let attempts = 12;
      const attempt = () => {
        if (!viewport.isConnected) return;
        const cell = viewport.querySelector<HTMLElement>(
          `tr[data-row-id="${CSS.escape(rowId)}"] td[data-col-id="${CSS.escape(columnId)}"]`
        );
        if (!cell) {
          if (attempts-- > 0)
            focusRetryTimer = scheduleDataGridTimer(attempt, 32);
          return;
        }
        getTable().setFocusedCell(rowId, columnId);
        focusTarget.focus();
        if (cell.id) focusTarget.setAttribute('aria-activedescendant', cell.id);
        scrollTdIntoView(cell);
        if (!options?.edit) return;
        let editAttempts = 12;
        const attemptEdit = () => {
          if (!cell.isConnected) return;
          if (cell.hasAttribute('data-cell-focused')) requestCellEdit();
          else if (editAttempts-- > 0) {
            focusRetryTimer = scheduleDataGridTimer(attemptEdit, 32);
          }
        };
        attemptEdit();
      };
      attempt();
    };
    const clearSelection = () => {
      getTable().resetCellSelection(true);
      requestAnimationFrame(syncActiveDescendant);
    };
    const scrollToCell = (rowId: string, columnId: string) => {
      scrollTdIntoView(
        viewport.querySelector(
          `tr[data-row-id="${CSS.escape(rowId)}"] td[data-col-id="${CSS.escape(columnId)}"]`
        )
      );
    };
    if (latest.apiRef) {
      latest.apiRef.current = { focusCell, clearSelection, scrollToCell };
    }

    const jumpFocus = (
      rowTarget: 'first' | 'last' | 'same' | { delta: number },
      columnTarget: 'first' | 'last' | 'same',
      extend: boolean
    ): boolean => {
      const table = getTable();
      const focused = table.getFocusedCell();
      if (!focused) return false;
      const rows = table.getRowsInDisplayOrder();
      const allColumns = getDataGridDisplayOrderedColumns(table);
      const selectable = allColumns.filter(
        (column) => column.columnDef.enableCellSelection !== false
      );
      if (!rows.length || !selectable.length) return false;
      const rowIndex = focused.row.getDisplayIndex();
      const targetRowIndex =
        rowTarget === 'first'
          ? 0
          : rowTarget === 'last'
            ? rows.length - 1
            : rowTarget === 'same'
              ? rowIndex
              : Math.min(
                  rows.length - 1,
                  Math.max(0, rowIndex + rowTarget.delta)
                );
      let clampedRowIndex = targetRowIndex;
      if (table.getRowModel().rows.length !== rows.length) {
        const rendered = new Set<string | null>(
          table.getRowModel().rows.map((row: { id: string }) => row.id)
        );
        for (const rowEl of Array.from(
          viewport.querySelectorAll('tbody tr[data-row-id]')
        )) {
          rendered.add(rowEl.getAttribute('data-row-id'));
        }
        const step = clampedRowIndex >= rowIndex ? -1 : 1;
        while (
          clampedRowIndex !== rowIndex &&
          rows[clampedRowIndex] &&
          !rendered.has(rows[clampedRowIndex].id)
        ) {
          clampedRowIndex += step;
        }
      }
      const targetRow = rows[clampedRowIndex];
      const targetColumn =
        columnTarget === 'first'
          ? selectable[0]
          : columnTarget === 'last'
            ? selectable[selectable.length - 1]
            : focused.column;
      if (!targetRow || !targetColumn) return false;
      if (extend) {
        const bound = getDataGridActiveBound(table);
        const columnIndex = allColumns.findIndex(
          (column) => column.id === focused.column.id
        );
        let anchorRowId = focused.row.id;
        let anchorColumnId = focused.column.id;
        if (bound) {
          anchorRowId =
            rows[
              rowIndex === bound.minRowIndex
                ? bound.maxRowIndex
                : bound.minRowIndex
            ]?.id ?? anchorRowId;
          anchorColumnId =
            allColumns[
              columnIndex === bound.minColumnIndex
                ? bound.maxColumnIndex
                : bound.minColumnIndex
            ]?.id ?? anchorColumnId;
        }
        table.selectCellRange(
          {
            anchorRowId,
            anchorColumnId,
            focusRowId: targetRow.id,
            focusColumnId: targetColumn.id,
          },
          { mode: 'replace' }
        );
      } else {
        table.setFocusedCell(targetRow.id, targetColumn.id);
      }
      scrollFocusedIntoView(
        clampedRowIndex,
        rows.length,
        extend ? { rowId: targetRow.id, columnId: targetColumn.id } : undefined
      );
      return true;
    };

    const moveFocusVisual = (
      direction: 'up' | 'down' | 'left' | 'right'
    ): void => {
      const table = getTable();
      const focused = table.getFocusedCell();
      const target = focused
        ? getDataGridStepTarget(
            table,
            viewport,
            { rowId: focused.row.id, columnId: focused.column.id },
            direction
          )
        : null;
      if (target === 'edge') return;
      if (target) {
        table.setFocusedCell(target.rowId, target.columnId);
        return;
      }
      table.moveCellSelection(direction);
    };

    const getPageJumpSize = (): number => {
      const row = viewport.querySelector('tbody tr[data-row-id]');
      let scroller: HTMLElement | null = viewport;
      while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
        scroller = scroller.parentElement;
      }
      const rowHeight = row?.getBoundingClientRect().height || 0;
      const viewHeight = scroller?.clientHeight || viewport.clientHeight;
      if (!rowHeight || !viewHeight) return 10;
      return Math.max(1, Math.floor(viewHeight / rowHeight) - 1);
    };

    const getAppendedRows = (): HTMLElement[] => {
      const body = viewport.querySelector('tbody');
      const appended: HTMLElement[] = [];
      let rowEl = body?.lastElementChild;
      while (rowEl && !rowEl.hasAttribute('data-row-id')) {
        if (
          rowEl instanceof HTMLElement &&
          !rowEl.hasAttribute('aria-hidden')
        ) {
          appended.unshift(rowEl);
        }
        rowEl = rowEl.previousElementSibling;
      }
      return appended;
    };

    const focusFirstIn = (row: HTMLElement | undefined): boolean => {
      const focusable = row?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable) return false;
      focusable.focus();
      return row!.ownerDocument.activeElement === focusable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const appendedRow =
        event.target instanceof Element
          ? event.target.closest('tbody > tr:not([data-row-id])')
          : null;
      if (
        appendedRow instanceof HTMLElement &&
        viewport.contains(appendedRow)
      ) {
        const appended = getAppendedRows();
        const index = appended.indexOf(appendedRow);
        if (index === -1) return;
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        if (event.key === 'ArrowDown') {
          if (focusFirstIn(appended[index + 1])) event.preventDefault();
          return;
        }
        if (index > 0 && focusFirstIn(appended[index - 1])) {
          event.preventDefault();
          return;
        }
        focusTarget.focus();
        syncActiveDescendant();
        event.preventDefault();
        return;
      }

      if (isDataGridInteractiveKeyTarget(event.target)) {
        // The ARIA grid pattern's exit gesture: Escape on an in-cell
        // control hands DOM focus back to the grid so navigation resumes.
        // A control that consumed the key first (closing its own popup)
        // never lets it reach here unprevented, and portal-rendered
        // popups keep their Escape entirely outside the viewport.
        if (event.key === 'Escape') {
          const cell = (event.target as Element).closest?.('td[data-col-id]');
          if (cell && viewport.contains(cell)) {
            event.preventDefault();
            event.stopPropagation();
            focusTarget.focus();
            syncActiveDescendant();
          }
        }
        return;
      }
      const table = getTable();
      const rtl = getComputedStyle(viewport).direction === 'rtl';
      const horizontal = (direction: 'left' | 'right') =>
        rtl ? (direction === 'left' ? 'right' : 'left') : direction;

      // Ahead of the switch so plain letters still reach the type-to-edit
      // fall-through below. Matched by code as well as key, so non-Latin
      // layouts (where the key is the layout's own character) still work.
      if (
        (event.key === 'a' || event.key === 'A' || event.code === 'KeyA') &&
        (event.metaKey || event.ctrlKey) &&
        // AltGr arrives as Ctrl+Alt; that chord types a character on
        // central-European layouts and is not a select-all.
        !event.altKey
      ) {
        if (isRangeSelectionEnabled()) {
          table.selectAllCells();
          requestAnimationFrame(syncActiveDescendant);
        }
        event.preventDefault();
        return;
      }

      // Explicit copy and cut chords; see writeSelectionToClipboard for
      // why the native copy event cannot carry these. Paste stays on the
      // native event, which browsers do fire at the focused element.
      if ((event.metaKey || event.ctrlKey) && !event.altKey && clipboard) {
        const isCopy =
          event.key === 'c' || event.key === 'C' || event.code === 'KeyC';
        const isCut =
          event.key === 'x' || event.key === 'X' || event.code === 'KeyX';
        if (isCopy || isCut) {
          event.preventDefault();
          void writeSelectionToClipboard().then((written) => {
            if (!written) return;
            latest.onCellsCopy?.({ ...written, cut: isCut });
            if (!isCut) return;
            const onCellsChange = getOnCellsChange();
            if (!onCellsChange) return;
            const details = buildDataGridClearDetails<TData>(
              getTable(),
              'cut',
              true,
              viewport
            );
            if (details) onCellsChange(details);
          });
          return;
        }
      }

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          const direction =
            event.key === 'ArrowUp'
              ? ('up' as const)
              : event.key === 'ArrowDown'
                ? ('down' as const)
                : horizontal(event.key === 'ArrowLeft' ? 'left' : 'right');
          if (event.metaKey || event.ctrlKey) {
            const jumped =
              direction === 'up'
                ? jumpFocus(
                    'first',
                    'same',
                    event.shiftKey && isRangeSelectionEnabled()
                  )
                : direction === 'down'
                  ? jumpFocus(
                      'last',
                      'same',
                      event.shiftKey && isRangeSelectionEnabled()
                    )
                  : jumpFocus(
                      'same',
                      direction === 'left' ? 'first' : 'last',
                      event.shiftKey && isRangeSelectionEnabled()
                    );
            if (jumped) event.preventDefault();
            return;
          }
          if (direction === 'down' && !event.shiftKey) {
            const focused = table.getFocusedCell();
            const renderedRows = viewport.querySelectorAll(
              'tbody tr[data-row-id]'
            );
            const lastRenderedId =
              renderedRows[renderedRows.length - 1]?.getAttribute(
                'data-row-id'
              );
            if (
              focused &&
              lastRenderedId &&
              focused.row.id === lastRenderedId &&
              focusFirstIn(getAppendedRows()[0])
            ) {
              event.preventDefault();
              return;
            }
          }
          if (event.shiftKey && isRangeSelectionEnabled()) {
            const corner = extendDataGridSelection(table, viewport, direction);
            event.preventDefault();
            scrollFocusedIntoView(undefined, undefined, corner ?? undefined);
            return;
          }
          const focused = table.getFocusedCell();
          const target = focused
            ? getDataGridStepTarget(
                table,
                viewport,
                { rowId: focused.row.id, columnId: focused.column.id },
                direction
              )
            : null;
          if (target === 'edge') {
            event.preventDefault();
            return;
          }
          if (target) {
            table.setFocusedCell(target.rowId, target.columnId);
            event.preventDefault();
            scrollFocusedIntoView();
            return;
          }
          table.moveCellSelection(direction);
          event.preventDefault();
          scrollFocusedIntoView();
          return;
        }
        case 'Home':
        case 'End': {
          const edge =
            event.key === 'Home' ? ('first' as const) : ('last' as const);
          const jumped =
            event.metaKey || event.ctrlKey
              ? jumpFocus(
                  edge,
                  edge,
                  event.shiftKey && isRangeSelectionEnabled()
                )
              : jumpFocus(
                  'same',
                  edge,
                  event.shiftKey && isRangeSelectionEnabled()
                );
          if (jumped) event.preventDefault();
          return;
        }
        case 'PageUp':
        case 'PageDown': {
          const delta = (event.key === 'PageUp' ? -1 : 1) * getPageJumpSize();
          if (
            jumpFocus(
              { delta },
              'same',
              event.shiftKey && isRangeSelectionEnabled()
            )
          ) {
            event.preventDefault();
          }
          return;
        }
        case 'Enter': {
          if (!event.shiftKey && requestCellEdit()) {
            event.preventDefault();
            return;
          }
          moveFocusVisual(event.shiftKey ? 'up' : 'down');
          event.preventDefault();
          scrollFocusedIntoView();
          return;
        }
        case 'F2': {
          if (requestCellEdit()) event.preventDefault();
          return;
        }
        case 'Tab': {
          const before = table.getFocusedCell();
          moveFocusVisual(event.shiftKey ? 'left' : 'right');
          const after = table.getFocusedCell();
          if (after && after.id !== before?.id) {
            event.preventDefault();
            scrollFocusedIntoView();
          }
          return;
        }
        case 'Delete':
        case 'Backspace': {
          const onCellsChange = getOnCellsChange();
          if (!onCellsChange) return;
          const details = buildDataGridClearDetails<TData>(
            table,
            'clear',
            false,
            viewport
          );
          if (details) onCellsChange(details);
          event.preventDefault();
          return;
        }
        case 'Escape': {
          if (table.getCellSelectionBounds().length) {
            table.resetCellSelection(true);
            requestAnimationFrame(syncActiveDescendant);
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }
      }

      if (event.key === ' ') {
        const checkbox = viewport
          .querySelector('td[data-cell-focused]')
          ?.querySelector<HTMLElement>(
            '[role="checkbox"], input[type="checkbox"]'
          );
        if (checkbox) {
          checkbox.click();
          event.preventDefault();
          return;
        }
      }

      // Type-to-edit: a printable character on the focused cell opens the
      // editor seeded with it, replacing the value the way Notion and
      // Airtable do. Plain Ctrl/Cmd chords stay shortcuts, but Ctrl+Alt is
      // AltGr and bare Alt is the macOS Option layer - both type characters.
      if (
        event.key.length === 1 &&
        !event.metaKey &&
        !(event.ctrlKey && !event.altKey) &&
        requestCellEdit(event.key)
      ) {
        event.preventDefault();
        return;
      }

      if (event.key === ' ' && table.getFocusedCell()) {
        event.preventDefault();
      }
    };

    // Writes the active region to the system clipboard in both flavors.
    // Needed because a native copy event only fires for a text selection
    // or an editable target, and a focused grid is neither - Cmd/Ctrl+C
    // would silently do nothing on macOS, Windows and Linux alike. The
    // async API needs a secure context; the execCommand fallback covers
    // the rest with the TSV flavor alone.
    const writeSelectionToClipboard = async (): Promise<{
      text: string;
      grid: string[][];
    } | null> => {
      const grid = getDataGridActiveRegionGrid(getTable(), viewport);
      if (!grid) return null;
      const text = serializeDataGridClipboardText(grid);
      try {
        if (
          typeof ClipboardItem !== 'undefined' &&
          navigator.clipboard?.write
        ) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': new Blob([text], { type: 'text/plain' }),
              'text/html': new Blob([renderDataGridClipboardHtml(grid)], {
                type: 'text/html',
              }),
            }),
          ]);
          return { text, grid };
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return { text, grid };
        }
      } catch {}
      const doc = viewport.ownerDocument;
      const scratch = doc.createElement('textarea');
      scratch.value = text;
      scratch.style.position = 'fixed';
      scratch.style.opacity = '0';
      doc.body.appendChild(scratch);
      scratch.select();
      let copied = false;
      try {
        copied = doc.execCommand('copy');
      } catch {
        copied = false;
      }
      scratch.remove();
      focusTarget.focus();
      return copied ? { text, grid } : null;
    };

    const copySelection = (event: ClipboardEvent, cut: boolean): boolean => {
      const grid = getDataGridActiveRegionGrid(getTable(), viewport);
      if (!grid || !event.clipboardData) return false;
      event.preventDefault();
      const text = serializeDataGridClipboardText(grid);
      event.clipboardData.setData('text/plain', text);
      event.clipboardData.setData(
        'text/html',
        renderDataGridClipboardHtml(grid)
      );
      latest.onCellsCopy?.({ text, grid, cut });
      return true;
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (isDataGridEditableTarget(event.target)) return;
      copySelection(event, false);
    };

    const handleCut = (event: ClipboardEvent) => {
      if (isDataGridEditableTarget(event.target)) return;
      if (!copySelection(event, true)) return;
      const onCellsChange = getOnCellsChange();
      if (!onCellsChange) return;
      const details = buildDataGridClearDetails<TData>(
        getTable(),
        'cut',
        true,
        viewport
      );
      if (details) onCellsChange(details);
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isDataGridEditableTarget(event.target)) return;
      const onCellsChange = getOnCellsChange();
      if (!onCellsChange) return;
      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      event.preventDefault();
      const table = getTable();
      const result = buildDataGridPasteDetails<TData>(
        table,
        parseDataGridClipboardText(text),
        viewport
      );
      if (!result) return;
      onCellsChange(result.details);
      if (isRangeSelectionEnabled()) {
        selectDataGridRegion(table, result.target);
      }
    };

    // Custom-control cells follow the same two-step gesture as editor
    // cells: the first click on an UNFOCUSED cell only focuses it, the
    // second activates the control, so moving the focus around can never
    // fire actions. Radix triggers open on pointerdown and Base UI ones
    // on click, so the press is intercepted at both; checkboxes keep
    // their one-click toggle (the row-select idiom), data-cell-interactive
    // widgets own all their gestures, and single-click edit mode skips
    // the interception outright.
    let pressedUnfocusedControl = false;
    const getTwoStepControl = (target: EventTarget | null): Element | null => {
      if (!(target instanceof Element)) return null;
      if (target.closest('[data-cell-interactive]')) return null;
      if (target.closest('[role="checkbox"], input[type="checkbox"]')) {
        return null;
      }
      // Opt-in for widgets whose ACTIVE surface is bigger than any generic
      // selector can know - a combobox whose whole blank chips strip opens
      // it, a canvas editor. Marking the wrapper data-cell-control makes a
      // press anywhere on it two-step, exactly like a bare button.
      const marked = target.closest('[data-cell-control]');
      if (marked) return marked;
      return target.closest(
        'button, a, select, input, textarea, [contenteditable], [role="combobox"]'
      );
    };
    const handleControlPointerDown = (event: PointerEvent) => {
      pressedUnfocusedControl = false;
      if (event.button !== 0) return;
      if (event.shiftKey || event.ctrlKey || event.metaKey) return;
      if (latest.cellEditMode === 'click') return;
      const control = getTwoStepControl(event.target);
      const cell = control?.closest('td[data-col-id]');
      if (!control || !cell || !viewport.contains(cell)) return;
      if (cell.hasAttribute('data-cell-focused')) return;
      const column = getTable().getColumn(
        cell.getAttribute('data-col-id') ?? ''
      );
      if (!column || column.columnDef.enableCellSelection === false) return;
      pressedUnfocusedControl = true;
      // Stops a Radix trigger's pointerdown open before React's root
      // delegation sees it; the mouse events that focus the cell ride on.
      event.stopPropagation();
    };
    const handleControlClick = (event: MouseEvent) => {
      if (!pressedUnfocusedControl) return;
      pressedUnfocusedControl = false;
      // Swallows the activation click a Base UI trigger listens for.
      event.preventDefault();
      event.stopPropagation();
    };
    const handleControlMouseDown = (event: MouseEvent) => {
      if (!pressedUnfocusedControl) return;
      // A Base UI trigger opens on the React-delegated mousedown, and all
      // root-delegated handlers die together when the event stops here -
      // including the td's own focus logic, so the selection start runs
      // imperatively: same feature handler, same drag session.
      event.stopPropagation();
      event.preventDefault();
      const cell = (event.target as Element | null)?.closest?.(
        'td[data-col-id]'
      );
      const rowId = cell
        ?.closest('tr[data-row-id]')
        ?.getAttribute('data-row-id');
      const columnId = cell?.getAttribute('data-col-id');
      if (!rowId || !columnId) return;
      const tableNow = getTable();
      const cellApi = tableNow
        .getRowsInDisplayOrder()
        .find((row) => row.id === rowId)
        ?.getAllCellsByColumnId()[columnId];
      if (!cellApi) return;
      if (isRangeSelectionEnabled()) {
        cellApi.getSelectionStartHandler()(event);
      } else {
        tableNow.setFocusedCell(rowId, columnId);
      }
      focusTarget.focus();
      requestAnimationFrame(syncActiveDescendant);
    };

    let dragStartedOnCell = false;
    let dragStartSelectionKey = '';
    let squelchTimer: ReturnType<typeof setTimeout> | undefined;
    const getSelectionKey = () => {
      const table = getTable();
      const bounds = table.getCellSelectionBounds();
      const bound = bounds[bounds.length - 1];
      return `${table.getSelectedCellCount()}:${bounds.length}:${
        bound
          ? `${bound.minRowIndex},${bound.minColumnIndex},${bound.maxRowIndex},${bound.maxColumnIndex}`
          : ''
      }`;
    };
    const squelchClick = (clickEvent: MouseEvent) => {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
    };
    const handleDragMouseUp = () => {
      const wasDrag =
        dragStartedOnCell &&
        getTable().getSelectedCellCount() > 1 &&
        getSelectionKey() !== dragStartSelectionKey;
      dragStartedOnCell = false;
      viewport.removeAttribute('data-cell-selecting');
      if (!wasDrag) return;
      viewport.addEventListener('click', squelchClick, { capture: true });
      squelchTimer = scheduleDataGridTimer(() => {
        viewport.removeEventListener('click', squelchClick, true);
      }, 0);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      requestAnimationFrame(syncActiveDescendant);
      const target = event.target as Element | null;
      // A modifier press is a selection gesture all the way through, the
      // Sheets contract: extending must not hand the keyboard to whatever
      // control sits under the pointer, or the follow-up Shift+arrows land
      // in a date button or a combobox input instead of growing the range.
      // The extension itself runs through the cell's own React handlers, so
      // the event must NOT be defaultPrevented - the delegated handlers
      // treat that as consumed and the extension never happens. Only the
      // browser's focus default is unwanted; it runs after the listeners,
      // so the grid reclaims focus one task later.
      if (
        (event.shiftKey || event.metaKey || event.ctrlKey) &&
        isRangeSelectionEnabled() &&
        target?.closest?.('td[data-col-id]')
      ) {
        focusReclaimTimer = scheduleDataGridTimer(() => focusTarget.focus(), 0);
      }
      dragStartedOnCell = !!target?.closest?.('td');
      if (dragStartedOnCell) {
        dragStartSelectionKey = getSelectionKey();
        viewport.setAttribute('data-cell-selecting', '');
      }
      if (!target?.closest?.('[data-slot="data-grid-cell-fill-handle"]'))
        return;
      // Ahead of React's root delegation, so the td underneath never starts a
      // plain range drag from the handle.
      event.preventDefault();
      event.stopPropagation();
      startDataGridFillSession<TData>({
        table: getTable(),
        viewport,
        onCellsChange: getOnCellsChange(),
      });
    };

    const handleClickToEdit = (event: MouseEvent) => {
      if (latest.cellEditMode !== 'click') return;
      if (event.shiftKey || event.ctrlKey || event.metaKey) return;
      if (isDataGridInteractiveKeyTarget(event.target)) return;
      const cell = (event.target as HTMLElement | null)?.closest?.('td');
      if (!cell?.hasAttribute('data-cell-focused')) return;
      requestCellEdit();
    };

    const handleDoubleClick = (event: MouseEvent) => {
      if (isDataGridInteractiveKeyTarget(event.target)) return;
      const target = event.target as HTMLElement | null;
      const cell = target?.closest?.('td');
      if (!cell?.hasAttribute('data-cell-focused')) return;
      requestCellEdit();
    };

    const previousTabIndex = focusTarget.getAttribute('tabindex');
    const previousOutline = focusTarget.style.outline;
    if (attached && keyboard) {
      focusTarget.tabIndex = 0;
      focusTarget.style.outline = 'none';
      viewport.addEventListener('keydown', handleKeyDown);
    }
    if (attached && clipboard) {
      viewport.addEventListener('copy', handleCopy);
      viewport.addEventListener('cut', handleCut);
      viewport.addEventListener('paste', handlePaste);
    }
    if (attached) {
      viewport.addEventListener('pointerdown', handleControlPointerDown);
      viewport.addEventListener('mousedown', handleControlMouseDown);
      viewport.addEventListener('click', handleControlClick);
      viewport.addEventListener('mousedown', handleMouseDown);
      viewport.addEventListener('click', handleClickToEdit);
      viewport.addEventListener('dblclick', handleDoubleClick);
      viewport.ownerDocument.addEventListener('mouseup', handleDragMouseUp);
    }
    const toBound = (bound: {
      minRowIndex: number;
      maxRowIndex: number;
      minColumnIndex: number;
      maxColumnIndex: number;
    }) => ({
      minRowIndex: bound.minRowIndex,
      maxRowIndex: bound.maxRowIndex,
      minColumnIndex: bound.minColumnIndex,
      maxColumnIndex: bound.maxColumnIndex,
    });
    const cellSelectionAtom = latest.table.atoms.cellSelection;
    let selectionSubscription: { unsubscribe: () => void } = {
      unsubscribe() {},
    };
    if (attached && cellSelectionAtom) {
      selectionSubscription = cellSelectionAtom.subscribe(() => {
        const onCellSelectionChange = latest.onCellSelectionChange;
        if (!onCellSelectionChange) return;
        const tableNow = getTable();
        const focusedCell = tableNow.getFocusedCell();
        const activeBound = getDataGridActiveBound(tableNow);
        onCellSelectionChange({
          focused: focusedCell
            ? { rowId: focusedCell.row.id, columnId: focusedCell.column.id }
            : null,
          bounds: tableNow.getCellSelectionBounds().map(toBound),
          activeBound: activeBound ? toBound(activeBound) : null,
          visibleCellCount: getDataGridVisibleSelectedCellCount(
            tableNow,
            viewport
          ),
        });
      });
    }
    if (attached) setViewportEl(viewport);

    return () => {
      if (attached && keyboard) {
        if (previousTabIndex === null) focusTarget.removeAttribute('tabindex');
        else focusTarget.setAttribute('tabindex', previousTabIndex);
        focusTarget.style.outline = previousOutline;
        focusTarget.removeAttribute('aria-activedescendant');
      }
      viewport.removeEventListener('keydown', handleKeyDown);
      viewport.removeEventListener('copy', handleCopy);
      viewport.removeEventListener('cut', handleCut);
      viewport.removeEventListener('paste', handlePaste);
      viewport.removeEventListener('pointerdown', handleControlPointerDown);
      viewport.removeEventListener('mousedown', handleControlMouseDown);
      viewport.removeEventListener('click', handleControlClick);
      viewport.removeEventListener('mousedown', handleMouseDown);
      viewport.removeEventListener('click', handleClickToEdit);
      viewport.removeEventListener('dblclick', handleDoubleClick);
      viewport.removeEventListener('click', squelchClick, true);
      viewport.ownerDocument.removeEventListener('mouseup', handleDragMouseUp);
      viewport.removeAttribute('data-cell-selecting');
      selectionSubscription.unsubscribe();
      clearTimeout(focusRetryTimer);
      clearTimeout(focusReclaimTimer);
      clearTimeout(squelchTimer);
      if (latest.apiRef) latest.apiRef.current = null;
      setViewportEl(null);
      setEditorSession(null);
    };
  }, [enabled, keyboard, clipboard, table.store, latest]);

  useEffect(() => {
    if (!viewportEl || !editorSession) return;
    viewportEl.setAttribute('data-cell-editing', '');
    return () => viewportEl.removeAttribute('data-cell-editing');
  }, [viewportEl, editorSession]);

  const closeEditorSession = (
    advance: DataGridEditorAdvance,
    refocus = true
  ) => {
    setEditorSession(null);
    if (advance) {
      const tableNow = context.table;
      const focused = tableNow.getFocusedCell();
      const target =
        focused && viewportEl
          ? getDataGridStepTarget(
              tableNow,
              viewportEl,
              { rowId: focused.row.id, columnId: focused.column.id },
              advance
            )
          : null;
      if (target && target !== 'edge') {
        tableNow.setFocusedCell(target.rowId, target.columnId);
      } else if (!target) {
        tableNow.moveCellSelection(advance);
      }
    }
    if (!refocus) return;
    requestAnimationFrame(() => {
      const focusEl =
        viewportEl?.querySelector<HTMLElement>(
          'table[data-slot="data-grid-table"]'
        ) ?? viewportEl;
      focusEl?.focus();
      const cell = viewportEl?.querySelector<HTMLElement>(
        'td[data-cell-focused]'
      );
      if (cell?.id) focusEl?.setAttribute('aria-activedescendant', cell.id);
      cell?.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'instant',
      });
    });
  };

  const commitEditorSession = (
    raw: string,
    advance: DataGridEditorAdvance,
    refocus = true
  ) => {
    const session = editorSession;
    closeEditorSession(advance, refocus);
    const onCellsChange = context.props.onCellsChange;
    if (!session || !onCellsChange || raw === session.baseline) return;
    const tableNow = context.table;
    const row = tableNow
      .getRowsInDisplayOrder()
      .find((candidate) => candidate.id === session.rowId);
    const column = tableNow.getColumn(session.columnId);
    const cellEdit =
      column && row
        ? getDataGridWritableCellEdit<TData>(column, row.original)
        : null;
    if (!row || !column || !cellEdit) return;
    const previousValue = row.getAllCellsByColumnId()[column.id]?.getValue();
    let value: unknown = raw;
    if (cellEdit.parse) {
      const parsed = cellEdit.parse(raw, row.original);
      if (parsed === undefined) {
        onCellsChange({
          source: 'edit',
          changes: [],
          rejected: [
            {
              rowId: session.rowId,
              columnId: session.columnId,
              raw,
              reason: 'invalid',
            },
          ],
        });
        return;
      }
      value = parsed;
    }
    onCellsChange({
      source: 'edit',
      changes: [
        {
          rowId: session.rowId,
          columnId: session.columnId,
          row: row.original,
          previousValue,
          value,
        },
      ],
      rejected: [],
    });
  };

  return (
    <>
      <span ref={anchorRef} hidden data-slot="data-grid-cell-selection" />
      {enabled && viewportEl && editorSession ? (
        <DataGridCellEditorOverlay
          key={`${editorSession.rowId}:${editorSession.columnId}`}
          viewport={viewportEl}
          session={editorSession}
          enterAdvance={
            context.props.tableLayout?.cellEditEnterAdvance === true
          }
          onCommit={commitEditorSession}
          onCancel={() => closeEditorSession(null)}
        />
      ) : null}
    </>
  );
}

function DataGridCellSelection<TData extends object>(props: {
  apiRef?: RefObject<DataGridCellSelectionApi | null>;
  clipboard?: boolean;
  keyboard?: boolean;
}) {
  return useDataGridCellSelectionController<TData>(props);
}

function measureDataGridCellEditorStyle(
  viewport: HTMLElement
): CSSProperties | null {
  const cell = viewport.querySelector<HTMLElement>('td[data-cell-focused]');
  if (!cell) return null;
  const cellRect = cell.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const cellStyle = getComputedStyle(cell);
  const lineHeight =
    Number.parseFloat(cellStyle.lineHeight) ||
    Number.parseFloat(cellStyle.fontSize) * 1.5 ||
    20;
  const centeredBlockPadding = Math.max(
    Number.parseFloat(cellStyle.paddingTop) || 0,
    (cellRect.height - lineHeight) / 2
  );
  return {
    // Rect deltas are visual; when the viewport itself is the scroll
    // container (the standalone virtual layout), absolute children live in
    // content coordinates, so the scroll offset must be added back. The box
    // matches the cell exactly - editing must not change the cell's
    // geometry - and the cell's own overlay chrome hides for the session
    // (data-cell-editing), so the editor's outline is the ONE border.
    left: cellRect.left - viewportRect.left + viewport.scrollLeft,
    top: cellRect.top - viewportRect.top + viewport.scrollTop,
    width: cellRect.width,
    minHeight: cellRect.height,
    // The font shorthand can serialize empty (Firefox); the longhands after
    // it win where set and cover that case.
    font: cellStyle.font || undefined,
    fontFamily: cellStyle.fontFamily,
    fontSize: cellStyle.fontSize,
    fontWeight: cellStyle.fontWeight,
    fontStyle: cellStyle.fontStyle,
    lineHeight: cellStyle.lineHeight,
    letterSpacing: cellStyle.letterSpacing,
    textAlign: cellStyle.textAlign as CSSProperties['textAlign'],
    paddingLeft: cellStyle.paddingLeft,
    paddingRight: cellStyle.paddingRight,
    paddingTop: centeredBlockPadding,
    paddingBottom: centeredBlockPadding,
  };
}

function DataGridCellEditorOverlay({
  viewport,
  session,
  enterAdvance,
  onCommit,
  onCancel,
}: {
  viewport: HTMLElement;
  session: DataGridEditorSession;
  enterAdvance: boolean;
  onCommit: (
    raw: string,
    advance: DataGridEditorAdvance,
    refocus?: boolean
  ) => void;
  onCancel: () => void;
}) {
  const [style] = useState<CSSProperties | null>(() =>
    measureDataGridCellEditorStyle(viewport)
  );
  const finishedRef = useRef(false);

  // The caret belongs at the END of the value (the Excel F2 convention);
  // a textarea would otherwise open with it at position 0. Set on mount,
  // before autoFocus lands, so the stored selection is already right.
  const placeCaretAtEnd = (
    element: HTMLInputElement | HTMLTextAreaElement | null
  ) => {
    if (!element) return;
    const end = element.value.length;
    element.setSelectionRange?.(end, end);
  };

  useEffect(() => {
    if (!style) onCancel();
  }, [style, onCancel]);

  useEffect(() => {
    const body = viewport.querySelector('tbody');
    if (!body) return;
    const observer = new MutationObserver(() => {
      if (!finishedRef.current) onCancel();
    });
    observer.observe(body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [viewport, onCancel]);

  if (!style) return null;

  const finish = (
    element: HTMLInputElement | HTMLTextAreaElement,
    commit: boolean,
    advance: DataGridEditorAdvance = null,
    refocus = true
  ) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (commit) onCommit(element.value, advance, refocus);
    else onCancel();
  };

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const element = event.currentTarget;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish(element, false);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      finish(element, true, event.shiftKey ? 'left' : 'right');
      return;
    }
    if (event.key !== 'Enter') return;
    if (session.control === 'textarea' && (event.shiftKey || event.altKey)) {
      return;
    }
    event.preventDefault();
    finish(
      element,
      true,
      enterAdvance ? (event.shiftKey ? 'up' : 'down') : null
    );
  };

  const sharedClassName =
    'text-foreground bg-background outline-primary absolute z-[35] box-border resize-none outline-1 outline-solid -outline-offset-1';

  return createPortal(
    session.control === 'textarea' ? (
      <textarea
        data-slot="data-grid-cell-editor"
        ref={placeCaretAtEnd}
        autoFocus
        aria-label={session.label}
        defaultValue={session.initialValue}
        rows={1}
        style={style}
        className={cn(sharedClassName, 'field-sizing-content overflow-hidden')}
        onKeyDown={handleKeyDown}
        onBlur={(event) => finish(event.currentTarget, true, null, false)}
      />
    ) : (
      <input
        data-slot="data-grid-cell-editor"
        ref={placeCaretAtEnd}
        autoFocus
        aria-label={session.label}
        defaultValue={session.initialValue}
        style={style}
        className={sharedClassName}
        onKeyDown={handleKeyDown}
        onBlur={(event) => finish(event.currentTarget, true, null, false)}
      />
    ),
    viewport
  );
}

/**
 * Thin shell over row selection for bulk actions: selected count, a slot for
 * the consumer's controls, and a clear action. Hidden while nothing is
 * selected. What the controls do stays consumer-owned.
 *
 * Presented as a floating toolbar, the Google Sheets way: auto width,
 * centered, elevated, and sticky to the viewport bottom with breathing room,
 * so bulk actions stay reachable while the grid scrolls.
 */
function DataGridSelectionBar({
  children,
  className,
  label,
  clearLabel = 'Clear',
  onClear,
}: {
  children?: ReactNode;
  className?: string;
  label?: (count: number) => ReactNode;
  clearLabel?: ReactNode;
  onClear?: () => void;
}) {
  const context = useDataGrid();
  const rowSelectionAtom = context.table.atoms.rowSelection;
  if (rowSelectionAtom == null) return null;

  return (
    <Subscribe source={rowSelectionAtom}>
      {() => {
        // Read through the context getter: this closure re-runs on atom
        // writes without re-rendering the component, and a captured v9
        // wrapper would keep reporting the state it was built with.
        const table = context.table;
        const count = table.getSelectedRowModel().rows.length;
        if (count === 0) return null;
        return (
          <div
            data-slot="data-grid-selection-bar"
            className={cn(
              'sticky inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 rounded-lg border bg-background px-4 py-2.5 shadow-lg',
              className
            )}
          >
            <span className="text-sm font-medium text-foreground">
              {label ? label(count) : `${count} selected`}
            </span>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
              {children}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  context.table.resetRowSelection();
                  onClear?.();
                }}
              >
                {clearLabel}
              </Button>
            </div>
          </div>
        );
      }}
    </Subscribe>
  );
}

export { DataGridCellSelection, DataGridSelectionBar };
export type {
  DataGridCellSelectionApi,
  DataGridFocusCellOptions,
  DataGridPasteTarget,
};
