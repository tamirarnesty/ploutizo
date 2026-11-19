import type { ResolvedDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type { TransactionQueryParams } from '@/lib/data-access/transactions/useGetTransactions';

/** Saved transaction pages and filter sets, including the pinned default view. */
export const MAX_OFFLINE_TRANSACTION_VIEWS = 8;

/** Saved dashboard periods. The newest periods are kept. */
export const MAX_OFFLINE_DASHBOARD_PERIODS = 6;

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .flatMap((key) => {
        const child = (value as Record<string, unknown>)[key];
        if (child === undefined) return [];
        return [[key, stableValue(child)]];
      });
  }
  return value;
};

/** One saved transactions query: page, sort, and filters. */
export const transactionViewKey = (params: TransactionQueryParams) =>
  JSON.stringify(stableValue(params));

/**
 * The default transactions view is the first page, newest first, with no
 * filters. It stays saved ahead of filtered pages. Page size is part of the
 * key, so each size the member has opened can be pinned.
 */
export const isPinnedTransactionView = (params: TransactionQueryParams) =>
  params.page === 1 &&
  params.sort === 'date' &&
  params.order === 'desc' &&
  params.type === undefined &&
  params.dateFrom === undefined &&
  params.dateTo === undefined &&
  params.accountId === undefined &&
  params.categoryId === undefined &&
  params.assigneeId === undefined &&
  params.tagIds === undefined &&
  (params.search === undefined || params.search === '') &&
  params.dateRange_op === undefined &&
  params.importLink === undefined;

export const dashboardPeriodKey = (period: ResolvedDashboardPeriod) =>
  period.kind === 'all'
    ? 'all'
    : `${period.from}:${period.to}:${period.shortcut ?? ''}`;

export const dashboardPeriodKeyFromQuery = (queryKey: readonly unknown[]) => {
  if (queryKey[0] !== 'dashboard-overview') return null;
  if (queryKey[1] === 'all') return 'all';
  if (typeof queryKey[1] !== 'string' || typeof queryKey[2] !== 'string') {
    return null;
  }
  const shortcut = typeof queryKey[3] === 'string' ? queryKey[3] : '';
  return `${queryKey[1]}:${queryKey[2]}:${shortcut}`;
};

export type WindowItem = {
  id: string;
  syncedAt: string;
  pinned?: boolean;
};

/**
 * Keeps pinned rows first (newest pinned wins when they do not all fit),
 * then the newest other rows, up to `max`.
 */
export const retainOfflineWindow = <T extends WindowItem>(
  items: readonly T[],
  max: number,
  pinned: (item: T) => boolean = (item) => item.pinned === true
) => {
  const byNewest = [...items].sort(
    (left, right) =>
      right.syncedAt.localeCompare(left.syncedAt) ||
      left.id.localeCompare(right.id)
  );
  const pinnedItems = byNewest.filter(pinned);
  const otherItems = byNewest.filter((item) => !pinned(item));
  const keptPinned = pinnedItems.slice(0, max);
  const room = Math.max(0, max - keptPinned.length);
  return [...keptPinned, ...otherItems.slice(0, room)];
};
