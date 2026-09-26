import { z } from 'zod';
import {
  DASHBOARD_PERIOD_SHORTCUTS,
  dashboardSearchFromSelection,
  parseDashboardPeriodSearch,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodSearch } from '@ploutizo/utils/dashboard-period';

const dashboardPeriodSearchSchema = z.object({
  range: z.enum(DASHBOARD_PERIOD_SHORTCUTS).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const validateDashboardSearch = (
  search: Record<string, unknown>
): DashboardPeriodSearch => {
  const parsed = dashboardPeriodSearchSchema.safeParse(search);
  if (!parsed.success) {
    return {};
  }

  const normalized = parseDashboardPeriodSearch(parsed.data);
  const selection = selectionFromDashboardSearch(normalized);
  if (!selection) {
    return {};
  }

  return dashboardSearchFromSelection(selection);
};
