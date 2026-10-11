import { useCallback, useMemo, useState } from 'react';
import {
  persistPageSize,
  readStoredPageSize,
  usePageSizeStore,
} from '@/lib/prefs';
import type { PageSizeScope } from '@/lib/prefs';
import type { PaginationState, Updater } from '@tanstack/react-table';

const useStoredPageSize = (scope: PageSizeScope) =>
  usePageSizeStore((state) => state.pageSizes[scope]);

export const usePersistedPageSize = (scope: PageSizeScope) => {
  const pageSize = useStoredPageSize(scope);
  const [pageIndex, setPageIndex] = useState(0);

  const pagination = useMemo(
    (): PaginationState => ({ pageIndex, pageSize }),
    [pageIndex, pageSize]
  );

  const setPagination = useCallback(
    (updater: Updater<PaginationState>) => {
      const currentPageSize = readStoredPageSize(scope);
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize: currentPageSize })
          : updater;
      if (next.pageSize !== currentPageSize) {
        persistPageSize(scope, next.pageSize);
      }
      setPageIndex(next.pageIndex);
    },
    [scope, pageIndex]
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
