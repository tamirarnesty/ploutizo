import {
  dashboardSearchFromSelection,
  parseDashboardPeriodSearch,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodSearch } from '@ploutizo/utils/dashboard-period';

export const validateDashboardSearch = (
  search: Record<string, unknown>
): DashboardPeriodSearch => {
  const selection = selectionFromDashboardSearch(
    parseDashboardPeriodSearch(search)
  );
  return selection ? dashboardSearchFromSelection(selection) : {};
};
