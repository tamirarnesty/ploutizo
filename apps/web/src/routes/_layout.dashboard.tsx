import { createFileRoute, redirect } from '@tanstack/react-router';
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
import { readPersistedDashboardPeriod } from '@/lib/dashboard-period/cookie';
import { validateDashboardSearch } from '@/lib/dashboard-period/validateDashboardSearch';

export const Route = createFileRoute('/_layout/dashboard')({
  staticData: {
    nav: {
      label: 'Dashboard',
      keywords: ['home', 'overview'],
      order: 0,
    },
  },
  validateSearch: validateDashboardSearch,
  // A URL without a period redirects to the viewer's last one, else the default, so the URL always names it.
  beforeLoad: ({ search }) => {
    const periodSelection = selectionFromDashboardSearch(search);
    if (!periodSelection) {
      throw redirect({
        to: '/dashboard',
        search: dashboardSearchFromSelection(
          readPersistedDashboardPeriod() ?? DEFAULT_DASHBOARD_PERIOD
        ),
        replace: true,
      });
    }
    return { periodSelection };
  },
  loaderDeps: ({ search }) => search,
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
  },
  component: Dashboard,
});
