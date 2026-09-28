import { dashboardPeriodSearchSchema } from '@ploutizo/validators';
import type { DashboardPeriodSearch } from '@ploutizo/utils/dashboard-period';

// The router merges this result over the raw search, so every period key is set, even when rejected.
const NO_PERIOD: Record<keyof DashboardPeriodSearch, undefined> = {
  range: undefined,
  from: undefined,
  to: undefined,
};

/** Mixed or invalid params read as no period, which the route redirects to the persisted one. */
export const validateDashboardSearch = (
  search: Record<string, unknown>
): DashboardPeriodSearch => ({
  ...NO_PERIOD,
  ...dashboardPeriodSearchSchema.safeParse(search).data,
});
