import { isSameMonth, isSameYear, startOfDay, startOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { DashboardSearch } from '@/components/dashboard/dashboardSearch';

/** Local calendar date string (YYYY-MM-DD) — matches existing dashboard URL encoding. */
export const isoDate = (d: Date): string => d.toLocaleDateString('en-CA');

/** Month-to-date: first day of current month through today (inclusive). */
export const getDefaultDashboardRange = (now: Date) => ({
  from: startOfDay(startOfMonth(now)),
  to: startOfDay(now),
});

export const formatDashboardTitle = (from: Date, to: Date): string => {
  if (isSameMonth(from, to) && isSameYear(from, to)) {
    return from.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  }
  if (isSameYear(from, to)) {
    const start = from.toLocaleDateString('en-CA', { month: 'long' });
    const end = to.toLocaleDateString('en-CA', { month: 'long' });
    return `${start} – ${end} ${to.getFullYear()}`;
  }
  return `${from.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} – ${to.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

/** Effective range: URL if present, otherwise default MTD. */
export const parseSearchToDashboardRange = (
  from: string | undefined,
  to: string | undefined,
  now: Date
): { from: Date; to: Date } => {
  const def = getDefaultDashboardRange(now);
  if (!from && !to) return def;
  const fromDate = from ? new Date(`${from}T00:00:00`) : def.from;
  const toDate = to ? new Date(`${to}T00:00:00`) : fromDate;
  return { from: fromDate, to: toDate };
};

export const urlSearchMatchesDefaultDashboardPeriod = (
  from: string | undefined,
  to: string | undefined,
  now: Date
): boolean => {
  if (!from || !to) return false;
  const def = getDefaultDashboardRange(now);
  return from === isoDate(def.from) && to === isoDate(def.to);
};

export const buildDashboardSearchFromClosedRange = (
  rangeFrom: Date,
  rangeTo: Date,
  now: Date
): DashboardSearch => {
  const def = getDefaultDashboardRange(now);
  if (
    isoDate(rangeFrom) === isoDate(def.from) &&
    isoDate(rangeTo) === isoDate(def.to)
  ) {
    return { from: undefined, to: undefined };
  }
  return { from: isoDate(rangeFrom), to: isoDate(rangeTo) };
};

export const buildDashboardSearchFromCalendarSelection = (
  next: DateRange | undefined,
  now: Date
): DashboardSearch => {
  if (!next?.from) {
    return { from: undefined, to: undefined };
  }
  if (!next.to) {
    return { from: isoDate(next.from), to: undefined };
  }
  return buildDashboardSearchFromClosedRange(next.from, next.to, now);
};
