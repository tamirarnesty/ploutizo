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
import type { DashboardOverviewRange } from '@ploutizo/types';

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

export type ResolvedDashboardPeriod =
  | { kind: 'all' }
  | {
      kind: 'ranged';
      from: string;
      to: string;
      priorFrom: string;
      priorTo: string;
    };

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

const resolveEqualLengthPrior = (
  from: string,
  to: string
): Pick<DashboardOverviewRange, 'priorFrom' | 'priorTo'> => {
  const days = inclusiveDayCount(from, to);
  const priorTo = subDays(parseCalendarDate(from), 1);
  const priorFrom = subDays(priorTo, days - 1);
  return {
    priorFrom: toCalendarDate(priorFrom),
    priorTo: toCalendarDate(priorTo),
  };
};

/** Month to date through `today`, compared with the same days of the previous month (clamped to its length). */
export const resolveMonthToDateRange = (
  today: Date
): DashboardOverviewRange => {
  const priorMonth = startOfMonth(subMonths(today, 1));
  const priorTo = setDate(
    priorMonth,
    Math.min(getDate(today), getDaysInMonth(priorMonth))
  );
  return {
    from: toCalendarDate(startOfMonth(today)),
    to: toCalendarDate(today),
    priorFrom: toCalendarDate(priorMonth),
    priorTo: toCalendarDate(priorTo),
  };
};

const resolveYearToDateRange = (today: Date): DashboardOverviewRange => {
  const priorYear = subYears(today, 1);
  const priorTo = setDate(
    priorYear,
    Math.min(getDate(today), getDaysInMonth(priorYear))
  );
  return {
    from: toCalendarDate(startOfYear(today)),
    to: toCalendarDate(today),
    priorFrom: toCalendarDate(startOfYear(priorYear)),
    priorTo: toCalendarDate(priorTo),
  };
};

const resolveRolling30DayRange = (today: Date): DashboardOverviewRange => {
  const to = toCalendarDate(today);
  const from = toCalendarDate(subDays(today, 29));
  return { from, to, ...resolveEqualLengthPrior(from, to) };
};

/** Last six calendar months including the current partial month. */
const resolveSixMonthRange = (today: Date): DashboardOverviewRange => {
  const to = toCalendarDate(today);
  const from = toCalendarDate(startOfMonth(subMonths(today, 5)));
  return { from, to, ...resolveEqualLengthPrior(from, to) };
};

const resolveCustomRange = (
  from: string,
  to: string
): DashboardOverviewRange => ({
  from,
  to,
  ...resolveEqualLengthPrior(from, to),
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

  return {
    kind: 'ranged',
    from: range.from,
    to: range.to,
    priorFrom: range.priorFrom,
    priorTo: range.priorTo,
  };
};

export const formatDashboardPeriodLabel = (
  selection: DashboardPeriodSelection,
  today: Date
): string => {
  if (selection.kind === 'shortcut') {
    const labels: Record<DashboardPeriodShortcut, string> = {
      mtd: 'MTD',
      '30d': '30d',
      '6m': '6m',
      ytd: 'YTD',
      all: 'All',
    };
    return labels[selection.shortcut];
  }

  const resolved = resolveDashboardPeriod(selection, today);
  if (resolved.kind === 'all') {
    return 'All';
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
