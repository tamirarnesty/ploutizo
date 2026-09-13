import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { orgMembersQueryOptions } from '@/lib/data-access/org';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';

export const Route = createFileRoute('/_layout/dashboard')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient
        .ensureQueryData(settlementsQueryOptions())
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(orgMembersQueryOptions())
        .catch(() => undefined),
    ]);
  },
  component: Dashboard,
});
