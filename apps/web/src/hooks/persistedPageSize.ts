import { useCallback, useMemo, useRef, useState } from 'react';
import { persistPageSize, usePageSizeStore } from '@/lib/prefs';
import type { PageSizeScope } from '@/lib/prefs';
import type { PaginationState, Updater } from '@tanstack/react-table';

const useStoredPageSize = (scope: PageSizeScope) =>
  usePageSizeStore((state) => state.pageSizes[scope]);

export const usePersistedPageSize = (scope: PageSizeScope) => {
  const pageSize = useStoredPageSize(scope);
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const [pageIndex, setPageIndex] = useState(0);

  const pagination = useMemo(
    (): PaginationState => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  );

  const setPagination = useCallback(
    (updater: Updater<PaginationState>) => {
      setPageIndex((prevIndex) => {
        const currentPageSize = pageSizeRef.current;
        const prev: PaginationState = {
          pageIndex: prevIndex,
          pageSize: currentPageSize,
        };
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next.pageSize !== currentPageSize) {
          persistPageSize(scope, next.pageSize);
        }
        return next.pageIndex;
      });
    },
    [scope]
  );

  return { pagination, setPagination };
};

export const useTablePageSize = (scope: PageSizeScope) => {
  const pageSize = useStoredPageSize(scope);

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      persistPageSize(scope, nextPageSize);
    },
    [scope]
  );

  return { pageSize, setPageSize };
};
