import type { DashboardPeriodSelection } from '@ploutizo/utils/dashboard-period';
import { readCookie, writeCookie } from '@/lib/cookies/persistent-cookie';
import {
  DASHBOARD_PERIOD_COOKIE,
  parseDashboardPeriodCookie,
  serializeDashboardPeriodCookie,
} from './cookie-value';

/** The last period the viewer picked. */
export const readPersistedDashboardPeriod = () =>
  parseDashboardPeriodCookie(readCookie(DASHBOARD_PERIOD_COOKIE));

export const persistDashboardPeriod = (selection: DashboardPeriodSelection) => {
  writeCookie(
    DASHBOARD_PERIOD_COOKIE,
    serializeDashboardPeriodCookie(selection)
  );
};
