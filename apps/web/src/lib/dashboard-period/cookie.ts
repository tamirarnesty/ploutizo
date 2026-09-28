import { createIsomorphicFn } from '@tanstack/react-start';
import type { DashboardPeriodSelection } from '@ploutizo/utils/dashboard-period';
import { getRequestDashboardPeriodCookie } from './cookie.server';
import {
  DASHBOARD_PERIOD_COOKIE,
  dashboardPeriodCookieFrom,
  parseDashboardPeriodCookie,
  serializeDashboardPeriodCookie,
} from './cookie-value';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The last period the viewer picked, readable on the server so the first render already uses it. */
export const readPersistedDashboardPeriod = createIsomorphicFn()
  .client(() =>
    parseDashboardPeriodCookie(dashboardPeriodCookieFrom(document.cookie))
  )
  .server(() => parseDashboardPeriodCookie(getRequestDashboardPeriodCookie()));

export const persistDashboardPeriod = (selection: DashboardPeriodSelection) => {
  document.cookie = `${DASHBOARD_PERIOD_COOKIE}=${serializeDashboardPeriodCookie(selection)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
};
