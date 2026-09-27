import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  getDate,
  getDaysInMonth,
  parse,
  setDate,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import type {
  DashboardOverviewBucket,
  DashboardOverviewRange,
} from '@ploutizo/types';

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

export type DashboardPeriodSearch = {
  range?: DashboardPeriodShortcut;
  from?: string;
  to?: string;
};

type RangedDashboardPeriod = DashboardOverviewRange & {
  bucket: DashboardOverviewBucket;
  /** Window compared against the current one, bucket by bucket; null when the period has no comparison. */
  prior: DashboardOverviewRange | null;
};

export type ResolvedDashboardPeriod =
  | { kind: 'all' }
  | ({ kind: 'ranged' } & RangedDashboardPeriod);

/** Custom ranges up to this many days chart daily; longer ones chart monthly. */
const CUSTOM_DAILY_BUCKET_MAX_DAYS = 62;

export const toCalendarDate = (date: Date): string =>
  format(date, CALENDAR_DATE_PATTERN);

export const parseCalendarDate = (value: string): Date =>
  parse(value, CALENDAR_DATE_PATTERN, new Date());

const isCalendarDate = (value: string): boolean => {
  const parsed = parseCalendarDate(value);
  return !Number.isNaN(parsed.getTime()) && toCalendarDate(parsed) === value;
};

/** Month to date through `today`, compared with the same days of the previous month (clamped to its length). */
export const resolveMonthToDateRange = (today: Date): RangedDashboardPeriod => {
  const priorMonth = startOfMonth(subMonths(today, 1));
  const priorTo = setDate(
    priorMonth,
    Math.min(getDate(today), getDaysInMonth(priorMonth))
  );
  return {
    from: toCalendarDate(startOfMonth(today)),
    to: toCalendarDate(today),
    bucket: 'day',
    prior: {
      from: toCalendarDate(priorMonth),
      to: toCalendarDate(priorTo),
    },
  };
};

/** Year to date through `today`, compared with the same days of the previous year. */
const resolveYearToDateRange = (today: Date): RangedDashboardPeriod => {
  const priorYear = subYears(today, 1);
  return {
    from: toCalendarDate(startOfYear(today)),
    to: toCalendarDate(today),
    bucket: 'day',
    prior: {
      from: toCalendarDate(startOfYear(priorYear)),
      to: toCalendarDate(priorYear),
    },
  };
};

/** Last 30 days through `today`, compared with the 30 days before them. */
const resolveRolling30DayRange = (today: Date): RangedDashboardPeriod => ({
  from: toCalendarDate(subDays(today, 29)),
  to: toCalendarDate(today),
  bucket: 'day',
  prior: {
    from: toCalendarDate(subDays(today, 59)),
    to: toCalendarDate(subDays(today, 30)),
  },
});

/** Last six calendar months including the current partial month. */
const resolveSixMonthRange = (today: Date): RangedDashboardPeriod => ({
  from: toCalendarDate(startOfMonth(subMonths(today, 5))),
  to: toCalendarDate(today),
  bucket: 'month',
  prior: null,
});

const SHORTCUT_RESOLVERS: Record<
  Exclude<DashboardPeriodShortcut, 'all'>,
  (today: Date) => RangedDashboardPeriod
> = {
  mtd: resolveMonthToDateRange,
  '30d': resolveRolling30DayRange,
  '6m': resolveSixMonthRange,
  ytd: resolveYearToDateRange,
};

const resolveCustomRange = (
  from: string,
  to: string
): RangedDashboardPeriod => ({
  from,
  to,
  bucket:
    differenceInCalendarDays(parseCalendarDate(to), parseCalendarDate(from)) <
    CUSTOM_DAILY_BUCKET_MAX_DAYS
      ? 'day'
      : 'month',
  prior: null,
});

const isDashboardPeriodShortcut = (
  value: unknown
): value is DashboardPeriodShortcut =>
  (DASHBOARD_PERIOD_SHORTCUTS as readonly unknown[]).includes(value);

export const parseDashboardPeriodSearch = (
  search: Record<string, unknown>
): DashboardPeriodSearch => {
  const range = isDashboardPeriodShortcut(search.range)
    ? search.range
    : undefined;
  const from = typeof search.from === 'string' ? search.from : undefined;
  const to = typeof search.to === 'string' ? search.to : undefined;
  return { range, from, to };
};

export const selectionFromDashboardSearch = (
  search: DashboardPeriodSearch
): DashboardPeriodSelection | null => {
  const { range, from, to } = search;
  if (range !== undefined) {
    return from === undefined && to === undefined
      ? { kind: 'shortcut', shortcut: range }
      : null;
  }
  if (
    from === undefined ||
    to === undefined ||
    !isCalendarDate(from) ||
    !isCalendarDate(to) ||
    from > to
  ) {
    return null;
  }
  return { kind: 'custom', from, to };
};

export const dashboardSearchFromSelection = (
  selection: DashboardPeriodSelection
): DashboardPeriodSearch => {
  if (selection.kind === 'shortcut') {
    return { range: selection.shortcut };
  }
  return { from: selection.from, to: selection.to };
};

export const resolveDashboardPeriod = (
  selection: DashboardPeriodSelection,
  today: Date
): ResolvedDashboardPeriod => {
  if (selection.kind === 'custom') {
    return {
      kind: 'ranged',
      ...resolveCustomRange(selection.from, selection.to),
    };
  }
  if (selection.shortcut === 'all') {
    return { kind: 'all' };
  }
  return { kind: 'ranged', ...SHORTCUT_RESOLVERS[selection.shortcut](today) };
};

export const formatDashboardPeriodLabel = (
  resolved: ResolvedDashboardPeriod
): string => {
  if (resolved.kind === 'all') {
    return 'All time';
  }

  const fromDate = parseCalendarDate(resolved.from);
  const toDate = parseCalendarDate(resolved.to);
  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const fromLabel = format(fromDate, sameYear ? 'MMM d' : 'MMM d, yyyy');
  const toLabel = format(toDate, 'MMM d, yyyy');
  return `${fromLabel} – ${toLabel}`;
};

export const eachCalendarDate = (from: string, to: string): string[] =>
  eachDayOfInterval({
    start: parseCalendarDate(from),
    end: parseCalendarDate(to),
  }).map(toCalendarDate);

/** Inclusive month starts from `from` through the month containing `to`. */
export const eachCalendarMonthStart = (from: string, to: string): string[] =>
  eachMonthOfInterval({
    start: parseCalendarDate(from),
    end: parseCalendarDate(to),
  }).map(toCalendarDate);
