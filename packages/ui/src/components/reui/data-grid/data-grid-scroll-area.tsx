import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import type { PointerEvent, ReactNode } from 'react';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';

import { cn } from '@/lib/utils';

const MIN_THUMB_SIZE = 24;
const FALLBACK_SCROLLBAR_SIZE = 12;
/** Matches Base UI scroll-area `SCROLL_TIMEOUT`. */
const SCROLLBAR_HIDE_DELAY_MS = 500;
/** Pointer must be within this inset of an edge to reveal that axis's bar. */
const EDGE_PROXIMITY_PX = 20;

const INITIAL_METRICS = {
  hasVerticalOverflow: false,
  headerHeight: 0,
  horizontalScrollbarSize: 0,
  thumbHeight: 0,
  thumbTop: 0,
  trackHeight: 0,
} as const;

type DataGridScrollAreaOrientation = 'horizontal' | 'vertical' | 'both';

type ScrollbarMetrics = {
  hasVerticalOverflow: boolean;
  headerHeight: number;
  horizontalScrollbarSize: number;
  thumbHeight: number;
  thumbTop: number;
  trackHeight: number;
};

type DataGridScrollAreaProps = Omit<
  ScrollAreaPrimitive.Root.Props,
  'children'
> & {
  children: ReactNode;
  orientation?: DataGridScrollAreaOrientation;
};

/** WCAG 2.2 1.4.11 non-text contrast: thumb vs track >= 3:1. */
const dataGridForcedColorsThumbClassName = cn(
  'forced-colors:border forced-colors:border-[CanvasText]',
  'forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
  'forced-colors:hover:bg-[Highlight] forced-colors:active:bg-[Highlight]'
);

const dataGridVerticalScrollbarTrackClassName = cn(
  'h-full w-2 border-s border-s-transparent bg-muted/25 dark:bg-muted/40'
);

const dataGridScrollbarThumbAppearanceClassName = cn(
  'rounded-full transition-colors duration-150',
  'bg-muted-foreground/50 dark:bg-muted-foreground/60',
  'hover:bg-muted-foreground/65 dark:hover:bg-muted-foreground/75',
  'active:bg-muted-foreground/75 dark:active:bg-muted-foreground/85',
  'group-data-[scrolling]/scrollbar:bg-muted-foreground/70 dark:group-data-[scrolling]/scrollbar:bg-muted-foreground/85',
  dataGridForcedColorsThumbClassName
);

const dataGridBaseUiScrollbarClassName = cn(
  'group/scrollbar flex touch-none p-px select-none',
  'opacity-0 transition-opacity duration-200',
  'data-[scrolling]:opacity-100',
  'data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:border-t data-[orientation=horizontal]:border-t-transparent',
  'data-[orientation=horizontal]:bg-muted/25 dark:data-[orientation=horizontal]:bg-muted/40',
  'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2 data-[orientation=vertical]:flex-col',
  'data-[orientation=vertical]:border-s data-[orientation=vertical]:border-s-transparent',
  'data-[orientation=vertical]:bg-muted/25 dark:data-[orientation=vertical]:bg-muted/40'
);

const dataGridBaseUiScrollbarThumbClassName = cn(
  'relative flex-1',
  dataGridScrollbarThumbAppearanceClassName
);

const dataGridCustomVerticalScrollbarTrackClassName = cn(
  'group/scrollbar relative flex touch-none flex-col p-px select-none',
  dataGridVerticalScrollbarTrackClassName
);

const dataGridCustomVerticalScrollbarThumbClassName = cn(
  'absolute inset-x-px',
  dataGridScrollbarThumbAppearanceClassName
);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function areMetricsEqual(next: ScrollbarMetrics, prev: ScrollbarMetrics) {
  return (
    next.hasVerticalOverflow === prev.hasVerticalOverflow &&
    next.headerHeight === prev.headerHeight &&
    next.horizontalScrollbarSize === prev.horizontalScrollbarSize &&
    next.thumbHeight === prev.thumbHeight &&
    next.thumbTop === prev.thumbTop &&
    next.trackHeight === prev.trackHeight
  );
}

function applyMetrics(element: HTMLElement, metrics: ScrollbarMetrics) {
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
}

