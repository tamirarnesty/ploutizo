import { useCallback, useEffect, useMemo } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import {
  dashboardSearchFromSelection,
  parseCalendarDate,
  resolveDashboardPeriod,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type { CalendarDateRange } from '@ploutizo/types';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import type { SpendTrendMode } from '@/lib/spend-trend-mode';
import { persistDashboardPeriod } from '@/lib/dashboard-period/cookie';
import { persistSpendTrendMode } from '@/lib/spend-trend-mode/cookie';

const dashboardRouteApi = getRouteApi('/_layout/dashboard');

/** The period and spend trend mode the URL names, and setters that change them. */
export const useDashboardSearch = () => {
  const { periodSelection, spendTrendMode } =
    dashboardRouteApi.useRouteContext();
  const navigate = useNavigate({ from: '/dashboard' });
  const today = toCalendarDate(new Date());

  const period = useMemo(
    () => resolveDashboardPeriod(periodSelection, parseCalendarDate(today)),
    [periodSelection, today]
  );

  // Also covers values arriving by URL, so a shared link becomes the viewer's own.
  useEffect(() => {
    persistDashboardPeriod(periodSelection);
  }, [periodSelection]);
  useEffect(() => {
    persistSpendTrendMode(spendTrendMode);
  }, [spendTrendMode]);

  // Object form replaces the period keys; the route retains `trend`.
  const selectPeriod = useCallback(
    (next: DashboardPeriodSelection) => {
      void navigate({ search: dashboardSearchFromSelection(next) });
    },
    [navigate]
  );

  const selectShortcut = useCallback(
    (shortcut: DashboardPeriodShortcut) => {
      selectPeriod({ kind: 'shortcut', shortcut });
    },
    [selectPeriod]
  );

  const applyCustomRange = useCallback(
    (range: CalendarDateRange) => {
      selectPeriod({ kind: 'custom', ...range });
    },
    [selectPeriod]
  );

  const selectSpendTrendMode = useCallback(
    (mode: SpendTrendMode) => {
      void navigate({ search: (prev) => ({ ...prev, trend: mode }) });
    },
    [navigate]
  );

  return {
    periodSelection,
    period,
    today,
    spendTrendMode,
    selectShortcut,
    applyCustomRange,
    selectSpendTrendMode,
  };
};
