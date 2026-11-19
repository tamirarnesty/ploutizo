import { beforeEach, describe, expect, it } from 'vitest';
import type { GetDashboardOverviewResponse } from '@ploutizo/validators';
import type { TransactionQueryParams } from '@/lib/data-access/transactions/useGetTransactions';
import { MAX_OFFLINE_TRANSACTION_VIEWS } from './coverage';
import { offlineBannerText } from './offline-copy';
import {
  ingestSuccessfulQuery,
  readDashboardPeriod,
  readLastSyncedAt,
  readTransactionView,
  resetOfflineReadStore,
} from './offline-read-store';
import { resolveOfflineQueryView } from './offline-query';
import { presentAccess } from './present-access';

const params = (page: number, search?: string): TransactionQueryParams => ({
  page,
  limit: 25,
  sort: 'date',
  order: 'desc',
  search,
});

const list = (total: number) => ({
  data: [],
  total,
  page: 1,
  limit: 25,
});

const overview = {
  meta: { kind: 'all' as const, range: null },
  trend: [],
  categories: [],
};

describe('offline read', () => {
  beforeEach(() => {
    resetOfflineReadStore();
  });

  it('returns a saved transactions page and reports an unsaved one as unavailable', () => {
    ingestSuccessfulQuery(['transactions', params(1)], list(4));

    expect(readTransactionView(params(1))?.total).toBe(4);
    expect(readTransactionView(params(2, 'rent'))).toBeUndefined();
    expect(readLastSyncedAt()).toEqual(expect.any(String));

    const saved = resolveOfflineQueryView({
      offline: true,
      hydration: 'ready',
      data: undefined,
      isError: true,
      isPending: true,
      isFetching: false,
      snapshot: readTransactionView(params(1)),
    });
    expect(saved).toMatchObject({
      isError: false,
      isPending: false,
      isLoading: false,
      offlineUnavailable: false,
    });
    expect(saved.data?.total).toBe(4);

    const missing = resolveOfflineQueryView({
      offline: true,
      hydration: 'ready',
      data: undefined,
      isError: true,
      isPending: true,
      isFetching: true,
      snapshot: readTransactionView(params(9)),
    });
    expect(missing).toEqual({
      data: undefined,
      isError: false,
      isPending: false,
      isFetching: false,
      isLoading: false,
      offlineUnavailable: true,
    });
  });

  it('keeps the pinned default view when newer filtered views fill the window', () => {
    ingestSuccessfulQuery(
      ['transactions', params(1)],
      list(1),
      '2026-01-01T00:00:00.000Z'
    );
    for (let page = 2; page < 2 + MAX_OFFLINE_TRANSACTION_VIEWS; page += 1) {
      ingestSuccessfulQuery(
        ['transactions', params(page, `filter-${page}`)],
        list(page),
        `2026-02-${String(page).padStart(2, '0')}T00:00:00.000Z`
      );
    }

    expect(readTransactionView(params(1))?.total).toBe(1);
    expect(readTransactionView(params(2, 'filter-2'))).toBeUndefined();
  });

  it('reads a loaded dashboard period and ignores collection-internal queries', () => {
    const period = { kind: 'all' } as const;
    ingestSuccessfulQuery(['dashboard-overview', 'all'], overview);

    expect(readDashboardPeriod(period)?.meta.kind).toBe('all');
    expect(
      ingestSuccessfulQuery(['dashboard-overview', 'all'], {
        meta: { kind: 'nope' },
      })
    ).toBe(false);
    expect(readDashboardPeriod(period)?.meta.kind).toBe('all');
    expect(
      ingestSuccessfulQuery(
        ['offline-collection', 'dashboard-periods'],
        overview
      )
    ).toBe(false);
  });

  it('shows the offline banner time and clears the idea of an error', () => {
    const syncedAt = '2026-03-01T15:04:00.000Z';
    expect(offlineBannerText(syncedAt, 'en-US', 'UTC')).toBe(
      "Offline - data as of Mar 1, 3:04 PM. You're offline. Changes aren't available until you reconnect."
    );
    expect(offlineBannerText(null)).toContain(
      'nothing saved on this device yet'
    );
  });
});

describe('presentAccess', () => {
  const remembered = {
    signedInMemberId: 'user_alex',
    activeHouseholdId: 'org_a',
  };
  const household = {
    status: 'signed-in-with-active-household' as const,
    signedInMemberId: 'user_alex',
    activeHouseholdId: 'org_a',
  };

  it('keeps the remembered household when Clerk has not loaded offline', () => {
    expect(
      presentAccess({
        clerkLoaded: false,
        clerkAccess: { status: 'signed-out' },
        offline: true,
        remembered,
        expired: false,
      })
    ).toEqual(household);
  });

  it('does not treat an offline Clerk failure as sign-out', () => {
    expect(
      presentAccess({
        clerkLoaded: true,
        clerkAccess: { status: 'signed-out' },
        offline: true,
        remembered,
        expired: false,
      })
    ).toEqual(household);
  });

  it('signs out an expired offline launch once the network is back', () => {
    expect(
      presentAccess({
        clerkLoaded: true,
        clerkAccess: household,
        offline: false,
        remembered,
        expired: true,
      })
    ).toEqual({ status: 'signed-out' });
  });

  it('shows the offline fallback when this device has no remembered session', () => {
    expect(
      presentAccess({
        clerkLoaded: false,
        clerkAccess: { status: 'signed-out' },
        offline: true,
        remembered: null,
        expired: false,
      })
    ).toEqual({ status: 'signed-out' });
  });
});

void (overview satisfies GetDashboardOverviewResponse);
