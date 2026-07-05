import { useEffect, useSyncExternalStore } from 'react';
import type { PageSizeScope } from '@/lib/prefs/pageSizeConfig';
import {
  readSessionPref,
  subscribeSessionPref,
  writeSessionPref,
} from '@/lib/prefs/sessionPref';

const LAST_VISIBLE_ROWS_KEYS: Record<PageSizeScope, string> = {
  transactions: 'ploutizo:transactions:last-visible-rows',
  accounts: 'ploutizo:accounts:last-visible-rows',
  expenses: 'ploutizo:expenses:last-visible-rows',
  income: 'ploutizo:income:last-visible-rows',
  'card-balances': 'ploutizo:card-balances:last-visible-rows',
  'import-review': 'ploutizo:import-review:last-visible-rows',
};

const noopSubscribe = (_onStoreChange: () => void) => () => {};

/** Effective page size while loading — matches last partial page via sessionStorage. */
export const useEffectiveTablePageSize = (
  scope: PageSizeScope,
  pageSize: number,
  visibleRowCount: number,
  isLoading: boolean
): number => {
  const storageKey = LAST_VISIBLE_ROWS_KEYS[scope];

  const lastKnownRows = useSyncExternalStore(
    isLoading
      ? (onStoreChange) => subscribeSessionPref(storageKey, onStoreChange)
      : noopSubscribe,
    () => (isLoading ? readSessionPref(storageKey) : null),
    () => null
  );

  useEffect(() => {
    if (!isLoading && visibleRowCount > 0) {
      writeSessionPref(storageKey, visibleRowCount);
    }
  }, [storageKey, isLoading, visibleRowCount]);

  if (!isLoading || lastKnownRows === null) {
    return pageSize;
  }

  return Math.min(pageSize, lastKnownRows);
};
