import { useState } from 'react';
import type { PaginationState, Updater } from '@tanstack/react-table';

export const CARD_BALANCES_PAGE_SIZE_OPTIONS = [3, 5, 10] as const;

export type CardBalancesPageSize =
  (typeof CARD_BALANCES_PAGE_SIZE_OPTIONS)[number];

const STORAGE_KEY = 'ploutizo:dashboard:card-balances-page-size';

const DEFAULT_PAGE_SIZE: CardBalancesPageSize = 3;

const isCardBalancesPageSize = (value: number): value is CardBalancesPageSize =>
  CARD_BALANCES_PAGE_SIZE_OPTIONS.includes(value as CardBalancesPageSize);

const readStoredPageSize = (): CardBalancesPageSize => {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PAGE_SIZE;

  const parsed = Number(raw);
  return isCardBalancesPageSize(parsed) ? parsed : DEFAULT_PAGE_SIZE;
};

const persistPageSize = (pageSize: number) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(pageSize));
};

export const useCardBalancesPageSize = () => {
  const [pagination, setPaginationState] = useState<PaginationState>(() => ({
    pageIndex: 0,
    pageSize: readStoredPageSize(),
  }));

  const setPagination = (updater: Updater<PaginationState>) => {
    setPaginationState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.pageSize !== prev.pageSize) {
        persistPageSize(next.pageSize);
      }
      return next;
    });
  };

  return { pagination, setPagination };
};
