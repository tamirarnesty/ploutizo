import { useMemo, useState } from 'react';
import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@ploutizo/ui/components/button';
import { Calendar } from '@ploutizo/ui/components/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ploutizo/ui/components/popover';
import type { DateRange } from 'react-day-picker';

// Period range picker — D-02 + D-19. Writes ?from / ?to to URL on selection.
// Presets panel (D-19 "Presets feature") appears to the left of the calendar.
// Does NOT re-fetch dashboard data — that's Phase 7.3.
const formatRangeLabel = (range: DateRange | undefined): string => {
  if (!range?.from) return 'Select period';
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  if (range.to) {
    const sameYear = range.from.getFullYear() === range.to.getFullYear();
    if (sameYear) {
      return `${fmt(range.from)} – ${fmt(range.to)}, ${range.to.getFullYear()}`;
    }
    return `${fmt(range.from)}, ${range.from.getFullYear()} – ${fmt(range.to)}, ${range.to.getFullYear()}`;
  }
  return `${fmt(range.from)}, ${range.from.getFullYear()}`;
};

const isoDate = (d: Date): string => d.toLocaleDateString('en-CA');

// Preset definitions — evaluated at call time so "today" is always current.
const getPresets = () => {
  const now = new Date();
  return [
    {
      label: 'This month',
      range: {
        from: startOfDay(startOfMonth(now)),
        to: endOfDay(endOfMonth(now)),
      },
    },
    {
      label: 'Last month',
      range: {
        from: startOfDay(startOfMonth(subMonths(now, 1))),
        to: endOfDay(endOfMonth(subMonths(now, 1))),
      },
    },
    {
      label: 'Last 30 days',
      range: { from: startOfDay(subDays(now, 29)), to: endOfDay(now) },
    },
    {
      label: 'Last 7 days',
      range: { from: startOfDay(subDays(now, 6)), to: endOfDay(now) },
    },
  ] as const;
};

export const PeriodRangePicker = () => {
  // Search params source: dashboard route only.
  const search = useSearch({ from: '/_layout/dashboard' });
  // useNavigate without `from` constraint avoids TanStack Router search reducer type narrowing issue.
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const calendarDayKey = new Date().toLocaleDateString('en-CA');
  const presets = useMemo(() => getPresets(), [calendarDayKey]);

  const range: DateRange | undefined =
    search.from || search.to
      ? {
          from: search.from ? new Date(search.from + 'T00:00:00') : undefined,
          to: search.to ? new Date(search.to + 'T00:00:00') : undefined,
        }
      : undefined;

  const handleSelect = (next: DateRange | undefined) => {
    void navigate({
      to: '/dashboard',
      search: {
        from: next?.from ? isoDate(next.from) : undefined,
        to: next?.to ? isoDate(next.to) : undefined,
      },
      replace: true,
    });
  };

  const handlePreset = (presetRange: { from: Date; to: Date }) => {
    void navigate({
      to: '/dashboard',
      search: {
        from: isoDate(presetRange.from),
        to: isoDate(presetRange.to),
      },
      replace: true,
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-9 gap-2 text-sm">
            <CalendarIcon className="size-4" aria-hidden="true" />
            <span className="min-w-0 truncate">{formatRangeLabel(range)}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="end">
        {/* D-19 Presets feature: vertical preset panel left of calendar */}
        <div className="flex">
          <div className="flex flex-col gap-1 border-r border-border p-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => handlePreset(preset.range)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
