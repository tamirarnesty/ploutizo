import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parse(value, CALENDAR_DATE_PATTERN, new Date());
  if (Number.isNaN(parsed.getTime())) return false;
  return toCalendarDate(parsed) === value;
};

const inclusiveDayCount = (from: string, to: string): number =>
  differenceInCalendarDays(parseCalendarDate(to), parseCalendarDate(from)) + 1;

const previousEqualLengthRange = (
  from: string,
  to: string
): DashboardOverviewRange => {
  const days = inclusiveDayCount(from, to);
  const priorTo = subDays(parseCalendarDate(from), 1);
  const priorFrom = subDays(priorTo, days - 1);
  return { from: toCalendarDate(priorFrom), to: toCalendarDate(priorTo) };
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

const resolveRolling30DayRange = (today: Date): RangedDashboardPeriod => {
  const to = toCalendarDate(today);
  const from = toCalendarDate(subDays(today, 29));
  return { from, to, bucket: 'day', prior: previousEqualLengthRange(from, to) };
};

/** Last six calendar months including the current partial month. */
const resolveSixMonthRange = (today: Date): RangedDashboardPeriod => ({
  from: toCalendarDate(startOfMonth(subMonths(today, 5))),
  to: toCalendarDate(today),
  bucket: 'month',
  prior: null,
});

const resolveCustomRange = (
  from: string,
  to: string
): RangedDashboardPeriod => ({
  from,
  to,
  bucket:
    inclusiveDayCount(from, to) <= CUSTOM_DAILY_BUCKET_MAX_DAYS
      ? 'day'
      : 'month',
  prior: null,
});

export const defaultDashboardPeriodSelection =
  (): DashboardPeriodSelection => ({
    kind: 'shortcut',
    shortcut: 'mtd',
  });

export const parseDashboardPeriodShortcut = (
  value: unknown
): DashboardPeriodShortcut | undefined => {
  if (typeof value !== 'string') return undefined;
  return (DASHBOARD_PERIOD_SHORTCUTS as readonly string[]).includes(value)
    ? (value as DashboardPeriodShortcut)
    : undefined;
};

export const parseDashboardPeriodSearch = (
  search: Record<string, unknown>
): DashboardPeriodSearch => {
  const range = parseDashboardPeriodShortcut(search.range);
  const from = typeof search.from === 'string' ? search.from : undefined;
  const to = typeof search.to === 'string' ? search.to : undefined;
  return { range, from, to };
};

export const selectionFromDashboardSearch = (
  search: DashboardPeriodSearch
): DashboardPeriodSelection | null => {
  const hasRange = search.range !== undefined;
  const hasFrom = search.from !== undefined;
  const hasTo = search.to !== undefined;

  if (hasRange && (hasFrom || hasTo)) {
    return null;
  }

  if (hasRange) {
    return { kind: 'shortcut', shortcut: search.range! };
  }

  if (hasFrom && hasTo) {
    if (!isCalendarDate(search.from!) || !isCalendarDate(search.to!)) {
      return null;
    }
    if (search.from! > search.to!) {
      return null;
    }
    return { kind: 'custom', from: search.from!, to: search.to! };
  }

  if (hasFrom || hasTo) {
    return null;
  }

  return null;
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
  if (selection.kind === 'shortcut' && selection.shortcut === 'all') {
    return { kind: 'all' };
  }

  const range =
    selection.kind === 'shortcut'
      ? selection.shortcut === 'mtd'
        ? resolveMonthToDateRange(today)
        : selection.shortcut === '30d'
          ? resolveRolling30DayRange(today)
          : selection.shortcut === '6m'
            ? resolveSixMonthRange(today)
            : selection.shortcut === 'ytd'
              ? resolveYearToDateRange(today)
              : (() => {
                  throw new Error(`Unhandled shortcut: ${selection.shortcut}`);
                })()
      : resolveCustomRange(selection.from, selection.to);

  return { kind: 'ranged', ...range };
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
export const eachCalendarMonthStart = (from: string, to: string): string[] => {
  const months: string[] = [];
  let cursor = startOfMonth(parseCalendarDate(from));
  const end = endOfMonth(parseCalendarDate(to));
  while (cursor <= end) {
    months.push(toCalendarDate(cursor));
    cursor = startOfMonth(addMonths(cursor, 1));
  }
  return months;
};
