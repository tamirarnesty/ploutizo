import { useCallback, useEffect, useMemo } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import {
  dashboardSearchFromSelection,
  parseCalendarDate,
  resolveDashboardPeriod,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import { resolveEffectiveDashboardPeriod } from '@/lib/dashboard-period/effectiveDashboardPeriod';
import { persistDashboardPeriod } from '@/lib/dashboard-period/cookie';

const dashboardRouteApi = getRouteApi('/_layout/dashboard');

export const useDashboardPeriod = () => {
  const search = dashboardRouteApi.useSearch();
  const navigate = useNavigate({ from: '/dashboard' });
  const today = toCalendarDate(new Date());

  const selection = useMemo(
    () => resolveEffectiveDashboardPeriod(search),
    [search]
  );

  const resolved = useMemo(
    () => resolveDashboardPeriod(selection, parseCalendarDate(today)),
    [selection, today]
  );

  // Also covers periods arriving by URL, so a shared link becomes the viewer's period.
  useEffect(() => {
    persistDashboardPeriod(selection);
  }, [selection]);

  const setSelection = useCallback(
    (next: DashboardPeriodSelection) => {
      void navigate({ search: dashboardSearchFromSelection(next) });
    },
    [navigate]
  );

  const selectShortcut = useCallback(
    (shortcut: DashboardPeriodShortcut) => {
      setSelection({ kind: 'shortcut', shortcut });
    },
    [setSelection]
  );

  const applyCustomRange = useCallback(
    (from: string, to: string) => {
      setSelection({ kind: 'custom', from, to });
    },
    [setSelection]
  );

  return {
    selection,
    resolved,
    today,
    selectShortcut,
    applyCustomRange,
  };
};
