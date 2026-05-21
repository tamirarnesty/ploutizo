import { useCallback, useState } from 'react';
import type { PaginationState, Updater } from '@tanstack/react-table';

export const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
export const CARD_BALANCES_PAGE_SIZE_OPTIONS = [3, 5, 10] as const;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];
export type CardBalancesPageSize =
  (typeof CARD_BALANCES_PAGE_SIZE_OPTIONS)[number];

const PAGE_SIZE_SCOPES = {
  transactions: {
    storageKey: 'ploutizo:transactions:page-size',
    defaultSize: 25 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  accounts: {
    storageKey: 'ploutizo:accounts:page-size',
    defaultSize: 10 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  expenses: {
    storageKey: 'ploutizo:expenses:page-size',
    defaultSize: 25 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  income: {
    storageKey: 'ploutizo:income:page-size',
    defaultSize: 25 as TablePageSize,
    allowedSizes: TABLE_PAGE_SIZE_OPTIONS,
  },
  'card-balances': {
    storageKey: 'ploutizo:dashboard:card-balances-page-size',
    defaultSize: 3 as CardBalancesPageSize,
    allowedSizes: CARD_BALANCES_PAGE_SIZE_OPTIONS,
  },
} as const;

export type PageSizeScope = keyof typeof PAGE_SIZE_SCOPES;

const isAllowedPageSize = (
  scope: PageSizeScope,
  value: number
): value is (typeof PAGE_SIZE_SCOPES)[PageSizeScope]['allowedSizes'][number] =>
  (PAGE_SIZE_SCOPES[scope].allowedSizes as readonly number[]).includes(value);

export const readStoredPageSize = (scope: PageSizeScope): number => {
  const { storageKey, defaultSize } = PAGE_SIZE_SCOPES[scope];

  if (typeof window === 'undefined') return defaultSize;

  const raw = localStorage.getItem(storageKey);
  if (!raw) return defaultSize;

  const parsed = Number(raw);
  return isAllowedPageSize(scope, parsed) ? parsed : defaultSize;
};

export const persistPageSize = (scope: PageSizeScope, pageSize: number) => {
  if (typeof window === 'undefined') return;
  if (!isAllowedPageSize(scope, pageSize)) return;
  localStorage.setItem(PAGE_SIZE_SCOPES[scope].storageKey, String(pageSize));
};

export const usePersistedPageSize = (scope: PageSizeScope) => {
  const [pagination, setPaginationState] = useState<PaginationState>(() => ({
    pageIndex: 0,
    pageSize: readStoredPageSize(scope),
  }));

  const setPagination = useCallback(
    (updater: Updater<PaginationState>) => {
      setPaginationState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next.pageSize !== prev.pageSize) {
          persistPageSize(scope, next.pageSize);
        }
        return next;
      });
    },
    [scope]
  );

  return { pagination, setPagination };
};

export const useTablePageSize = (scope: PageSizeScope) => {
  const [pageSize, setPageSizeState] = useState(() =>
    readStoredPageSize(scope)
  );

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      persistPageSize(scope, nextPageSize);
      setPageSizeState(nextPageSize);
    },
    [scope]
  );

  return { pageSize, setPageSize };
};
