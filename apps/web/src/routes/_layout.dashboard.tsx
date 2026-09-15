import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { requireActiveHousehold } from '@/lib/auth/require-active-household';
import { orgMembersQueryOptions } from '@/lib/data-access/org';
import { settlementsQueryOptions } from '@/lib/data-access/settlements';

export const Route = createFileRoute('/_layout/dashboard')({
  loader: async ({ context }) => {
    const access = requireActiveHousehold(context.access);
    await Promise.all([
      context.queryClient
        .ensureQueryData(settlementsQueryOptions(access))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(orgMembersQueryOptions(access))
        .catch(() => undefined),
    ]);
  },
  component: Dashboard,
});
