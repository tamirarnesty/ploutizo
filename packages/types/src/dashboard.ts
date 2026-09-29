/** Calendar unit each trend point's `bucketStart` represents; weeks start on Monday. */
export type DashboardOverviewGrain = 'day' | 'week' | 'month';

/** Inclusive calendar dates (`yyyy-MM-dd`). */
export type CalendarDateRange = {
  from: string;
  to: string;
};
