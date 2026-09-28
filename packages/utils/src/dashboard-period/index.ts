import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isLastDayOfMonth,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  sub,
  subDays,
} from 'date-fns';
import type {
  CalendarDateRange,
  DashboardOverviewGrain,
} from '@ploutizo/types';
import type { Duration, Interval } from 'date-fns';

const CALENDAR_DATE_PATTERN = 'yyyy-MM-dd';

/** Shortcuts that resolve to dates; the API also takes one to choose the **prior period**. */
export const DASHBOARD_RANGED_SHORTCUTS = ['mtd', '30d', '6m', 'ytd'] as const;

export type DashboardRangedShortcut =
  (typeof DASHBOARD_RANGED_SHORTCUTS)[number];

export const DASHBOARD_PERIOD_SHORTCUTS = [
  ...DASHBOARD_RANGED_SHORTCUTS,
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

/**
 * Calendar dates to chart, and the shortcut they came from (null for a custom range), which picks the prior
 * period; the same dates can come from different shortcuts, such as MTD and YTD in January. All has no dates and
 * covers the household's whole history.
 */
export type ResolvedDashboardPeriod =
  | { kind: 'all' }
  | ({
      kind: 'ranged';
      shortcut: DashboardRangedShortcut | null;
    } & CalendarDateRange);

export const toCalendarDate = (date: Date): string =>
  format(date, CALENDAR_DATE_PATTERN);

export const parseCalendarDate = (value: string): Date =>
  parse(value, CALENDAR_DATE_PATTERN, new Date());

export const isDashboardPeriodShortcut = (
  value: string
): value is DashboardPeriodShortcut =>
  (DASHBOARD_PERIOD_SHORTCUTS as readonly string[]).includes(value);

export const isDashboardRangedShortcut = (
  value: string
): value is DashboardRangedShortcut =>
  (DASHBOARD_RANGED_SHORTCUTS as readonly string[]).includes(value);

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

/** To-date shortcuts compare with the same stretch one calendar step earlier. */
const TO_DATE_STEPS: Partial<Record<DashboardRangedShortcut, Duration>> = {
  mtd: { months: 1 },
  '6m': { months: 6 },
  ytd: { years: 1 },
};

/**
 * The window the range is compared against. MTD, 6m, and YTD compare with the same stretch a month, six months,
 * or a year earlier: the end day clamps to a shorter month, and a month-end maps to month-end. 30d and custom
 * ranges compare with the equal-length window just before them.
 */
export const dashboardPriorRange = (
  { from, to }: CalendarDateRange,
  shortcut: DashboardRangedShortcut | null
): CalendarDateRange => {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  const step = shortcut ? TO_DATE_STEPS[shortcut] : undefined;
  if (step) {
    const priorEnd = isLastDayOfMonth(end)
      ? endOfMonth(sub(end, step))
      : sub(end, step);
    return {
      from: toCalendarDate(sub(start, step)),
      to: toCalendarDate(priorEnd),
    };
  }
  const days = differenceInCalendarDays(end, start) + 1;
  return {
    from: toCalendarDate(subDays(start, days)),
    to: toCalendarDate(subDays(start, 1)),
  };
};

const SHORTCUT_RANGES: Record<DashboardRangedShortcut, (today: Date) => Date> =
  {
    mtd: (today) => startOfMonth(today),
    '30d': (today) => subDays(today, 29),
    '6m': (today) => startOfMonth(sub(today, { months: 5 })),
    ytd: (today) => startOfYear(today),
  };

/** Shortcuts roll with `today`, each ending on it; custom ranges keep their dates. */
export const resolveDashboardPeriod = (
  selection: DashboardPeriodSelection,
  today: Date
): ResolvedDashboardPeriod => {
  if (selection.kind === 'custom') {
    return {
      kind: 'ranged',
      shortcut: null,
      from: selection.from,
      to: selection.to,
    };
  }
  if (selection.shortcut === 'all') {
    return { kind: 'all' };
  }
  return {
    kind: 'ranged',
    shortcut: selection.shortcut,
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
