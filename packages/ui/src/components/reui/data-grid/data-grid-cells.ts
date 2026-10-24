import { cn } from 'cn';
import { type Cell, type Column, type RowData } from '@tanstack/react-table';
import {
  type DataGridFeatures,
  type DataGridTableInstance,
} from '@/components/reui/data-grid/data-grid';

/** Label for headers / column visibility: `meta.headerTitle`, string `columnDef.header`, or `column.id`. */
export const getColumnHeaderLabel = <TData extends RowData, TValue>(
  column: Column<DataGridFeatures, TData, TValue>
): string => {
  const meta = column.columnDef.meta as { headerTitle?: string } | undefined;
  if (typeof meta?.headerTitle === 'string') return meta.headerTitle;
  const defHeader = column.columnDef.header;
  if (typeof defHeader === 'string') return defHeader;
  return String(column.id);
};

/**
 * meta.headerColSpan: the sibling leaves each owning leaf's header covers,
 * by owner id. Each must render right after the last in its pin family, or
 * the span ends there; the header rows, the resize indicator and the move
 * and drop targets all read spans from here.
 */
export const getDataGridHeaderSpans = <TData extends object>(
  table: DataGridTableInstance<TData>
) => {
  const spans = new Map<string, Column<DataGridFeatures, TData, unknown>[]>();
  const families = [
    table.getStartVisibleLeafColumns(),
    table.getCenterVisibleLeafColumns(),
    table.getEndVisibleLeafColumns(),
  ] as Column<DataGridFeatures, TData, unknown>[][];

  for (const family of families) {
    for (let index = 0; index < family.length; index++) {
      const owner = family[index];
      const span = Math.floor(owner.columnDef.meta?.headerColSpan ?? 1);
      if (span < 2) continue;

      const siblings = owner.parent?.columns ?? table.getAllColumns();
      const at = siblings.findIndex((sibling) => sibling.id === owner.id);
      const intended =
        at < 0
          ? []
          : siblings
              .slice(at + 1, at + span)
              .filter((sibling) => sibling.getIsVisible());
      const covered: Column<DataGridFeatures, TData, unknown>[] = [];
      for (const sibling of intended) {
        const next = family.at(index + 1 + covered.length);
        if (next?.id !== sibling.id) break;
        covered.push(next);
      }
      if (!covered.length) continue;

      spans.set(owner.id, covered);
      index += covered.length;
    }
  }

  return spans;
};

/**
 * The td contract for spreadsheet selection. Call inside a
 * `Subscribe source={table.atoms.cellSelection}` render only: the reads are
 * builder calls whose state dependency React Compiler cannot see, exactly the
 * trap the row-selection checkbox documents.
 */
export const getDataGridCellSelectionCellAttrs = <TData extends object>(
  cell: Cell<DataGridFeatures, TData, unknown>
): {
  'aria-selected': boolean;
  'data-col-id': string;
  'data-cell-selected': true | undefined;
  'data-cell-focused': true | undefined;
  'data-cell-edge-top': true | undefined;
  'data-cell-edge-right': true | undefined;
  'data-cell-edge-bottom': true | undefined;
  'data-cell-edge-left': true | undefined;
} => {
  const selected = cell.getIsSelected();
  const edges = cell.getSelectionEdges();
  return {
    'aria-selected': selected,
    'data-col-id': cell.column.id,
    'data-cell-selected': selected || undefined,
    'data-cell-focused': cell.getIsFocused() || undefined,
    'data-cell-edge-top': edges.top || undefined,
    'data-cell-edge-right': edges.right || undefined,
    'data-cell-edge-bottom': edges.bottom || undefined,
    'data-cell-edge-left': edges.left || undefined,
  };
};

/**
 * Selection chrome for a body td, activated by the data attributes above plus
 * the imperatively toggled `data-cell-fill-target` (fill-drag preview, written
 * outside React like the resize indicator). A ::before overlay, not outline
 * or box-shadow: an outline ring hugs the cell box and cannot line up with
 * the gridlines the perimeter paints on, and the pinned-column dividers
 * already own the cell's shadow slot (tailwind-merge would collapse a second
 * shadow-[...] into it).
 */
