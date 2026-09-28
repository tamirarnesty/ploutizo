import { CalendarDays } from 'lucide-react';
import {
  DASHBOARD_PERIOD_SHORTCUTS,
  formatDashboardPeriodLabel,
  isDashboardPeriodShortcut,
  parseCalendarDate,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import { Button } from '@ploutizo/ui/components/button';
import {
  DateRangePicker,
  DateRangePickerApply,
  DateRangePickerCalendar,
  DateRangePickerCancel,
  DateRangePickerContent,
  DateRangePickerFooter,
  DateRangePickerTrigger,
} from '@ploutizo/ui/components/date-range-picker';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import type { CalendarDateRange } from '@ploutizo/types';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
  ResolvedDashboardPeriod,
} from '@ploutizo/utils/dashboard-period';
import { singleSelectToggle } from '@/lib/single-select-toggle';

const SHORTCUT_LABELS: Record<DashboardPeriodShortcut, string> = {
  mtd: 'MTD',
  '30d': '30d',
  '6m': '6m',
  ytd: 'YTD',
  all: 'All',
};

type DashboardPeriodSelectorProps = {
  selection: DashboardPeriodSelection;
  period: ResolvedDashboardPeriod;
  onSelectShortcut: (shortcut: DashboardPeriodShortcut) => void;
  onApplyCustomRange: (range: CalendarDateRange) => void;
};

export const DashboardPeriodSelector = ({
  selection,
  period,
  onSelectShortcut,
  onApplyCustomRange,
}: DashboardPeriodSelectorProps) => {
  const label = formatDashboardPeriodLabel(period);
  const activeShortcut =
    selection.kind === 'shortcut' ? selection.shortcut : undefined;

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={activeShortcut ? [activeShortcut] : []}
        onValueChange={singleSelectToggle(
          isDashboardPeriodShortcut,
          onSelectShortcut
        )}
      >
        {DASHBOARD_PERIOD_SHORTCUTS.map((shortcut) => (
          <ToggleGroupItem
            key={shortcut}
            value={shortcut}
            aria-label={SHORTCUT_LABELS[shortcut]}
            className="px-2.5 text-xs"
          >
            {SHORTCUT_LABELS[shortcut]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <DateRangePicker
        value={
          period.kind === 'ranged'
            ? {
                from: parseCalendarDate(period.from),
                to: parseCalendarDate(period.to),
              }
            : undefined
        }
        onApply={({ from, to }) =>
          onApplyCustomRange({
            from: toCalendarDate(from),
            to: toCalendarDate(to),
          })
        }
      >
        <DateRangePickerTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Custom period: ${label}`}
              className="max-w-[min(100%,14rem)] truncate"
            >
              <CalendarDays data-icon="inline-start" />
              {label}
            </Button>
          }
        />
        <DateRangePickerContent align="end">
          <DateRangePickerCalendar />
          <DateRangePickerFooter>
            <DateRangePickerCancel />
            <DateRangePickerApply />
          </DateRangePickerFooter>
        </DateRangePickerContent>
      </DateRangePicker>
    </div>
  );
};
