import { createFileRoute } from '@tanstack/react-router';
import { accountsQueryOptions } from '@/lib/data-access/accounts';
import { Accounts } from '../components/accounts/Accounts';

export const Route = createFileRoute('/_layout/accounts')({
  loader: async ({ context }) => {
    await context.queryClient
      .ensureQueryData(accountsQueryOptions())
      .catch(() => undefined);
  },
  component: Accounts,
});
