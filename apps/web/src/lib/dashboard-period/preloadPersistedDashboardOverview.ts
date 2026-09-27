import { resolveDashboardPeriod } from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodSearch } from '@ploutizo/utils/dashboard-period';
import { dashboardOverviewQueryOptions } from '@/lib/data-access/dashboard';
import { resolveEffectiveDashboardPeriod } from '@/lib/dashboard-period/effectiveDashboardPeriod';
import type { QueryClient } from '@tanstack/react-query';

export const preloadPersistedDashboardOverview = (
  queryClient: QueryClient,
  search: DashboardPeriodSearch = {}
) =>
  queryClient.ensureQueryData(
    dashboardOverviewQueryOptions(
      resolveDashboardPeriod(
        resolveEffectiveDashboardPeriod(search),
        new Date()
      )
    )
  );
