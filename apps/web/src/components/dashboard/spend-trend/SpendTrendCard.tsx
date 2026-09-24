import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Skeleton } from '@ploutizo/ui/components/skeleton';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import {
  SpendTrendBody,
  SpendTrendError,
} from '@/components/dashboard/spend-trend/SpendTrendBody';

type SpendTrendCardProps = {
  data: GetDashboardOverviewResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

export const SpendTrendCard = ({
  data,
  isLoading,
  isError,
}: SpendTrendCardProps) => (
  <Card aria-busy={isLoading} className="w-full gap-0 py-0">
    <CardHeader className="gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
      <CardTitle className="text-lg leading-tight">Spend trend</CardTitle>
      <CardDescription className="text-xs leading-normal">
        Month to date net spend vs the prior period
      </CardDescription>
    </CardHeader>
    <CardContent className="px-3.5 py-4">
      {isError ? (
        <SpendTrendError />
      ) : isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg" />
      ) : (
        <SpendTrendBody trend={data?.trend} />
      )}
    </CardContent>
  </Card>
);
