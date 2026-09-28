import {
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  isLastDayOfMonth,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import type {
  CalendarDateRange,
  DashboardOverviewGrain,
} from '@ploutizo/types';
import type { Interval } from 'date-fns';

const CALENDAR_DATE_PATTERN = 'yyyy-MM-dd';

export const DASHBOARD_PERIOD_SHORTCUTS = [
  'mtd',
  '30d',
  '6m',
  'ytd',
  'all',
] as const;

export type DashboardPeriodShortcut =
  (typeof DASHBOARD_PERIOD_SHORTCUTS)[number];

export type DashboardPeriodSelection =
  | { kind: 'shortcut'; shortcut: DashboardPeriodShortcut }
  | { kind: 'custom'; from: string; to: string };

/** Opened when neither the URL nor the viewer's last visit names a period. */
export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriodSelection = {
  kind: 'shortcut',
  shortcut: 'mtd',
};

/** Validated dashboard search: a shortcut, a custom range, or nothing (redirected to the persisted period). */
export type DashboardPeriodSearch = {
  range?: DashboardPeriodShortcut;
  from?: string;
  to?: string;
};

/** Calendar dates to chart; All has none and covers the household's whole history. */
export type ResolvedDashboardPeriod =
  | { kind: 'all' }
  | ({ kind: 'ranged' } & CalendarDateRange);

export const toCalendarDate = (date: Date): string =>
  format(date, CALENDAR_DATE_PATTERN);

export const parseCalendarDate = (value: string): Date =>
  parse(value, CALENDAR_DATE_PATTERN, new Date());

export const isDashboardPeriodShortcut = (
  value: string
): value is DashboardPeriodShortcut =>
  (DASHBOARD_PERIOD_SHORTCUTS as readonly string[]).includes(value);

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

type GrainCalendar = {
  startOf: (date: Date) => Date;
  endOf: (date: Date) => Date;
  each: (interval: Interval) => Date[];
};

const GRAIN_CALENDARS: Record<DashboardOverviewGrain, GrainCalendar> = {
  day: {
    startOf: (date) => date,
    endOf: (date) => date,
    each: (interval) => eachDayOfInterval(interval),
  },
  week: {
    startOf: (date) => startOfWeek(date, WEEK_OPTIONS),
    endOf: (date) => endOfWeek(date, WEEK_OPTIONS),
    each: (interval) => eachWeekOfInterval(interval, WEEK_OPTIONS),
  },
  month: {
    startOf: startOfMonth,
    endOf: endOfMonth,
    each: (interval) => eachMonthOfInterval(interval),
  },
};

/** Start of every bucket the range touches; the first can start before `from`. */
export const bucketStartsIn = (
  { from, to }: CalendarDateRange,
  grain: DashboardOverviewGrain
): string[] =>
  GRAIN_CALENDARS[grain]
    .each({ start: parseCalendarDate(from), end: parseCalendarDate(to) })
    .map(toCalendarDate);

/** First and last calendar date of the bucket containing `date`. */
export const bucketBounds = (
  date: string,
  grain: DashboardOverviewGrain
): CalendarDateRange => {
  const parsed = parseCalendarDate(date);
  const calendar = GRAIN_CALENDARS[grain];
  return {
    from: toCalendarDate(calendar.startOf(parsed)),
    to: toCalendarDate(calendar.endOf(parsed)),
  };
};

const DAILY_MAX_DAYS = 45;
const WEEKLY_MAX_MONTHS = 6;

/** Daily up to 45 days, weekly within six months, monthly beyond. */
export const dashboardRangeGrain = ({
  from,
  to,
}: CalendarDateRange): DashboardOverviewGrain => {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  if (differenceInCalendarDays(end, start) + 1 <= DAILY_MAX_DAYS) {
    return 'day';
  }
  return end < addMonths(start, WEEKLY_MAX_MONTHS) ? 'week' : 'month';
};

/**
 * The window just before the range. A range starting on the 1st steps back whole calendar months, keeping its
 * end day (clamped to shorter months, and month-end to month-end); any other range steps back its own length.
 */
export const dashboardPriorRange = ({
  from,
  to,
}: CalendarDateRange): CalendarDateRange => {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  if (getDate(start) === 1) {
    const months = differenceInCalendarMonths(end, start) + 1;
    const priorEnd = isLastDayOfMonth(end)
      ? endOfMonth(subMonths(end, months))
      : subMonths(end, months);
    return {
      from: toCalendarDate(subMonths(start, months)),
      to: toCalendarDate(priorEnd),
    };
  }
  const days = differenceInCalendarDays(end, start) + 1;
  return {
    from: toCalendarDate(subDays(start, days)),
    to: toCalendarDate(subDays(start, 1)),
  };
};

const SHORTCUT_RANGES: Record<
  Exclude<DashboardPeriodShortcut, 'all'>,
  (today: Date) => Date
> = {
  mtd: (today) => startOfMonth(today),
  '30d': (today) => subDays(today, 29),
  '6m': (today) => startOfMonth(subMonths(today, 5)),
  ytd: (today) => startOfYear(today),
};

/** Shortcuts roll with `today`, each ending on it; custom ranges keep their dates. */
export const resolveDashboardPeriod = (
  selection: DashboardPeriodSelection,
  today: Date
): ResolvedDashboardPeriod => {
  if (selection.kind === 'custom') {
    return { kind: 'ranged', from: selection.from, to: selection.to };
  }
  if (selection.shortcut === 'all') {
    return { kind: 'all' };
  }
  return {
    kind: 'ranged',
    from: toCalendarDate(SHORTCUT_RANGES[selection.shortcut](today)),
    to: toCalendarDate(today),
  };
};

export const selectionFromDashboardSearch = ({
  range,
  from,
  to,
}: DashboardPeriodSearch): DashboardPeriodSelection | null => {
  if (range !== undefined) {
    return { kind: 'shortcut', shortcut: range };
  }
  if (from !== undefined && to !== undefined) {
    return { kind: 'custom', from, to };
  }
  return null;
};

export const dashboardSearchFromSelection = (
  selection: DashboardPeriodSelection
): DashboardPeriodSearch =>
  selection.kind === 'shortcut'
    ? { range: selection.shortcut }
    : { from: selection.from, to: selection.to };

export const formatCalendarDateRange = ({
  from,
  to,
}: CalendarDateRange): string => {
  const fromDate = parseCalendarDate(from);
  const toDate = parseCalendarDate(to);
  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const fromLabel = format(fromDate, sameYear ? 'MMM d' : 'MMM d, yyyy');
  const toLabel = format(toDate, 'MMM d, yyyy');
  return `${fromLabel} – ${toLabel}`;
};

export const formatDashboardPeriodLabel = (
  resolved: ResolvedDashboardPeriod
): string =>
  resolved.kind === 'all' ? 'All time' : formatCalendarDateRange(resolved);
