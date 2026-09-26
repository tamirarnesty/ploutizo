import { createFileRoute } from '@tanstack/react-router';
import { toCalendarDate } from '@ploutizo/utils/dashboard-period';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { dashboardOverviewQueryOptions } from '@/lib/data-access/dashboard';
import { householdMembersQueryOptions } from '@/lib/data-access/household';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';

export const Route = createFileRoute('/_layout/dashboard')({
  staticData: {
    nav: {
      label: 'Dashboard',
      keywords: ['home', 'overview'],
      order: 0,
    },
  },
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(
        dashboardOverviewQueryOptions(toCalendarDate(new Date()))
      ),
      context.queryClient.ensureQueryData(settlementsQueryOptions),
      context.queryClient.ensureQueryData(householdMembersQueryOptions),
    ]);
  },
  component: Dashboard,
});
