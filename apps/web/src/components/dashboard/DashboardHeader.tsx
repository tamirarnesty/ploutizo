import { RotateCcw } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';
import type { CalendarDateRange } from '@ploutizo/types';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
  ResolvedDashboardPeriod,
} from '@ploutizo/utils/dashboard-period';
import { PageHeader } from '@/components/PageHeader';
import { DashboardPeriodSelector } from '@/components/dashboard/DashboardPeriodSelector';

type DashboardHeaderProps = {
  periodSelection: DashboardPeriodSelection;
  period: ResolvedDashboardPeriod;
  onSelectShortcut: (shortcut: DashboardPeriodShortcut) => void;
  onApplyCustomRange: (range: CalendarDateRange) => void;
  onRefresh: () => void;
  /** True while any dashboard data is loading; disables Refresh. */
  isRefreshing: boolean;
};

/** One Refresh for the whole page — individual cards never own a refresh control. */
export const DashboardHeader = ({
  periodSelection,
  period,
  onSelectShortcut,
  onApplyCustomRange,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) => (
  <PageHeader
    title="Dashboard"
    actions={
      <>
        <DashboardPeriodSelector
          selection={periodSelection}
          period={period}
          onSelectShortcut={onSelectShortcut}
          onApplyCustomRange={onApplyCustomRange}
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Refresh"
                className="shrink-0"
                // Keeps hover and focus while disabled, so the tooltip still shows.
                focusableWhenDisabled
                disabled={isRefreshing}
                onClick={onRefresh}
              />
            }
          >
            {/* Reverse spin so the counter-clockwise arrow turns the way it points. */}
            <RotateCcw
              className={cn(
                isRefreshing &&
                  'motion-safe:animate-spin motion-safe:[animation-direction:reverse]'
              )}
            />
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      </>
    }
  />
);
