import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
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
  const isInitialLoad = isLoading && data === undefined;
  const showBusyOverlay =
    !isError && !isInitialLoad && (isFetching || (isLoading && data != null));

  return (
    <Card aria-busy={isLoading || isFetching} className="w-full gap-0 py-0">
      <CardHeader className="gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
        <CardTitle className="text-lg leading-tight">Spend trend</CardTitle>
        <CardDescription className="text-xs leading-normal">
          Month to date net spend vs the prior period
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3.5 py-4">
        {isError ? (
          <SpendTrendError />
        ) : (
          <div className="relative min-h-48 w-full">
            {isInitialLoad ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <>
                <div
                  className={cn(
                    showBusyOverlay &&
                      'pointer-events-none opacity-50 motion-safe:transition-opacity'
                  )}
                >
                  <SpendTrendBody trend={data?.trend} />
                </div>
                {showBusyOverlay ? (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    aria-hidden
                  >
                    <Spinner className="size-6 text-muted-foreground" />
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
