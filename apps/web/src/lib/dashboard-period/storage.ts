import {
  dashboardSearchFromSelection,
  parseDashboardPeriodSearch,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodSelection } from '@ploutizo/utils/dashboard-period';

export const DASHBOARD_PERIOD_STORAGE_KEY = 'ploutizo:dashboard-period';

/** Stored in URL search shape so it is read back through the same validation as the URL. */
export const readPersistedDashboardPeriod =
  (): DashboardPeriodSelection | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = window.localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const value = JSON.parse(raw) as unknown;
      if (!value || typeof value !== 'object') {
        return null;
      }
      return selectionFromDashboardSearch(
        parseDashboardPeriodSearch(value as Record<string, unknown>)
      );
    } catch {
      return null;
    }
  };

export const persistDashboardPeriod = (selection: DashboardPeriodSelection) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    DASHBOARD_PERIOD_STORAGE_KEY,
    JSON.stringify(dashboardSearchFromSelection(selection))
  );
};
