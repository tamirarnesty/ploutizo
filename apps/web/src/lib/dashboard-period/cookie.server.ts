import { getCookie } from '@tanstack/react-start/server';
import { DASHBOARD_PERIOD_COOKIE } from './cookie-value';

export const getRequestDashboardPeriodCookie = (): string | undefined =>
  getCookie(DASHBOARD_PERIOD_COOKIE);
