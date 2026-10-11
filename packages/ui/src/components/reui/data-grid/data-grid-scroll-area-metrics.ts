export const MIN_THUMB_SIZE = 24;
export const FALLBACK_SCROLLBAR_SIZE = 12;
export const SCROLLBAR_HIDE_DELAY_MS = 500;
export const EDGE_PROXIMITY_PX = 20;

export const INITIAL_SCROLLBAR_METRICS = {
  hasVerticalOverflow: false,
  headerHeight: 0,
  horizontalScrollbarSize: 0,
  thumbHeight: 0,
  thumbTop: 0,
  trackHeight: 0,
} as const;

export type ScrollbarMetrics = {
  hasVerticalOverflow: boolean;
  headerHeight: number;
  horizontalScrollbarSize: number;
  thumbHeight: number;
  thumbTop: number;
  trackHeight: number;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const areScrollbarMetricsEqual = (
  next: ScrollbarMetrics,
  prev: ScrollbarMetrics
) =>
  next.hasVerticalOverflow === prev.hasVerticalOverflow &&
  next.headerHeight === prev.headerHeight &&
  next.horizontalScrollbarSize === prev.horizontalScrollbarSize &&
  next.thumbHeight === prev.thumbHeight &&
  next.thumbTop === prev.thumbTop &&
  next.trackHeight === prev.trackHeight;

export const applyScrollbarMetrics = (
  element: HTMLElement,
  metrics: ScrollbarMetrics
) => {
  element.style.setProperty(
    '--data-grid-scrollbar-header-height',
    `${metrics.headerHeight}px`
  );
  element.style.setProperty(
    '--data-grid-scrollbar-thumb-height',
    `${metrics.thumbHeight}px`
  );
  element.style.setProperty(
    '--data-grid-scrollbar-thumb-top',
    `${metrics.thumbTop}px`
  );
  element.style.setProperty(
    '--data-grid-scrollbar-track-height',
    `${metrics.trackHeight}px`
  );
};

export const getHorizontalScrollbarSize = (
  horizontalScrollbar: HTMLElement | null,
  hasHorizontalOverflow: boolean
) => {
  if (!hasHorizontalOverflow) return 0;

  const measured = horizontalScrollbar?.offsetHeight ?? 0;
  return measured > 0 ? measured : FALLBACK_SCROLLBAR_SIZE;
};
