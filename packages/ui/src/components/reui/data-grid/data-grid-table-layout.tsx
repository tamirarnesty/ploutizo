import { flexRender } from '@tanstack/react-table';
import type { CSSProperties } from 'react';
import type { Column, Header, Row } from '@tanstack/react-table';
import type {
  DataGridFeatures,
  DataGridTableInstance,
} from '@/components/reui/data-grid/data-grid';
import { getDataGridHeaderSpans } from '@/components/reui/data-grid/data-grid-cells';

export type DataGridTablePinnedBoundary = 'top' | 'bottom';

export function getPinningStyles<TData extends object>(
  column: Column<DataGridFeatures, TData, unknown>
): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    // Logical offsets: TanStack's "left"/"right" buckets are start/end
    // semantics, so pinned columns stick to the correct edge in RTL too
    // (identical to left/right in LTR).
    insetInlineStart:
      isPinned === 'start' ? `${column.getStart('start')}px` : undefined,
    insetInlineEnd:
      isPinned === 'end' ? `${column.getAfter('end')}px` : undefined,
    position: isPinned ? 'sticky' : undefined,
    transform: isPinned ? 'translateZ(0)' : undefined,
    contain: isPinned ? 'paint' : undefined,
    width: column.getSize(),
    zIndex: isPinned ? 30 : undefined,
    backgroundClip: isPinned ? 'padding-box' : undefined,
  };
}

export function getDataGridTreeIndentStyle<TData extends object>(
  row: Row<DataGridFeatures, TData>,
  indent: number = 20
): CSSProperties {
  return {
    '--data-grid-tree-padding': `${row.depth * indent}px`,
  } as CSSProperties;
}

/**
 * Nearest scroll-area viewport that belongs to THIS grid. A viewport outside
 * the grid's own container (e.g. a page-level ScrollArea) would make the
 * width measurement - and the virtualizer - bind the wrong box.
 */
export function getDataGridScrollAreaViewport(
  node: HTMLElement
): HTMLElement | null {
  const scrollViewport = node.closest('[data-slot="scroll-area-viewport"]');

  if (!(scrollViewport instanceof HTMLElement)) return null;

  const gridContainer = node.closest('[data-slot="data-grid"]');
  if (gridContainer && !gridContainer.contains(scrollViewport)) return null;

  return scrollViewport;
}

export function getDataGridTableRowSections<TData extends object>(
  table: DataGridTableInstance<TData>,
  rowsPinnable?: boolean
) {
  if (!rowsPinnable) {
    return {
      topRows: [] as Row<DataGridFeatures, TData>[],
      centerRows: table.getRowModel().rows,
      bottomRows: [] as Row<DataGridFeatures, TData>[],
    };
  }

  return {
    topRows: table.getTopRows(),
    centerRows: table.getCenterRows(),
    bottomRows: table.getBottomRows(),
  };
}

export function getDataGridTableResolvedRows<TData extends object>(
  table: DataGridTableInstance<TData>,
  rowsPinnable?: boolean
) {
  const { topRows, centerRows, bottomRows } = getDataGridTableRowSections(
    table,
    rowsPinnable
  );
  const resolvedRows: Array<{
    row: Row<DataGridFeatures, TData>;
    pinnedBoundary?: DataGridTablePinnedBoundary;
  }> = [];

  topRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === topRows.length - 1 &&
        (centerRows.length > 0 || bottomRows.length > 0)
          ? 'top'
          : undefined,
    });
  });

  centerRows.forEach((row) => {
    resolvedRows.push({ row });
  });

  bottomRows.forEach((row, index) => {
    resolvedRows.push({
      row,
      pinnedBoundary:
        index === 0 && (centerRows.length > 0 || topRows.length > 0)
          ? 'bottom'
          : undefined,
    });
  });

  return resolvedRows;
}

