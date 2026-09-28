import {
  dashboardSearchFromSelection,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSearch,
  DashboardPeriodSelection,
} from '@ploutizo/utils/dashboard-period';

const DEFAULT_DASHBOARD_PERIOD: DashboardPeriodSelection = {
  kind: 'shortcut',
  shortcut: 'mtd',
};

/** The dashboard's URL always names its period; `beforeLoad` redirects a bare URL to the persisted one. */
export const resolveEffectiveDashboardPeriod = (
  search: DashboardPeriodSearch
): DashboardPeriodSelection =>
  selectionFromDashboardSearch(search) ?? DEFAULT_DASHBOARD_PERIOD;

/** Search to redirect to when the URL names no period: the persisted period, else the default. */
export const dashboardPeriodRedirectSearch = (
  search: DashboardPeriodSearch,
  persisted: DashboardPeriodSelection | null
): DashboardPeriodSearch | null =>
  selectionFromDashboardSearch(search)
    ? null
    : dashboardSearchFromSelection(persisted ?? DEFAULT_DASHBOARD_PERIOD);
