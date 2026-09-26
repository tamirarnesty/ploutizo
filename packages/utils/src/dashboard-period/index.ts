import {
  eachDayOfInterval,
  format,
  getDate,
  getDaysInMonth,
  parse,
  setDate,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { DashboardOverviewRange } from '@ploutizo/types';

const CALENDAR_DATE_PATTERN = 'yyyy-MM-dd';

export const toCalendarDate = (date: Date): string =>
  format(date, CALENDAR_DATE_PATTERN);

export const parseCalendarDate = (value: string): Date =>
  parse(value, CALENDAR_DATE_PATTERN, new Date());

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

export const eachCalendarDate = (from: string, to: string): string[] =>
  eachDayOfInterval({
    start: parseCalendarDate(from),
    end: parseCalendarDate(to),
  }).map(toCalendarDate);
