import {
  resolveDashboardPeriod,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import { dashboardOverviewQueryOptions } from '@/lib/data-access/dashboard';
import { resolveEffectiveDashboardPeriod } from '@/lib/dashboard-period/effectiveDashboardPeriod';
import type { QueryClient } from '@tanstack/react-query';

export const preloadPersistedDashboardOverview = (
  queryClient: QueryClient,
  search: Record<string, unknown> = {}
) => {
  const today = toCalendarDate(new Date());
  const selection = resolveEffectiveDashboardPeriod(search);
  const resolved = resolveDashboardPeriod(
    selection,
    new Date(`${today}T12:00:00`)
  );
  return queryClient.ensureQueryData(dashboardOverviewQueryOptions(resolved));
};
