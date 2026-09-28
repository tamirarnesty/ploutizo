import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ploutizo/ui/components/card';
import { Spinner } from '@ploutizo/ui/components/spinner';
import { Text } from '@ploutizo/ui/components/text';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import { cn } from '@ploutizo/ui/lib/utils';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
import { SpendTrendBody } from '@/components/dashboard/spend-trend/SpendTrendBody';
import {
  spendTrendCaption,
  spendTrendGrain,
  spendTrendModeLabel,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import { SPEND_TREND_MODES, isSpendTrendMode } from '@/lib/spend-trend-mode';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';
import type { UseQueryResult } from '@tanstack/react-query';

type SpendTrendCardProps = {
  query: Pick<
    UseQueryResult<GetDashboardOverviewResponse>,
    'data' | 'isError' | 'isFetching'
  >;
  mode: SpendTrendMode;
  onModeChange: (mode: SpendTrendMode) => void;
  today: string;
};

export const SpendTrendCard = ({
  query: { data, isError, isFetching },
  mode,
  onModeChange,
  today,
}: SpendTrendCardProps) => {
  // A failed refetch keeps cached data on screen; only a settled failed first load shows the error.
  const showError = isError && data === undefined && !isFetching;
  const isBusy = !showError && (isFetching || data === undefined);

  return (
    <Card aria-busy={isBusy} className="w-full gap-0 py-0">
      <CardHeader className="gap-y-1 border-b border-border px-3.5 pt-3 [.border-b]:pb-3">
        <CardTitle className="text-lg leading-tight">Spend trend</CardTitle>
        {data ? (
          <>
            {/* Spans under the toggle too, so it only wraps when the card is narrow. */}
            <CardDescription className="col-span-full text-xs leading-normal">
              {spendTrendCaption(data.meta, mode)}
            </CardDescription>
            <CardAction className="row-span-1 self-center">
              <ToggleGroup
                aria-label="Spend trend mode"
                variant="outline"
                size="sm"
                spacing={0}
                value={[mode]}
                onValueChange={(values) => {
                  // Clicking the active option emits no value; keep the mode.
                  const next = values.at(-1);
                  if (isSpendTrendMode(next)) {
                    onModeChange(next);
                  }
                }}
              >
                {SPEND_TREND_MODES.map((option) => (
                  <ToggleGroupItem
                    key={option}
                    value={option}
                    className="px-2.5 text-xs"
                  >
                    {spendTrendModeLabel(option, spendTrendGrain(data.meta))}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </CardAction>
          </>
        ) : null}
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
                <SpendTrendBody overview={data} mode={mode} today={today} />
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
