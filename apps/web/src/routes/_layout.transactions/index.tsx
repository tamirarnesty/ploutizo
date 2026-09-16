import { createFileRoute } from '@tanstack/react-router';
import { ensureHouseholdQueryData } from '@/lib/access';
import { accountsQueryOptions } from '@/lib/data-access/accounts';
import { categoriesQueryOptions } from '@/lib/data-access/categories';
import { orgMembersQueryOptions } from '@/lib/data-access/org';
import { ensurePageSizeHydrated, readStoredPageSize } from '@/lib/prefs';
import { tagsQueryOptions } from '@/lib/data-access/tags';
import { transactionsQueryOptions } from '@/lib/data-access/transactions';
import { Transactions } from '../../components/transactions/Transactions';
import {
  buildTransactionQueryParams,
  validateTransactionSearch,
} from '../../components/transactions/transactionSearch';

export const Route = createFileRoute('/_layout/transactions/')({
  validateSearch: validateTransactionSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps: search }) => {
    await ensurePageSizeHydrated();
    const limit = readStoredPageSize('transactions');
    const transactionParams = buildTransactionQueryParams(search, limit);

    await Promise.all([
      ensureHouseholdQueryData(
        context.queryClient,
        transactionsQueryOptions(transactionParams)
      ),
      ensureHouseholdQueryData(context.queryClient, accountsQueryOptions()),
      ensureHouseholdQueryData(context.queryClient, categoriesQueryOptions()),
      ensureHouseholdQueryData(context.queryClient, orgMembersQueryOptions()),
      ensureHouseholdQueryData(context.queryClient, tagsQueryOptions()),
    ]);
  },
  component: Transactions,
});
