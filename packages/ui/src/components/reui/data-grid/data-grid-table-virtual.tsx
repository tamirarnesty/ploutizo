'use client';

import type { DataGridTableVirtualProps } from '@/components/reui/data-grid/data-grid-table-virtual-types';
import { useDataGrid } from '@/components/reui/data-grid/data-grid';
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableFoot,
  DataGridTableRowSpacer,
  DataGridTableViewport,
} from '@/components/reui/data-grid/data-grid-table';
import { getDataGridTableRowSections } from '@/components/reui/data-grid/data-grid-table-row-sections';
import { MemoizedDataGridTableVirtualBody } from '@/components/reui/data-grid/data-grid-table-virtual-body';
import { DataGridTableVirtualHeader } from '@/components/reui/data-grid/data-grid-table-virtual-header';
import { useDataGridTableVirtual } from '@/components/reui/data-grid/use-data-grid-table-virtual';

const DataGridTableVirtual = <TData,>({
  height,
  estimateSize = 48,
  overscan = 10,
  footerContent,
  renderHeader = true,
  onFetchMore,
  isFetchingMore = false,
  hasMore,
  fetchMoreOffset = 0,
  virtualizerOptions,
}: DataGridTableVirtualProps<TData>) => {
  const { table, props } = useDataGrid();
  const { topRows, centerRows, bottomRows } = getDataGridTableRowSections(
    table,
    props.tableLayout?.rowsPinnable
  );
  const columnCount =
    table.getVisibleFlatColumns().length +
    (props.tableLayout?.columnsResizable ? 1 : 0);
  const isInfiniteMode = typeof onFetchMore === 'function';
  const loadingMoreMessage =
    props.fetchingMoreMessage || props.loadingMessage || 'Loading...';
  const allRowsLoadedMessage =
    props.allRowsLoadedMessage || 'All records loaded';

  const {
    handleViewportRef,
    usesExternalScrollArea,
    isVirtualizationEnabled,
    virtualItems,
    totalSize,
    measureRowRef,
  } = useDataGridTableVirtual({
    table,
    centerRows,
    estimateSize,
    overscan,
    fetchMoreOffset,
    onFetchMore,
    isFetchingMore,
    hasMore,
    isInfiniteMode,
    virtualizerOptions,
  });

  return (
    <DataGridTableViewport
      viewportRef={handleViewportRef}
      className={!usesExternalScrollArea ? 'block' : undefined}
      style={
        usesExternalScrollArea
          ? undefined
          : { height, overflow: 'auto', position: 'relative' }
      }
    >
      <DataGridTableBase>
        {renderHeader && <DataGridTableVirtualHeader />}

        {renderHeader &&
          (props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
            <DataGridTableRowSpacer />
          )}

        <DataGridTableBody>
          <MemoizedDataGridTableVirtualBody
            table={table}
            columnCount={columnCount}
            topRows={topRows}
            centerRows={centerRows}
            bottomRows={bottomRows}
            virtualItems={virtualItems}
            totalSize={totalSize}
            isVirtualizationEnabled={isVirtualizationEnabled}
            isInfiniteMode={isInfiniteMode}
            isFetchingMore={isFetchingMore}
            hasMore={hasMore}
            loadingMoreMessage={loadingMoreMessage}
            allRowsLoadedMessage={allRowsLoadedMessage}
            measureRowRef={measureRowRef}
          />
        </DataGridTableBody>

        {footerContent && (
          <DataGridTableFoot>{footerContent}</DataGridTableFoot>
        )}
      </DataGridTableBase>
    </DataGridTableViewport>
  );
};

export { DataGridTableVirtual };
export type {
  DataGridTableVirtualProps,
  DataGridTableVirtualScrollElements,
  DataGridTableVirtualizerOptions,
} from '@/components/reui/data-grid/data-grid-table-virtual-types';
