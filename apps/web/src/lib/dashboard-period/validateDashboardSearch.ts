import { dashboardPeriodSearchSchema } from '@ploutizo/validators';
import type { DashboardPeriodSearch } from '@ploutizo/utils/dashboard-period';
import { isSpendTrendMode } from '@/lib/spend-trend-mode';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';

/** Dashboard URL search: the period and the spend trend's mode. */
export type DashboardSearch = DashboardPeriodSearch & {
  trend?: SpendTrendMode;
};

// The router merges this result over the raw search, so every key is set, even when rejected.
const NO_PERIOD: Record<keyof DashboardPeriodSearch, undefined> = {
  range: undefined,
  from: undefined,
  to: undefined,
};

/**
 * Mixed or invalid period params read as no period, and an unknown mode as no mode; the route redirects either
 * to the persisted one. Each is read on its own, so a bad one never drops the other.
 */
export const validateDashboardSearch = (
  search: Record<string, unknown>
): DashboardSearch => ({
  ...NO_PERIOD,
  ...dashboardPeriodSearchSchema.safeParse(search).data,
  trend:
    typeof search.trend === 'string' && isSpendTrendMode(search.trend)
      ? search.trend
      : undefined,
});
