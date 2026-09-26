import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { SpendTrendBody } from '@/components/dashboard/spend-trend/SpendTrendBody';
import type { UseQueryResult } from '@tanstack/react-query';

type SpendTrendCardProps = {
  query: Pick<
    UseQueryResult<GetDashboardOverviewResponse>,
    'data' | 'isError' | 'isFetching'
  >;
};

export const SpendTrendCard = ({
  query: { data, isError, isFetching },
}: SpendTrendCardProps) => {
  // A failed refetch keeps cached data on screen; only a settled failed first load shows the error.
  const showError = isError && data === undefined && !isFetching;
  const isBusy = !showError && (isFetching || data === undefined);

  return (
    <Card aria-busy={isBusy} className="w-full gap-0 py-0">
      <CardHeader className="gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
        <CardTitle className="text-lg leading-tight">Spend trend</CardTitle>
      </CardHeader>
      <CardContent className="px-3.5 py-4">
        {showError ? (
          <Text
            variant="caption"
            role="alert"
            className="px-3.5 py-6 text-muted-foreground"
          >
            Couldn’t load spend trend.
          </Text>
        ) : (
          <div className="relative h-56 min-h-48 w-full">
            {data ? (
              <div
                className={cn(
                  isBusy &&
                    'pointer-events-none opacity-50 motion-safe:transition-opacity'
                )}
              >
                <SpendTrendBody trend={data.trend} />
              </div>
            ) : null}
            {isBusy ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="sr-only" role="status">
                  Loading spend trend
                </span>
                <Spinner className="size-6 text-muted-foreground" aria-hidden />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
