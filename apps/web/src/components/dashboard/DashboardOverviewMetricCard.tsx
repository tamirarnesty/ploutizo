import { CardContent } from '@ploutizo/ui/components/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ploutizo/ui/components/empty';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { cn } from '@ploutizo/ui/lib/utils';
import type { GetDashboardOverviewResponse } from '@ploutizo/validators';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { getDashboardQueryLiveState } from '@/components/dashboard/dashboardQueryLiveState';
import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

export type DashboardOverviewQueryState = Pick<
  UseQueryResult<GetDashboardOverviewResponse>,
  'data' | 'isError' | 'isFetching' | 'isPending'
>;

type DashboardOverviewMetricCardProps = {
  title: string;
  /** Lowercase noun phrase used in the loading and error messages, e.g. "spend trend". */
  label: string;
  query: DashboardOverviewQueryState;
  /** Extra header content (caption, toggle), rendered once data has loaded. */
  header?: (data: GetDashboardOverviewResponse) => ReactNode;
  /** True when the period has nothing to chart; the card then shows its empty state instead of `children`. */
  isEmpty: (data: GetDashboardOverviewResponse) => boolean;
  emptyIcon: ReactNode;
  children: (data: GetDashboardOverviewResponse) => ReactNode;
  className?: string;
};

/** Dashboard card for a metric from the period overview: loading overlay, error, and empty state. */
export const DashboardOverviewMetricCard = ({
  title,
  label,
  query,
  header,
  isEmpty,
  emptyIcon,
  children,
  className,
}: DashboardOverviewMetricCardProps) => {
  const { data } = query;
  const { showError, isBusy } = getDashboardQueryLiveState(query);

  return (
    <DashboardCard
      title={title}
      header={data && header ? header(data) : null}
      isBusy={isBusy}
      error={showError ? `Couldn’t load ${label}.` : undefined}
      className={className}
    >
      <CardContent className="flex flex-1 flex-col px-3.5 py-4">
        <div className="relative min-h-56 w-full flex-1">
          {data ? (
            <div
              className={cn(
                'h-full',
                isBusy &&
                  'pointer-events-none opacity-50 motion-safe:transition-opacity'
              )}
            >
              {isEmpty(data) ? (
                <Empty className="border-0 py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
                    <EmptyTitle>No spend in this period</EmptyTitle>
                    <EmptyDescription>
                      Expenses and refunds in this period will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                children(data)
              )}
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
      </CardContent>
    </DashboardCard>
  );
};
