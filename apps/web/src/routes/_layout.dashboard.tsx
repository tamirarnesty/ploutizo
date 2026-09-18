import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { householdMembersQueryOptions } from '@/lib/data-access/household';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';

export const Route = createFileRoute('/_layout/dashboard')({
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(settlementsQueryOptions()),
      context.queryClient.ensureQueryData(householdMembersQueryOptions()),
    ]);
  },
  component: Dashboard,
});
