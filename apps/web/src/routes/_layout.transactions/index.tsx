import { createFileRoute } from '@tanstack/react-router';
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
      context.queryClient
        .ensureQueryData(transactionsQueryOptions(transactionParams))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(accountsQueryOptions())
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(categoriesQueryOptions())
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(orgMembersQueryOptions())
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(tagsQueryOptions())
        .catch(() => undefined),
    ]);
  },
  component: Transactions,
});
