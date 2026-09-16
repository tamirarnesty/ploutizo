import { createFileRoute } from '@tanstack/react-router';
import { ensureHouseholdQueryData } from '@/lib/access';
import { accountsQueryOptions } from '@/lib/data-access/accounts';
import { Accounts } from '../components/accounts/Accounts';

export const Route = createFileRoute('/_layout/accounts')({
  loader: async ({ context }) => {
    await ensureHouseholdQueryData(context.queryClient, accountsQueryOptions());
  },
  component: Accounts,
});
