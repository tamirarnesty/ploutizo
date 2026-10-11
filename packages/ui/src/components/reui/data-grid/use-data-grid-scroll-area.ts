'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type PointerEvent } from 'react';
import { type DataGridScrollAreaOrientation } from '@/components/reui/data-grid/data-grid-scroll-area-types';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  EDGE_PROXIMITY_PX,
  INITIAL_SCROLLBAR_METRICS,
  MIN_THUMB_SIZE,
  SCROLLBAR_HIDE_DELAY_MS,
  type ScrollbarMetrics,
  applyScrollbarMetrics,
  areScrollbarMetricsEqual,
  clamp,
  getHorizontalScrollbarSize,
} from '@/components/reui/data-grid/data-grid-scroll-area-metrics';

export const useDataGridScrollArea = (
  orientation: DataGridScrollAreaOrientation = 'both'
) => {
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
  const metricsRef = useRef<ScrollbarMetrics>(INITIAL_SCROLLBAR_METRICS);

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

    if (
      container &&
      !areScrollbarMetricsEqual(INITIAL_SCROLLBAR_METRICS, metricsRef.current)
    ) {
      applyScrollbarMetrics(container, INITIAL_SCROLLBAR_METRICS);
      metricsRef.current = INITIAL_SCROLLBAR_METRICS;
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

    if (!areScrollbarMetricsEqual(nextMetrics, metricsRef.current)) {
      applyScrollbarMetrics(container, nextMetrics);
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

  return {
    containerRef,
    viewportRef,
    showHorizontal,
    showVertical,
    showCorner,
    usesCustomVerticalScrollbar,
    hasCustomVerticalOverflow,
    showCustomVerticalScrollbar,
    isCustomVerticalScrollbarActive,
    isNearHorizontalEdge,
    isNearVerticalEdge,
    handleContainerPointerMove,
    handleContainerPointerLeave,
    clearDragState,
    handleTrackPointerDown,
    handleThumbPointerUp,
    handleThumbPointerDown,
    handleThumbPointerMove,
  };
};
