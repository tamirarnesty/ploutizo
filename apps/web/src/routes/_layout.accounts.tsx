import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { accountsQueryOptions } from '@/lib/data-access/accounts';
import { Accounts } from '../components/accounts/Accounts';

export const Route = createFileRoute('/_layout/accounts')({
  staticData: {
    nav: {
      label: 'Accounts',
      keywords: ['accounts', 'cards'],
      order: 3,
    },
  },
  loader: async ({ context }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await context.queryClient.ensureQueryData(accountsQueryOptions());
  },
  component: Accounts,
});
