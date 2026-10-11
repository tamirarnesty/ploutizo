import { type Row } from '@tanstack/react-table';
import { type ReactNode } from 'react';
import {
  type Virtualizer,
  type VirtualizerOptions,
} from '@tanstack/react-virtual';

export type DataGridTableVirtualScrollElements = {
  containerElement: HTMLDivElement | null;
  scrollElement: HTMLElement | null;
};

export type DataGridTableVirtualizerOptions<TData> = Omit<
  VirtualizerOptions<HTMLElement, HTMLTableRowElement>,
  'count' | 'estimateSize' | 'getItemKey' | 'getScrollElement'
> & {
  estimateSize?: (index: number, row: Row<TData>) => number;
  getItemKey?: (index: number, row: Row<TData>) => string | number;
  getScrollElement?: (
    elements: DataGridTableVirtualScrollElements
  ) => HTMLElement | null;
};

export type DataGridTableVirtualProps<TData> = {
  height?: number | string;
  estimateSize?: number;
  overscan?: number;
  footerContent?: ReactNode;
  renderHeader?: boolean;
  onFetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  fetchMoreOffset?: number;
  virtualizerOptions?: DataGridTableVirtualizerOptions<TData>;
};

export type DataGridTableVirtualizerInstance = Virtualizer<
  HTMLElement,
  HTMLTableRowElement
>;
