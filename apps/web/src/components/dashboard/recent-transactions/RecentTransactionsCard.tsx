import { Link } from '@tanstack/react-router';
import { Button } from '@ploutizo/ui/components/button';
import { CardAction, CardContent } from '@ploutizo/ui/components/card';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { TransactionRow } from '@ploutizo/validators';
import { DashboardLiveCard } from '@/components/dashboard/DashboardLiveCard';
import { DASHBOARD_RECENT_TRANSACTIONS_PARAMS } from '@/lib/data-access/transactions/dashboardRecentTransactions';
import { useGetTransactions } from '@/lib/data-access/transactions';
import {
  formatRecentTransactionAccount,
  formatRecentTransactionAmount,
  formatRecentTransactionDate,
  recentTransactionCategoryClassName,
  recentTransactionCategoryDotStyle,
  recentTransactionCategoryLabel,
} from './recentTransactionsDisplay';

type RecentTransactionsCardProps = {
  className?: string;
};

const RecentTransactionsRowSkeleton = () => (
  <tr className="border-b border-border last:border-0">
    {Array.from({ length: 5 }, (_, i) => (
      <td key={i} className="px-3 py-2">
        <Skeleton className="h-4 w-full max-w-24 motion-safe:animate-pulse" />
      </td>
    ))}
  </tr>
);

const RecentTransactionsRow = ({ row }: { row: TransactionRow }) => {
  const categoryLabel = recentTransactionCategoryLabel(row);
  const { displayValue, colorClass } = formatRecentTransactionAmount(row);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 whitespace-nowrap">
        <Text as="span" variant="body-sm" className="text-muted-foreground">
          {formatRecentTransactionDate(row.date)}
        </Text>
      </td>
      <td className="max-w-[12rem] px-3 py-2">
        <Text
          as="span"
          variant="body-sm"
          className="block truncate font-medium"
        >
          {row.description}
        </Text>
      </td>
      <td className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={recentTransactionCategoryClassName(
              categoryLabel !== null
            )}
            style={recentTransactionCategoryDotStyle(row.categoryColour)}
            aria-hidden="true"
          />
          <Text as="span" variant="body-sm" className="min-w-0 truncate">
            {categoryLabel ?? '—'}
          </Text>
        </div>
      </td>
      <td className="max-w-[10rem] px-3 py-2">
        <Text
          as="span"
          variant="body-sm"
          className="block truncate text-muted-foreground"
        >
          {formatRecentTransactionAccount(row)}
        </Text>
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <Text
          as="span"
          variant="body-sm"
          className={cn('font-medium', colorClass)}
        >
          {displayValue}
        </Text>
      </td>
    </tr>
  );
};

export const RecentTransactionsCard = ({
  className,
}: RecentTransactionsCardProps) => {
  const { data, isLoading, isError, isFetching } = useGetTransactions(
    DASHBOARD_RECENT_TRANSACTIONS_PARAMS
  );

  const rows = data?.data ?? [];
  const hasLoadFailure = isError && data === undefined;
  const isBusy = isLoading || (hasLoadFailure && isFetching);
  const showError = hasLoadFailure && !isFetching;
  const isEmpty = !showError && !isBusy && rows.length === 0;

  return (
    <DashboardLiveCard
      title="Recent transactions"
      action={
        <CardAction className="row-span-1 self-center">
          <Button
            nativeButton={false}
            variant="link"
            size="sm"
            render={<Link to="/transactions" />}
          >
            View all
          </Button>
        </CardAction>
      }
      isLoading={isBusy}
      isError={showError}
      errorMessage="Couldn’t load recent transactions. Check your connection and try again."
      className={className}
    >
      <CardContent className="px-0 py-0">
        {isEmpty ? (
          <Text
            as="p"
            variant="body-sm"
            className="px-3.5 py-6 text-center text-muted-foreground"
          >
            No transactions yet
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isBusy
                  ? Array.from(
                      { length: DASHBOARD_RECENT_TRANSACTIONS_PARAMS.limit },
                      (_, i) => <RecentTransactionsRowSkeleton key={i} />
                    )
                  : rows.map((row) => (
                      <RecentTransactionsRow key={row.id} row={row} />
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </DashboardLiveCard>
  );
};
