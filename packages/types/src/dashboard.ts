export const DASHBOARD_OVERVIEW_GRAIN_VALUES = [
  'day',
  'week',
  'month',
] as const;

/** Calendar unit each trend point's `bucketStart` represents; weeks start on Monday. */
export type DashboardOverviewGrain =
  (typeof DASHBOARD_OVERVIEW_GRAIN_VALUES)[number];

/** Inclusive calendar dates (`yyyy-MM-dd`). */
export type CalendarDateRange = {
  from: string;
  to: string;
};
