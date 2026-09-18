import { createFileRoute } from '@tanstack/react-router';
import { isHouseholdLoaderReady } from '@/lib/access/household-loader-ready';
import { accountsQueryOptions } from '@/lib/data-access/accounts';
import { categoriesQueryOptions } from '@/lib/data-access/categories';
import { householdMembersQueryOptions } from '@/lib/data-access/household';
import { ensurePageSizeHydrated, readStoredPageSize } from '@/lib/prefs';
import { tagsQueryOptions } from '@/lib/data-access/tags';
import { transactionsQueryOptions } from '@/lib/data-access/transactions';
import { Transactions } from '../components/transactions/Transactions';
import {
  buildTransactionQueryParams,
  validateTransactionSearch,
} from '../components/transactions/transactionSearch';

export const Route = createFileRoute('/_layout/transactions')({
  staticData: {
    nav: {
      label: 'Transactions',
      keywords: ['tx', 'list'],
      order: 1,
    },
  },
  validateSearch: validateTransactionSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps: search }) => {
    if (!(await isHouseholdLoaderReady(context))) {
      return;
    }
    await ensurePageSizeHydrated();
    const limit = readStoredPageSize('transactions');
    const transactionParams = buildTransactionQueryParams(search, limit);

    await Promise.all([
      context.queryClient.ensureQueryData(
        transactionsQueryOptions(transactionParams)
      ),
      context.queryClient.ensureQueryData(accountsQueryOptions()),
      context.queryClient.ensureQueryData(categoriesQueryOptions()),
      context.queryClient.ensureQueryData(householdMembersQueryOptions()),
      context.queryClient.ensureQueryData(tagsQueryOptions()),
    ]);
  },
  component: Transactions,
});
