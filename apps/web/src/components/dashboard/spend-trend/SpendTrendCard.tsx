import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { cn } from '@ploutizo/ui/lib/utils';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import {
  SpendTrendBody,
  SpendTrendError,
} from '@/components/dashboard/spend-trend/SpendTrendBody';

type SpendTrendCardProps = {
  data: GetDashboardOverviewResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
};

export const SpendTrendCard = ({
  data,
  isLoading,
  isFetching,
  isError,
}: SpendTrendCardProps) => {
  const isPending = data === undefined && !isError;
  const showBusyOverlay =
    !isError && (isPending || isFetching || (isLoading && data !== undefined));
  const showDimmedChart = data !== undefined && showBusyOverlay;

  return (
    <Card aria-busy={showBusyOverlay} className="w-full gap-0 py-0">
      <CardHeader className="gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
        <CardTitle className="text-lg leading-tight">Spend trend</CardTitle>
        <CardDescription className="text-xs leading-normal">
          Month to date net spend vs the prior period
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3.5 py-4">
        {isError && data === undefined ? (
          <SpendTrendError />
        ) : (
          <div className="relative h-56 min-h-48 w-full">
            <div
              className={cn(
                showDimmedChart &&
                  'pointer-events-none opacity-50 motion-safe:transition-opacity'
              )}
            >
              <SpendTrendBody trend={data?.trend} isPending={isPending} />
            </div>
            {showBusyOverlay ? (
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
