import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { Text } from '@ploutizo/ui/components/text';
import { cn } from '@ploutizo/ui/lib/utils';
import type { GetDashboardOverviewResponse } from '@ploutizo/validators';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

export type DashboardOverviewQuery = Pick<
  UseQueryResult<GetDashboardOverviewResponse>,
  'data' | 'isError' | 'isFetching'
>;

type DashboardOverviewMetricCardProps = {
  title: string;
  /** Lowercase noun phrase used in the loading and error messages, e.g. "spend trend". */
  label: string;
  query: DashboardOverviewQuery;
  /** Extra header content (caption, toggle), rendered once data has loaded. */
  header?: (data: GetDashboardOverviewResponse) => ReactNode;
  children: (data: GetDashboardOverviewResponse) => ReactNode;
  className?: string;
};

export const DashboardOverviewMetricCard = ({
  title,
  label,
  query: { data, isError, isFetching },
  header,
  children,
  className,
}: DashboardOverviewMetricCardProps) => {
  // A failed refetch keeps cached data on screen; only a settled failed first load shows the error.
  const showError = isError && data === undefined && !isFetching;
  const isBusy = !showError && (isFetching || data === undefined);

  return (
    <Card aria-busy={isBusy} className={cn('w-full gap-0 py-0', className)}>
      <CardHeader className="gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
        {data && header ? header(data) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-3.5 py-4">
        {showError ? (
          <Text
            variant="caption"
            role="alert"
            className="px-3.5 py-6 text-muted-foreground"
          >
            Couldn’t load {label}.
          </Text>
        ) : (
          <div className="relative min-h-56 w-full flex-1">
            {data ? (
              <div
                className={cn(
                  'h-full',
                  isBusy &&
                    'pointer-events-none opacity-50 motion-safe:transition-opacity'
                )}
              >
                {children(data)}
              </div>
            ) : null}
            {isBusy ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="sr-only" role="status">
                  Loading {label}
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
