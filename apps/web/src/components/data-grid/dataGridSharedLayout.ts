import type { DataGridScrollAreaOrientation } from '@ploutizo/ui/components/reui/data-grid/data-grid-scroll-area';

/**
 * Viewport-capped grids scroll inside the grid body. Use when the page opts into
 * `mainContentLayout: 'viewport'`. Height is content-sized up to the available slot.
 */
export const VIEWPORT_FILLED_DATA_GRID_SCROLL_ORIENTATION: DataGridScrollAreaOrientation =
  'both';

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

/** Grid + pagination shell: shrink to content, cap at the viewport flex slot. */
export const VIEWPORT_FILLED_DATA_GRID_SHELL_CLASSNAME =
  'flex min-h-0 min-w-0 max-h-full w-full flex-col gap-2.5';

export const VIEWPORT_FILLED_DATA_GRID_CONTAINER_CLASSNAME =
  'flex min-h-0 min-w-0 max-h-full flex-col overflow-hidden [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col';

export const VIEWPORT_FILLED_DATA_GRID_SCROLL_AREA_CLASSNAME =
  'h-full min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]]:h-full [&_[data-slot=scroll-area-viewport]]:max-h-full [&_[data-slot=scroll-area-viewport]]:overscroll-contain';

/** Pagination footer for viewport-capped grids — keep natural height, don't grow. */
export const VIEWPORT_FILLED_DATA_GRID_PAGINATION_CLASSNAME = `${DATA_GRID_PAGINATION_ROW_CLASSNAME} shrink-0 grow-0`;
