import { createFileRoute } from '@tanstack/react-router';
import type { RouterContext } from '@/router';
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
import type { TransactionSearch } from '../components/transactions/transactionSearch';

const loadTransactions = async (
  context: RouterContext,
  search: TransactionSearch
) => {
  const [isReady] = await Promise.all([
    isHouseholdLoaderReady(context),
    ensurePageSizeHydrated(),
  ]);
  if (!isReady) {
    return;
  }
  const limit = readStoredPageSize('transactions');
  const transactionParams = buildTransactionQueryParams(search, limit);

  await Promise.all([
    context.queryClient.ensureQueryData(
      transactionsQueryOptions(transactionParams)
    ),
    context.queryClient.ensureQueryData(accountsQueryOptions()),
    context.queryClient.ensureQueryData(categoriesQueryOptions),
    context.queryClient.ensureQueryData(householdMembersQueryOptions),
    context.queryClient.ensureQueryData(tagsQueryOptions),
  ]);
};

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
  loader: ({ context, deps: search }) => loadTransactions(context, search),
  component: Transactions,
});
