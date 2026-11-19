import { describe, expect, it } from 'vitest';
import type { TransactionQueryParams } from '@/lib/data-access/transactions/useGetTransactions';
import {
  MAX_OFFLINE_DASHBOARD_PERIODS,
  MAX_OFFLINE_TRANSACTION_VIEWS,
  isPinnedTransactionView,
  retainOfflineWindow,
  transactionViewKey,
} from './coverage';

const view = (
  page: number,
  extra: Partial<TransactionQueryParams> = {}
): TransactionQueryParams => ({
  page,
  limit: 25,
  sort: 'date',
  order: 'desc',
  ...extra,
});

describe('offline coverage', () => {
  it('pins the unfiltered first page and drops the oldest filtered views past the cap', () => {
    const pinned = view(1);
    const filtered = Array.from(
      { length: MAX_OFFLINE_TRANSACTION_VIEWS },
      (_, index) => view(index + 2, { search: `q${index}` })
    );
    const rows = [
      {
        id: transactionViewKey(pinned),
        syncedAt: '2026-01-01T00:00:00.000Z',
        pinned: isPinnedTransactionView(pinned),
      },
      ...filtered.map((params, index) => ({
        id: transactionViewKey(params),
        syncedAt: `2026-02-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        pinned: isPinnedTransactionView(params),
      })),
    ];

    const kept = retainOfflineWindow(rows, MAX_OFFLINE_TRANSACTION_VIEWS);

    expect(kept).toHaveLength(MAX_OFFLINE_TRANSACTION_VIEWS);
    expect(kept.map((row) => row.id)).toContain(transactionViewKey(pinned));
    expect(kept.map((row) => row.id)).not.toContain(
      transactionViewKey(filtered[0])
    );
  });

  it('keeps the newest dashboard periods', () => {
    const periods = Array.from(
      { length: MAX_OFFLINE_DASHBOARD_PERIODS + 2 },
      (_, index) => ({
        id: `2026-01-${String(index + 1).padStart(2, '0')}:2026-01-${String(index + 2).padStart(2, '0')}:`,
        syncedAt: `2026-03-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      })
    );

    const kept = retainOfflineWindow(periods, MAX_OFFLINE_DASHBOARD_PERIODS);

    expect(kept).toHaveLength(MAX_OFFLINE_DASHBOARD_PERIODS);
    expect(kept[0]?.id).toBe(periods.at(-1)?.id);
    expect(kept.map((row) => row.id)).not.toContain(periods[0]?.id);
  });
});
