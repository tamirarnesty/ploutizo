import { createFileRoute } from '@tanstack/react-router';
import { requireActiveHousehold } from '@/lib/auth/require-active-household';
import { accountsQueryOptions } from '@/lib/data-access/accounts';
import { Accounts } from '../components/accounts/Accounts';

export const Route = createFileRoute('/_layout/accounts')({
  loader: async ({ context }) => {
    const access = requireActiveHousehold(context.access);
    await context.queryClient
      .ensureQueryData(accountsQueryOptions(access))
      .catch(() => undefined);
  },
  component: Accounts,
});