export function getDataGridTableMergedHeaderGroups<TData extends object>(
  table: DataGridTableInstance<TData>
) {
  const leftHeaderGroups = table.getStartHeaderGroups();
  const centerHeaderGroups = table.getCenterHeaderGroups();
  const rightHeaderGroups = table.getEndHeaderGroups();
  const headerGroupCount = Math.max(
    leftHeaderGroups.length,
    centerHeaderGroups.length,
    rightHeaderGroups.length
  );
  const spans = getDataGridHeaderSpans(table);
  const coveredHeaders = new Map<
    string,
    Header<DataGridFeatures, TData, unknown>[]
  >();

  // TanStack gives a merged run rowSpan N on its top cell and 0 on the cells
  // it covers, so the covered ones are not rendered at all.
  const getRenderedHeaders = (
    headers: Header<DataGridFeatures, TData>[] = []
  ) => {
    const rendered = headers.filter((header) => header.rowSpan !== 0) as Header<
      DataGridFeatures,
      TData,
      unknown
    >[];
    if (!spans.size) return rendered;

    const cells: Header<DataGridFeatures, TData, unknown>[] = [];
    for (let index = 0; index < rendered.length; index++) {
      const header = rendered[index];
      cells.push(header);
      const coveredColumns = header.column.columns.length
        ? undefined
        : spans.get(header.column.id);
      if (!coveredColumns) continue;

      const covered: Header<DataGridFeatures, TData, unknown>[] = [];
      for (const coveredColumn of coveredColumns) {
        const next = rendered[index + 1 + covered.length];
        if (
          next?.column.id !== coveredColumn.id ||
          next.rowSpan !== header.rowSpan
        ) {
          break;
        }
        covered.push(next);
      }
      if (!covered.length) continue;

      coveredHeaders.set(header.id, covered);
      index += covered.length;
    }

    return cells;
  };

  return Array.from({ length: headerGroupCount }, (_, index) => {
    const leftGroup = leftHeaderGroups[index];
    const centerGroup = centerHeaderGroups[index];
    const rightGroup = rightHeaderGroups[index];

    return {
      id:
        [leftGroup?.id, centerGroup?.id, rightGroup?.id]
          .filter(Boolean)
          .join(':') || `header-group-${index}`,
      headers: [
        ...(leftGroup?.headers ?? []),
        ...(centerGroup?.headers ?? []),
        ...(rightGroup?.headers ?? []),
      ] as Header<DataGridFeatures, TData, unknown>[],
      startHeaders: getRenderedHeaders(leftGroup?.headers),
      centerHeaders: getRenderedHeaders(centerGroup?.headers),
      endHeaders: getRenderedHeaders(rightGroup?.headers),
      coveredHeaders,
    };
  });
}

export function renderDataGridTableHeadCellContent<TData extends object>(
  header: Header<DataGridFeatures, TData, unknown>
) {
  return header.isPlaceholder && header.rowSpan <= 1
    ? null
    : flexRender(header.column.columnDef.header, header.getContext());
}

export function getDataGridHeadCellResizeHeader<TData extends object>(
  header: Header<DataGridFeatures, TData, unknown>,
  coveredHeaders?: Header<DataGridFeatures, TData, unknown>[]
) {
  return coveredHeaders?.length && header.column.getIsPinned() !== 'end'
    ? coveredHeaders[coveredHeaders.length - 1]
    : header;
}

export function getDataGridHeadCellSizeVar<TData extends object>(
  header: Header<DataGridFeatures, TData, unknown>,
  coveredHeaders: Header<DataGridFeatures, TData, unknown>[] = []
) {
  if (!coveredHeaders.length)
    return `calc(var(--header-${header.id}-size) * 1px)`;

  const sizes = [header, ...coveredHeaders].map(
    (spanned) => `var(--header-${spanned.id}-size)`
  );
  return `calc((${sizes.join(' + ')}) * 1px)`;
}

export function hasDataGridTableRightPinnedColumns<TData extends object>(
  table: DataGridTableInstance<TData>
) {
  return (table.state.columnPinning.end?.length ?? 0) > 0;
}
