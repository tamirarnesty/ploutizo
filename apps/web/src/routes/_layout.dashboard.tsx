import { createFileRoute, redirect } from '@tanstack/react-router';
import { resolveDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { dashboardOverviewQueryOptions } from '@/lib/data-access/dashboard';
import { householdMembersQueryOptions } from '@/lib/data-access/household';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';
import { readPersistedDashboardPeriod } from '@/lib/dashboard-period/cookie';
import {
  dashboardPeriodRedirectSearch,
  resolveEffectiveDashboardPeriod,
} from '@/lib/dashboard-period/effectiveDashboardPeriod';
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
  beforeLoad: ({ search }) => {
    const redirectSearch = dashboardPeriodRedirectSearch(
      search,
      readPersistedDashboardPeriod()
    );
    if (redirectSearch) {
      throw redirect({
        to: '/dashboard',
        search: redirectSearch,
        replace: true,
      });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps: search }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    const period = resolveDashboardPeriod(
      resolveEffectiveDashboardPeriod(search),
      new Date()
    );
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
