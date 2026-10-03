import {
  createFileRoute,
  redirect,
  retainSearchParams,
} from '@tanstack/react-router';
import {
  DEFAULT_DASHBOARD_PERIOD,
  dashboardSearchFromSelection,
  resolveDashboardPeriod,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { dashboardOverviewQueryOptions } from '@/lib/data-access/dashboard';
import { householdMembersQueryOptions } from '@/lib/data-access/household';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';
import { dashboardRecentTransactionsQueryOptions } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import { readPersistedDashboardPeriod } from '@/lib/dashboard-period/cookie';
import { validateDashboardSearch } from '@/lib/dashboard-period/validateDashboardSearch';
import { DEFAULT_SPEND_TREND_MODE } from '@/lib/spend-trend-mode';
import { readPersistedSpendTrendMode } from '@/lib/spend-trend-mode/cookie';

export const Route = createFileRoute('/_layout/dashboard')({
  staticData: {
    nav: {
      label: 'Dashboard',
      keywords: ['home', 'overview'],
      order: 0,
    },
  },
  validateSearch: validateDashboardSearch,
  // Period links name only the period; the mode stays as it was.
  search: { middlewares: [retainSearchParams(['trend'])] },
  // A URL missing the period or the mode redirects to the viewer's last ones, else the defaults, so the URL
  // always names both and a shared link opens on the same chart.
  beforeLoad: ({ search }) => {
    const periodSelection = selectionFromDashboardSearch(search);
    const spendTrendMode = search.trend;
    if (!periodSelection || !spendTrendMode) {
      throw redirect({
        to: '/dashboard',
        search: {
          ...dashboardSearchFromSelection(
            periodSelection ??
              readPersistedDashboardPeriod() ??
              DEFAULT_DASHBOARD_PERIOD
          ),
          trend:
            spendTrendMode ??
            readPersistedSpendTrendMode() ??
            DEFAULT_SPEND_TREND_MODE,
        },
        replace: true,
      });
    }
    return { periodSelection, spendTrendMode };
  },
  // The mode only changes how the chart draws the same data.
  loaderDeps: ({ search: { range, from, to } }) => ({ range, from, to }),
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    const period = resolveDashboardPeriod(context.periodSelection, new Date());
    await Promise.all([
      context.queryClient.ensureQueryData(
        dashboardOverviewQueryOptions(period)
      ),
      context.queryClient.ensureQueryData(settlementsQueryOptions),
      context.queryClient.ensureQueryData(householdMembersQueryOptions),
    ]);
    // Warm the strip without blocking the route when transactions fail.
    void context.queryClient.prefetchQuery(
      dashboardRecentTransactionsQueryOptions
    );
  },
  component: Dashboard,
});
