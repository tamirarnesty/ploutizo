import { RotateCcw } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ploutizo/ui/components/tooltip';
import { cn } from '@ploutizo/ui/lib/utils';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import { DashboardPeriodSelector } from '@/components/dashboard/DashboardPeriodSelector';

type DashboardHeaderProps = {
  periodLabel: string;
  periodSelection: DashboardPeriodSelection;
  onSelectShortcut: (shortcut: DashboardPeriodShortcut) => void;
  onApplyCustomRange: (from: string, to: string) => void;
  onRefresh: () => void;
  /** True while any dashboard data is loading; disables Refresh. */
  isRefreshing: boolean;
};

/** One Refresh for the whole page — individual cards never own a refresh control. */
export const DashboardHeader = ({
  periodLabel,
  periodSelection,
  onSelectShortcut,
  onApplyCustomRange,
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Text as="h1" variant="h3" className="min-w-0 truncate">
      Dashboard
    </Text>
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <DashboardPeriodSelector
        selection={periodSelection}
        label={periodLabel}
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
    </div>
  </div>
);