export const dataGridCellSelectionCellClasses = cn(
  'relative select-none',
  // A light tint: the selection must read as a range without drowning the
  // gridlines under a heavy fill. The focused cell stays unfilled. Pinned
  // cells must stay OPAQUE (they hide scrolled content), so they get the
  // tint pre-mixed over the background, and the focused pinned cell keeps
  // a solid background instead of turning transparent.
  'data-[cell-selected]:bg-primary/4',
  'data-[cell-selected]:data-pinned:bg-[color-mix(in_oklab,var(--primary)_4%,var(--data-grid-surface,var(--data-grid-card-surface,var(--background))))]',
  'data-[cell-focused]:bg-transparent!',
  'data-[cell-focused]:data-pinned:bg-[color:var(--data-grid-surface,var(--data-grid-card-surface,var(--background)))]!',
  // Every selection line is one layout-free ::before overlay per cell. It
  // reaches 1px BEYOND the cell so each line paints exactly ON the shared
  // gridline it replaces: the range perimeter and the interior dividers
  // share this geometry, so where they meet they coincide instead of
  // stacking into a wider edge, every side stays exactly 1px, and
  // selecting never adds real borders that shift layout. At the table's
  // own boundary there is no shared gridline and the overshoot leaves the
  // scrollable content box, where it is CLIPPED - the perimeter simply
  // vanished on the first column, last column and last row. So every
  // overshoot that can hit a boundary goes through a variable the
  // boundary cells zero out. Longhand inset utilities only, logical
  // start/end
  // so RTL mirrors for free; a separate override rule cannot do this,
  // equal-specificity variants leave shorthand-vs-longhand to sort order.
  "data-[cell-selected]:before:pointer-events-none data-[cell-selected]:before:absolute data-[cell-selected]:before:start-[var(--data-grid-overlay-start,-1px)] data-[cell-selected]:before:end-[var(--data-grid-overlay-end,-1px)] data-[cell-selected]:before:top-[var(--data-grid-overlay-top,-1px)] data-[cell-selected]:before:bottom-[var(--data-grid-overlay-bottom,-1px)] data-[cell-selected]:before:border-primary data-[cell-selected]:before:content-['']",
  "data-[cell-focused]:before:pointer-events-none data-[cell-focused]:before:absolute data-[cell-focused]:before:start-[var(--data-grid-overlay-start,-1px)] data-[cell-focused]:before:end-[var(--data-grid-overlay-end,-1px)] data-[cell-focused]:before:top-[var(--data-grid-overlay-top,-1px)] data-[cell-focused]:before:bottom-[var(--data-grid-overlay-bottom,-1px)] data-[cell-focused]:before:border-primary data-[cell-focused]:before:content-['']",
  'data-[cell-selected]:before:border-e data-[cell-selected]:before:border-b',
  'data-[cell-selected]:not-data-[cell-edge-right]:before:border-e-border',
  'data-[cell-selected]:not-data-[cell-edge-bottom]:before:border-b-border',
  // The Sheets model: a single selected cell IS its own range, so the four
  // edge attributes below already draw its full primary box; inside a
  // larger range the anchor reads by its unfilled background alone. The
  // explicit ring only covers a focused cell with no selection at all.
  // Edge sides are logical (border-e/border-s): the feature derives edges
  // from display-order column indexes, which mirror in RTL.
  'data-[cell-focused]:not-data-[cell-selected]:before:border',
  'data-[cell-edge-bottom]:before:border-b data-[cell-edge-left]:before:border-s data-[cell-edge-right]:before:border-e data-[cell-edge-top]:before:border-t',
  'in-data-[cell-filling]:data-[cell-selected]:before:hidden',
  'in-data-[cell-filling]:data-[cell-focused]:before:hidden',
  'in-data-[cell-editing]:data-[cell-focused]:before:hidden',
  // Clamped to the cell edge at the grid's own boundary, the overlay's
  // lines sit flush against the container border instead of being clipped
  // away outside the scrollable content. A custom property has no cascade
  // fight to lose. First/last-child cover the boundary columns: when a
  // filler td follows the last data column, that cell's overshoot lands
  // INSIDE the table and needs no clamp, and the td:first/last-child of a
  // row are its logical start/end in RTL too.
  'in-[tr:last-child]:[--data-grid-overlay-bottom:0px]',
  // The top overshoot lands under a sticky header, which is positioned and
  // paints over it - so the first row's perimeter lost its top line. Clamp
  // inside the cell there, exactly like the other three boundaries.
  'in-[tr:first-child]:[--data-grid-overlay-top:0px]',
  'first:[--data-grid-overlay-start:0px]',
  'last:[--data-grid-overlay-end:0px]',
  // A pinned column is a boundary like the grid's own edges: the sticky
  // neighbor would cover an on-gridline overlay line, and re-painting it
  // from the pinned side doubles into a 2px blur whenever subpixel
  // positions disagree (browser zoom, fractional fill widths). One
  // painter instead: the overlay clamps inside its own cell there, the
  // same custom-property clamp the first and last cells use.
  '[&:has(+td[data-pinned])]:[--data-grid-overlay-end:0px]',
  '[&:has(+[data-slot=data-grid-table-fill-body-cell]:last-child)]:[--data-grid-overlay-end:0px]',
  '[&:has(+[data-slot=data-grid-table-fill-body-cell]+td[data-pinned])]:[--data-grid-overlay-end:0px]',
  '[td[data-pinned]+&]:[--data-grid-overlay-start:0px]',
  'data-[cell-fill-target]:bg-primary/4',
  'data-[cell-fill-target]:data-pinned:bg-[color-mix(in_oklab,var(--primary)_4%,var(--data-grid-surface,var(--data-grid-card-surface,var(--background))))]'
);

/**
 * Row and column ids are consumer strings; DOM ids cannot carry spaces or
 * quotes. One shared sanitizer so `aria-activedescendant` writers and the id
 * renderers always agree on the same encoding.
 */
export const toDataGridDomId = (value: string): string =>
  value.replace(/[^\w-]/g, '_');
