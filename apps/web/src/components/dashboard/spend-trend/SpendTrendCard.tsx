import { CardAction, CardDescription } from '@ploutizo/ui/components/card';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import { DashboardOverviewMetricCard } from '@/components/dashboard/DashboardOverviewMetricCard';
import type { DashboardOverviewQuery } from '@/components/dashboard/DashboardOverviewMetricCard';
import { SpendTrendBody } from '@/components/dashboard/spend-trend/SpendTrendBody';
import {
  spendTrendCaption,
  spendTrendGrain,
  spendTrendModeLabel,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';
import { SPEND_TREND_MODES, isSpendTrendMode } from '@/lib/spend-trend-mode';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';
import { singleSelectToggle } from '@/lib/single-select-toggle';

type SpendTrendCardProps = {
  query: DashboardOverviewQuery;
  mode: SpendTrendMode;
  onModeChange: (mode: SpendTrendMode) => void;
  today: string;
  className?: string;
};

export const SpendTrendCard = ({
  query,
  mode,
  onModeChange,
  today,
  className,
}: SpendTrendCardProps) => (
  <DashboardOverviewMetricCard
    title="Spend trend"
    label="spend trend"
    query={query}
    className={className}
    header={(data) => (
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
            onValueChange={singleSelectToggle(isSpendTrendMode, onModeChange)}
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
    )}
  >
    {(data) => <SpendTrendBody overview={data} mode={mode} today={today} />}
  </DashboardOverviewMetricCard>
);
