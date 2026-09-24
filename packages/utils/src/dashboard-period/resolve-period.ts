import {
  differenceInCalendarDays,
  format,
  getDate,
  getDaysInMonth,
  isValid,
  parse,
  setDate,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import type {
  DashboardPeriodRange,
  PeriodGrain,
  PeriodShortcut,
} from './types';

const CALENDAR_DATE_PATTERN = 'yyyy-MM-dd';

/** Inclusive day span used for grain selection (weekly threshold ≈ six months). */
const DAILY_GRAIN_MAX_INCLUSIVE_DAYS = 45;
const WEEKLY_GRAIN_MAX_INCLUSIVE_DAYS = 186;

export const toCalendarDate = (date: Date): string =>
  format(date, CALENDAR_DATE_PATTERN);

export const parseCalendarDate = (value: string): Date =>
  parse(value, CALENDAR_DATE_PATTERN, new Date());

export const isCalendarDateString = (value: string): boolean => {
  const parsed = parseCalendarDate(value);
  return isValid(parsed) && toCalendarDate(parsed) === value;
};

const clampCalendarDay = (monthAnchor: Date, dayOfMonth: number): Date => {
  const anchor = startOfMonth(monthAnchor);
  const safeDay = Math.min(dayOfMonth, getDaysInMonth(anchor));
  return setDate(anchor, safeDay);
};

const inclusiveDaySpan = (from: Date, to: Date): number =>
  differenceInCalendarDays(to, from) + 1;

const equalLengthPriorWindow = (
  from: Date,
  to: Date
): { priorFrom: Date; priorTo: Date } => {
  const spanDays = inclusiveDaySpan(from, to);
  const priorTo = subDays(from, 1);
  const priorFrom = subDays(priorTo, spanDays - 1);
  return { priorFrom, priorTo };
};

const monthToDatePriorWindow = (
  today: Date
): { priorFrom: Date; priorTo: Date } => {
  const priorFrom = startOfMonth(subMonths(today, 1));
  const priorTo = clampCalendarDay(subMonths(today, 1), getDate(today));
  return { priorFrom, priorTo };
};

const yearToDatePriorWindow = (
  today: Date
): { priorFrom: Date; priorTo: Date } => {
  const priorAnchor = subYears(today, 1);
  return {
    priorFrom: startOfYear(priorAnchor),
    priorTo: clampCalendarDay(priorAnchor, getDate(today)),
  };
};

export const derivePeriodGrain = (
  from: string,
  to: string,
  options?: { forceMonthly?: boolean }
): PeriodGrain => {
  if (options?.forceMonthly) {
    return 'monthly';
  }
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  const spanDays = inclusiveDaySpan(start, end);
  if (spanDays <= DAILY_GRAIN_MAX_INCLUSIVE_DAYS) {
    return 'daily';
  }
  if (spanDays <= WEEKLY_GRAIN_MAX_INCLUSIVE_DAYS) {
    return 'weekly';
  }
  return 'monthly';
};

const withGrain = (
  from: Date,
  to: Date,
  priorFrom: Date | null,
  priorTo: Date | null,
  grain: PeriodGrain
): DashboardPeriodRange => ({
  from: toCalendarDate(from),
  to: toCalendarDate(to),
  priorFrom: priorFrom ? toCalendarDate(priorFrom) : null,
  priorTo: priorTo ? toCalendarDate(priorTo) : null,
  grain,
});

export const resolvePeriodShortcut = (
  shortcut: PeriodShortcut,
  today: Date = new Date()
): DashboardPeriodRange => {
  if (shortcut === 'all') {
    return {
      from: null,
      to: null,
      priorFrom: null,
      priorTo: null,
      grain: 'monthly',
    };
  }

  if (shortcut === 'mtd') {
    const from = startOfMonth(today);
    const { priorFrom, priorTo } = monthToDatePriorWindow(today);
    return withGrain(
      from,
      today,
      priorFrom,
      priorTo,
      derivePeriodGrain(toCalendarDate(from), toCalendarDate(today))
    );
  }

  if (shortcut === 'ytd') {
    const from = startOfYear(today);
    const { priorFrom, priorTo } = yearToDatePriorWindow(today);
    return withGrain(
      from,
      today,
      priorFrom,
      priorTo,
      derivePeriodGrain(toCalendarDate(from), toCalendarDate(today), {
        forceMonthly: true,
      })
    );
  }

  if (shortcut === '30d') {
    const from = subDays(today, 29);
    const { priorFrom, priorTo } = equalLengthPriorWindow(from, today);
    return withGrain(
      from,
      today,
      priorFrom,
      priorTo,
      derivePeriodGrain(toCalendarDate(from), toCalendarDate(today))
    );
  }

  // 6m — last six calendar months including the current partial month
  const from = startOfMonth(subMonths(today, 5));
  const { priorFrom, priorTo } = equalLengthPriorWindow(from, today);
  return withGrain(
    from,
    today,
    priorFrom,
    priorTo,
    derivePeriodGrain(toCalendarDate(from), toCalendarDate(today))
  );
};

const isMonthToDateShape = (from: Date, to: Date): boolean =>
  toCalendarDate(from) === toCalendarDate(startOfMonth(to));

const isYearToDateShape = (from: Date, to: Date): boolean =>
  toCalendarDate(from) === toCalendarDate(startOfYear(to));

export const resolvePeriodFromCalendarDates = (
  fromValue: string,
  toValue: string
): DashboardPeriodRange | 'invalid' => {
  if (!isCalendarDateString(fromValue) || !isCalendarDateString(toValue)) {
    return 'invalid';
  }
  const from = parseCalendarDate(fromValue);
  const to = parseCalendarDate(toValue);
  if (from > to) {
    return 'invalid';
  }

  let priorFrom: Date;
  let priorTo: Date;
  if (isMonthToDateShape(from, to)) {
    ({ priorFrom, priorTo } = monthToDatePriorWindow(to));
  } else if (isYearToDateShape(from, to)) {
    ({ priorFrom, priorTo } = yearToDatePriorWindow(to));
  } else {
    ({ priorFrom, priorTo } = equalLengthPriorWindow(from, to));
  }

  const forceMonthly = isYearToDateShape(from, to);
  return withGrain(
    from,
    to,
    priorFrom,
    priorTo,
    derivePeriodGrain(fromValue, toValue, { forceMonthly })
  );
};

export type DashboardOverviewQueryRange =
  | { kind: 'all'; range: DashboardPeriodRange }
  | { kind: 'bounded'; range: DashboardPeriodRange };

/** API query: both dates omitted means All; one-sided or invalid dates are rejected. */
export const resolveOverviewQueryRange = (
  from: string | undefined,
  to: string | undefined
): DashboardOverviewQueryRange | 'invalid' => {
  const hasFrom = from !== undefined;
  const hasTo = to !== undefined;
  if (!hasFrom && !hasTo) {
    return { kind: 'all', range: resolvePeriodShortcut('all') };
  }
  if (!hasFrom || !hasTo) {
    return 'invalid';
  }
  const resolved = resolvePeriodFromCalendarDates(from, to);
  if (resolved === 'invalid') {
    return 'invalid';
  }
  return { kind: 'bounded', range: resolved };
};
