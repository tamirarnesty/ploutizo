import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { parseCalendarDate, toCalendarDate } from './resolve-period';
import type { PeriodGrain } from './types';

export const generatePeriodBucketStarts = (
  from: string,
  to: string,
  grain: PeriodGrain
): string[] => {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);

  if (grain === 'daily') {
    return eachDayOfInterval({ start, end }).map(toCalendarDate);
  }
  if (grain === 'weekly') {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((date) =>
      toCalendarDate(startOfWeek(date, { weekStartsOn: 1 }))
    );
  }
  return eachMonthOfInterval({ start, end }).map((date) =>
    toCalendarDate(startOfMonth(date))
  );
};
