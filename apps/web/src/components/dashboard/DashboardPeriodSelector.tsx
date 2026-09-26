import { CalendarDays } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_PERIOD_SHORTCUTS } from '@ploutizo/utils/dashboard-period';
import { Button } from '@ploutizo/ui/components/button';
import { Calendar } from '@ploutizo/ui/components/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@ploutizo/ui/components/toggle-group';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import type { DateRange } from 'react-day-picker';

const SHORTCUT_LABELS: Record<DashboardPeriodShortcut, string> = {
  mtd: 'MTD',
  '30d': '30d',
  '6m': '6m',
  ytd: 'YTD',
  all: 'All',
};

type DashboardPeriodSelectorProps = {
  selection: DashboardPeriodSelection;
  label: string;
  onSelectShortcut: (shortcut: DashboardPeriodShortcut) => void;
  onApplyCustomRange: (from: string, to: string) => void;
};

const committedCustomRange = (
  selection: DashboardPeriodSelection
): DateRange | undefined => {
  if (selection.kind !== 'custom') {
    return undefined;
  }
  const from = parseISO(selection.from);
  const to = parseISO(selection.to);
  if (!isValid(from) || !isValid(to)) {
    return undefined;
  }
  return { from, to };
};

export const DashboardPeriodSelector = ({
  selection,
  label,
  onSelectShortcut,
  onApplyCustomRange,
}: DashboardPeriodSelectorProps) => {
  const [open, setOpen] = useState(false);
  const committed = committedCustomRange(selection);
  const [pending, setPending] = useState<DateRange | undefined>(committed);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setPending(committed);
    }
    prevOpen.current = open;
  }, [open, committed]);

  const activeShortcut =
    selection.kind === 'shortcut' ? selection.shortcut : undefined;

  const handleApply = () => {
    const from = pending?.from ? format(pending.from, 'yyyy-MM-dd') : '';
    const to = pending?.to ? format(pending.to, 'yyyy-MM-dd') : '';
    if (!from || !to || from > to) {
      return;
    }
    onApplyCustomRange(from, to);
    setOpen(false);
  };

  const handleCancel = () => {
    setPending(committed);
    setOpen(false);
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        value={activeShortcut ? [activeShortcut] : []}
        onValueChange={(values) => {
          const shortcut = values.at(-1);
          if (!shortcut) return;
          onSelectShortcut(shortcut as DashboardPeriodShortcut);
        }}
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
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
        <PopoverContent className="w-auto p-0" align="end" side="bottom">
          <Calendar
            mode="range"
            selected={pending}
            onSelect={setPending}
            numberOfMonths={2}
          />
          <div className="flex justify-end gap-2 border-t border-border px-3 py-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