const getHorizontalScrollbarSize = (
  horizontalScrollbar: HTMLElement | null,
  hasHorizontalOverflow: boolean
) => {
  if (!hasHorizontalOverflow) return 0;

  const measured = horizontalScrollbar?.offsetHeight ?? 0;
  return measured > 0 ? measured : FALLBACK_SCROLLBAR_SIZE;
};

function DataGridScrollArea({
  children,
  className,
  orientation = 'both',
  ...props
}: DataGridScrollAreaProps) {
  const { props: dataGridProps } = useDataGrid();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startScrollTop: number;
    startY: number;
  } | null>(null);
  const scrollHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastScrollTopRef = useRef(0);
  const metricsRef = useRef<ScrollbarMetrics>(INITIAL_METRICS);

  const showHorizontal = orientation !== 'vertical';
  const showVertical = orientation !== 'horizontal';
  const showCorner = orientation === 'both';
  const usesCustomVerticalScrollbar =
    showVertical && !!dataGridProps.tableLayout?.headerSticky;
  const [hasCustomVerticalOverflow, setHasCustomVerticalOverflow] =
    useState(false);
  const [customScrollbarScrolling, setCustomScrollbarScrolling] =
    useState(false);
  const [isNearHorizontalEdge, setIsNearHorizontalEdge] = useState(false);
  const [isNearVerticalEdge, setIsNearVerticalEdge] = useState(false);
  const [isDraggingCustomThumb, setIsDraggingCustomThumb] = useState(false);

  const showCustomVerticalScrollbar =
    customScrollbarScrolling || isNearVerticalEdge || isDraggingCustomThumb;

  const isCustomVerticalScrollbarActive =
    customScrollbarScrolling || isDraggingCustomThumb;

  const clearDragState = useCallback(() => {
    dragRef.current = null;
    setIsDraggingCustomThumb(false);
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  }, []);

  const clearScrollHideTimeout = useCallback(() => {
    if (scrollHideTimeoutRef.current) {
      clearTimeout(scrollHideTimeoutRef.current);
      scrollHideTimeoutRef.current = null;
    }
  }, []);

  const markCustomScrollbarScrolling = useCallback(() => {
    setCustomScrollbarScrolling(true);
    clearScrollHideTimeout();
    scrollHideTimeoutRef.current = setTimeout(() => {
      setCustomScrollbarScrolling(false);
      scrollHideTimeoutRef.current = null;
    }, SCROLLBAR_HIDE_DELAY_MS);
  }, [clearScrollHideTimeout]);

  const clearScrollbarEdgeProximity = useCallback(() => {
    setIsNearHorizontalEdge(false);
    setIsNearVerticalEdge(false);
  }, []);

  const updateScrollbarEdgeProximity = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      if (!inside) {
        clearScrollbarEdgeProximity();
        return;
      }

      const insetFromEnd = rect.right - clientX;
      const insetFromBottom = rect.bottom - clientY;

      setIsNearHorizontalEdge(
        showHorizontal && insetFromBottom <= EDGE_PROXIMITY_PX
      );
      setIsNearVerticalEdge(showVertical && insetFromEnd <= EDGE_PROXIMITY_PX);
    },
    [clearScrollbarEdgeProximity, showHorizontal, showVertical]
  );

  const handleContainerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    updateScrollbarEdgeProximity(event.clientX, event.clientY);
  };

  const handleContainerPointerLeave = () => {
    clearScrollbarEdgeProximity();
  };

  const resetMetrics = useCallback(() => {
    const container = containerRef.current;

    if (container && !areMetricsEqual(INITIAL_METRICS, metricsRef.current)) {
      applyMetrics(container, INITIAL_METRICS);
      metricsRef.current = INITIAL_METRICS;
    }

    setHasCustomVerticalOverflow((prev) => (prev ? false : prev));
  }, []);

  const syncCustomVerticalScrollbar = useCallback(() => {
    const container = containerRef.current;
    const viewport = viewportRef.current;

    if (!container || !viewport || !usesCustomVerticalScrollbar) {
      resetMetrics();
      return;
    }

    const header = container.querySelector(
      '[data-slot="data-grid-table"] thead'
    );
    const horizontalScrollbar = container.querySelector<HTMLElement>(
      '[data-slot="data-grid-scrollbar"][data-orientation="horizontal"]'
    );
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const viewportHeight = viewport.clientHeight;
    const viewportWidth = viewport.clientWidth;
    const scrollHeight = viewport.scrollHeight;
    const scrollWidth = viewport.scrollWidth;
    const hasHorizontalOverflow =
      showHorizontal && scrollWidth > viewportWidth + 0.5;
    const horizontalScrollbarSize = getHorizontalScrollbarSize(
      horizontalScrollbar,
      hasHorizontalOverflow
    );
    const trackHeight = Math.max(
      0,
      viewportHeight - headerHeight - horizontalScrollbarSize
    );
    const maxScroll = Math.max(0, scrollHeight - viewportHeight);

    let nextMetrics: ScrollbarMetrics;

    if (trackHeight === 0 || maxScroll === 0) {
      nextMetrics = {
        hasVerticalOverflow: false,
        headerHeight,
        horizontalScrollbarSize,
        thumbHeight: trackHeight,
        thumbTop: 0,
        trackHeight,
      };
    } else {
      const bodyContentHeight = Math.max(
        trackHeight,
        scrollHeight - headerHeight
      );
      const thumbHeight = clamp(
        trackHeight * (trackHeight / bodyContentHeight),
        MIN_THUMB_SIZE,
        trackHeight
      );
      const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
      const thumbTop =
        maxThumbTop > 0 ? (viewport.scrollTop / maxScroll) * maxThumbTop : 0;

      nextMetrics = {
        hasVerticalOverflow: true,
        headerHeight,
        horizontalScrollbarSize,
        thumbHeight,
        thumbTop,
        trackHeight,
      };
    }

    if (!areMetricsEqual(nextMetrics, metricsRef.current)) {
      applyMetrics(container, nextMetrics);
      metricsRef.current = nextMetrics;
    }

    setHasCustomVerticalOverflow((prev) =>
      prev === nextMetrics.hasVerticalOverflow
        ? prev
        : nextMetrics.hasVerticalOverflow
    );
  }, [resetMetrics, showHorizontal, usesCustomVerticalScrollbar]);

  useEffect(() => {
    const container = containerRef.current;
    const viewport = viewportRef.current;

    if (!container || !viewport) return;

    if (!usesCustomVerticalScrollbar) {
      resetMetrics();
      return;
    }

    lastScrollTopRef.current = viewport.scrollTop;

    let frame = 0;

    const scheduleSync = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncCustomVerticalScrollbar);
    };

    const handleScroll = () => {
      if (viewport.scrollTop !== lastScrollTopRef.current) {
        markCustomScrollbarScrolling();
        lastScrollTopRef.current = viewport.scrollTop;
      }
      scheduleSync();
    };

    scheduleSync();
    viewport.addEventListener('scroll', handleScroll, { passive: true });

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleSync);

    const header = container.querySelector(
      '[data-slot="data-grid-table"] thead'
    );
    const horizontalScrollbar = container.querySelector<HTMLElement>(
      '[data-slot="data-grid-scrollbar"][data-orientation="horizontal"]'
    );
    const table = container.querySelector('[data-slot="data-grid-table"]');
    const tableViewport = container.querySelector(
      '[data-slot="data-grid-table-viewport"]'
    );

    observer?.observe(viewport);
    header && observer?.observe(header);
    table && observer?.observe(table);
    tableViewport && observer?.observe(tableViewport);
    horizontalScrollbar && observer?.observe(horizontalScrollbar);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      viewport.removeEventListener('scroll', handleScroll);
      clearScrollHideTimeout();
      clearDragState();
    };
  }, [
    clearDragState,
    clearScrollHideTimeout,
    markCustomScrollbarScrolling,
    resetMetrics,
    syncCustomVerticalScrollbar,
    usesCustomVerticalScrollbar,
  ]);

  const scrollToThumbOffset = (nextThumbTop: number) => {
    const viewport = viewportRef.current;
    const { thumbHeight, trackHeight } = metricsRef.current;

    if (!viewport) return;

    const maxScroll = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

    if (maxScroll === 0 || maxThumbTop === 0) {
      viewport.scrollTop = 0;
      return;
    }

    const ratio = clamp(nextThumbTop, 0, maxThumbTop) / maxThumbTop;
    viewport.scrollTop = ratio * maxScroll;
  };

  const handleThumbPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    setIsDraggingCustomThumb(true);
    setIsNearVerticalEdge(true);
    markCustomScrollbarScrolling();

    dragRef.current = {
      pointerId: event.pointerId,
      startScrollTop: viewport.scrollTop,
      startY: event.clientY,
    };

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  };

  const handleThumbPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const dragState = dragRef.current;
    const { thumbHeight, trackHeight } = metricsRef.current;

    if (!viewport || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    markCustomScrollbarScrolling();

    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight
    );

    if (maxThumbTop === 0 || maxScroll === 0) return;

    const deltaY = event.clientY - dragState.startY;
    const nextScrollTop =
      dragState.startScrollTop + (deltaY / maxThumbTop) * maxScroll;

    viewport.scrollTop = clamp(nextScrollTop, 0, maxScroll);
  };

  const handleThumbPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    clearDragState();
    markCustomScrollbarScrolling();
  };

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const { thumbHeight } = metricsRef.current;

    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    event.stopPropagation();

    setIsNearVerticalEdge(true);
    markCustomScrollbarScrolling();

    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top - thumbHeight / 2;

    scrollToThumbOffset(offsetY);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerLeave={handleContainerPointerLeave}
      onPointerMove={handleContainerPointerMove}
    >
      <ScrollAreaPrimitive.Root
        data-slot="data-grid-scroll-area"
        className={cn('relative', className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          data-slot="scroll-area-viewport"
          className="size-full"
        >
          <ScrollAreaPrimitive.Content data-slot="scroll-area-content">
            {children}
          </ScrollAreaPrimitive.Content>
        </ScrollAreaPrimitive.Viewport>

        {showHorizontal && (
          <ScrollAreaPrimitive.Scrollbar
            data-slot="data-grid-scrollbar"
            data-orientation="horizontal"
            orientation="horizontal"
            className={cn(
              dataGridBaseUiScrollbarClassName,
              isNearHorizontalEdge && 'opacity-100'
            )}
          >
            <ScrollAreaPrimitive.Thumb
              data-slot="data-grid-thumb"
              className={dataGridBaseUiScrollbarThumbClassName}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}

        {showVertical && !usesCustomVerticalScrollbar && (
          <ScrollAreaPrimitive.Scrollbar
            data-slot="data-grid-scrollbar"
            data-orientation="vertical"
            orientation="vertical"
            className={cn(
              dataGridBaseUiScrollbarClassName,
              isNearVerticalEdge && 'opacity-100'
            )}
          >
            <ScrollAreaPrimitive.Thumb
              data-slot="data-grid-thumb"
              className={dataGridBaseUiScrollbarThumbClassName}
            />
          </ScrollAreaPrimitive.Scrollbar>
        )}

        {showCorner && (
          <ScrollAreaPrimitive.Corner data-slot="data-grid-scroll-corner" />
        )}
      </ScrollAreaPrimitive.Root>

      {usesCustomVerticalScrollbar && hasCustomVerticalOverflow && (
        <div
          className={cn(
            'absolute inset-e-0 top-(--data-grid-scrollbar-header-height) z-20 h-(--data-grid-scrollbar-track-height)',
            'transition-opacity duration-200',
            showCustomVerticalScrollbar
              ? 'opacity-100'
              : 'pointer-events-none opacity-0'
          )}
        >
          <div
            data-orientation="vertical"
            data-scrolling={isCustomVerticalScrollbarActive ? '' : undefined}
            data-slot="data-grid-scrollbar"
            className={dataGridCustomVerticalScrollbarTrackClassName}
            onPointerDown={handleTrackPointerDown}
          >
            <div
              className={cn(
                dataGridCustomVerticalScrollbarThumbClassName,
                'top-(--data-grid-scrollbar-thumb-top) h-(--data-grid-scrollbar-thumb-height)'
              )}
              onLostPointerCapture={clearDragState}
              onPointerCancel={handleThumbPointerUp}
              onPointerDown={handleThumbPointerDown}
              onPointerMove={handleThumbPointerMove}
              onPointerUp={handleThumbPointerUp}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { DataGridScrollArea };
export type { DataGridScrollAreaOrientation, DataGridScrollAreaProps };
