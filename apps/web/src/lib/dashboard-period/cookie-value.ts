import {
  parseDashboardPeriodSearch,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type { DashboardPeriodSelection } from '@ploutizo/utils/dashboard-period';

export const DASHBOARD_PERIOD_COOKIE = 'dashboard_period';

// A shortcut (`6m`) or `from_to` dates: only characters that need no cookie encoding, so the value reads back
// the same however many times the server or browser decodes it.
export const serializeDashboardPeriodCookie = (
  selection: DashboardPeriodSelection
): string =>
  selection.kind === 'shortcut'
    ? selection.shortcut
    : `${selection.from}_${selection.to}`;

export const parseDashboardPeriodCookie = (
  value: string | undefined
): DashboardPeriodSelection | null => {
  if (!value) return null;
  const parts = value.split('_');
  if (parts.length > 2) return null;
  const [from, to] = parts;
  return selectionFromDashboardSearch(
    parseDashboardPeriodSearch(
      parts.length === 1 ? { range: from } : { from, to }
    )
  );
};

/** Reads the cookie from a `document.cookie` string. */
export const dashboardPeriodCookieFrom = (
  cookieHeader: string
): string | undefined =>
  cookieHeader
    .split('; ')
    .find((entry) => entry.startsWith(`${DASHBOARD_PERIOD_COOKIE}=`))
    ?.slice(DASHBOARD_PERIOD_COOKIE.length + 1);
