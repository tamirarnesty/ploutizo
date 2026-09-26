import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_PERIOD_STORAGE_KEY } from '@/lib/dashboard-period/constants';
import { preloadPersistedDashboardOverview } from '@/lib/dashboard-period/preloadPersistedDashboardOverview';

vi.mock('@/lib/data-access/dashboard', () => ({
  dashboardOverviewQueryOptions: (period: unknown) => ({
    queryKey: ['dashboard-overview', period],
    queryFn: () => Promise.resolve(period),
  }),
}));

describe('preloadPersistedDashboardOverview', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.setSystemTime(new Date('2026-03-24T12:00:00'));
  });

  it('prefetches overview for the persisted period when the URL is empty', async () => {
    window.localStorage.setItem(
      DASHBOARD_PERIOD_STORAGE_KEY,
      JSON.stringify({ kind: 'shortcut', shortcut: '30d' })
    );

    const queryClient = new QueryClient();
    const ensureSpy = vi.spyOn(queryClient, 'ensureQueryData');

    await preloadPersistedDashboardOverview(queryClient, {});

    expect(ensureSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'dashboard-overview',
          expect.objectContaining({
            kind: 'ranged',
            from: '2026-02-23',
            to: '2026-03-24',
          }),
        ],
      })
    );
  });
});
