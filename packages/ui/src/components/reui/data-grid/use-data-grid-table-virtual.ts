'use client';

import { useCallback, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type Row, type Table } from '@tanstack/react-table';
import { type VirtualItem } from '@tanstack/react-virtual';
import {
  type DataGridTableVirtualScrollElements,
  type DataGridTableVirtualizerInstance,
  type DataGridTableVirtualizerOptions,
} from '@/components/reui/data-grid/data-grid-table-virtual-types';

type UseDataGridTableVirtualParams<TData> = {
  table: Table<TData>;
  centerRows: Row<TData>[];
  estimateSize: number;
  overscan: number;
  fetchMoreOffset: number;
  onFetchMore?: () => void;
  isFetchingMore: boolean;
  hasMore?: boolean;
  isInfiniteMode: boolean;
  virtualizerOptions?: DataGridTableVirtualizerOptions<TData>;
};

export const useDataGridTableVirtual = <TData>({
  centerRows,
  estimateSize,
  overscan,
  fetchMoreOffset,
  onFetchMore,
  isFetchingMore,
  hasMore,
  isInfiniteMode,
  virtualizerOptions,
}: UseDataGridTableVirtualParams<TData>) => {
  const [viewportElements, setViewportElements] =
    useState<DataGridTableVirtualScrollElements>({
      containerElement: null,
      scrollElement: null,
    });

  const {
    estimateSize: customEstimateSize,
    getItemKey: customGetItemKey,
    getScrollElement: customGetScrollElement,
    measureElement: customMeasureElement,
    overscan: customOverscan,
    onChange: virtualizerOnChange,
    ...virtualizerOptionsRest
  } = virtualizerOptions ?? {};

  const isVirtualizationEnabled = virtualizerOptions?.enabled !== false;

  const handleViewportRef = useCallback((node: HTMLDivElement | null) => {
    setViewportElements({
      containerElement: node,
      scrollElement:
        (node?.closest(
          '[data-slot="scroll-area-viewport"]'
        ) as HTMLElement | null) ?? node,
    });
  }, []);

  const usesExternalScrollArea =
    viewportElements.scrollElement !== null &&
    viewportElements.scrollElement !== viewportElements.containerElement;

  const resolveScrollElement = useCallback(() => {
    if (customGetScrollElement) {
      return customGetScrollElement(viewportElements);
    }

    return viewportElements.scrollElement;
  }, [customGetScrollElement, viewportElements]);

  const resolveItemKey = useCallback(
    (index: number) => {
      const row = centerRows.at(index);
      if (row === undefined) return index;
      return customGetItemKey?.(index, row) ?? row.id;
    },
    [centerRows, customGetItemKey]
  );

  const resolveEstimateSize = useCallback(
    (index: number) => {
      const row = centerRows.at(index);
      if (row === undefined) return estimateSize;
      return customEstimateSize?.(index, row) ?? estimateSize;
    },
    [centerRows, customEstimateSize, estimateSize]
  );

  const resolvedFetchMoreOffset = useMemo(
    () => Math.max(0, fetchMoreOffset),
    [fetchMoreOffset]
  );

  const fetchMoreIfNeeded = useCallback(
    (items: VirtualItem[]) => {
      if (
        !isVirtualizationEnabled ||
        !isInfiniteMode ||
        hasMore === false ||
        isFetchingMore
      ) {
        return;
      }

      const lastItem = items.at(-1);
      if (lastItem === undefined) return;

      if (lastItem.index >= centerRows.length - 1 - resolvedFetchMoreOffset) {
        onFetchMore?.();
      }
    },
    [
      centerRows.length,
      hasMore,
      isFetchingMore,
      isInfiniteMode,
      isVirtualizationEnabled,
      onFetchMore,
      resolvedFetchMoreOffset,
    ]
  );

  const virtualizer = useVirtualizer({
    count: centerRows.length,
    getScrollElement: resolveScrollElement,
    getItemKey: resolveItemKey,
    estimateSize: resolveEstimateSize,
    overscan: customOverscan ?? overscan,
    measureElement: customMeasureElement,
    ...virtualizerOptionsRest,
    onChange: (instance, sync) => {
      virtualizerOnChange?.(instance, sync);
      fetchMoreIfNeeded(instance.getVirtualItems());
    },
  }) as DataGridTableVirtualizerInstance;

  const virtualItems = isVirtualizationEnabled
    ? virtualizer.getVirtualItems()
    : [];
  const totalSize = isVirtualizationEnabled ? virtualizer.getTotalSize() : 0;
  const measureRowRef =
    isVirtualizationEnabled && customMeasureElement
      ? virtualizer.measureElement
      : undefined;

  return {
    handleViewportRef,
    usesExternalScrollArea,
    isVirtualizationEnabled,
    virtualItems,
    totalSize,
    measureRowRef,
  };
};
