import type { DataGridScrollAreaOrientation } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';

/**
 * Paginated grids scroll horizontally inside the grid and vertically via the
 * page/main layout. Default `both` orientation traps wheel events over the
 * table when the current page fits the viewport.
 */
export const PAGINATED_DATA_GRID_SCROLL_ORIENTATION: DataGridScrollAreaOrientation =
  'horizontal';

/**
 * ReUI DataGridPagination stacks to flex-col on mobile. Page-level and card
 * footers keep a single-row layout at all breakpoints.
 */
export const DATA_GRID_PAGINATION_ROW_CLASSNAME =
  'flex-row [&_[role=combobox]]:w-16 [&>div:first-child]:order-1 [&>div:first-child]:pb-0 [&>div:last-child]:order-2 [&>div:last-child]:flex-row [&>div:last-child]:pt-0';
