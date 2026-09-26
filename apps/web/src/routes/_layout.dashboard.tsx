import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { householdMembersQueryOptions } from '@/lib/data-access/household';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';
import { validateDashboardSearch } from '@/lib/dashboard-period/validateDashboardSearch';
import { preloadPersistedDashboardOverview } from '@/lib/dashboard-period/preloadPersistedDashboardOverview';

export const Route = createFileRoute('/_layout/dashboard')({
  staticData: {
    nav: {
      label: 'Dashboard',
      keywords: ['home', 'overview'],
      order: 0,
    },
  },
  validateSearch: validateDashboardSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps: search }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await Promise.all([
      preloadPersistedDashboardOverview(context.queryClient, search),
      context.queryClient.ensureQueryData(settlementsQueryOptions),
      context.queryClient.ensureQueryData(householdMembersQueryOptions),
    ]);
  },
  component: Dashboard,
});
