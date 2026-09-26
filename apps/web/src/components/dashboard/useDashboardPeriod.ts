import { useCallback, useEffect, useMemo } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import {
  dashboardSearchFromSelection,
  formatDashboardPeriodLabel,
  parseCalendarDate,
  resolveDashboardPeriod,
  toCalendarDate,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import { resolveEffectiveDashboardPeriod } from '@/lib/dashboard-period/effectiveDashboardPeriod';
import { persistDashboardPeriod } from '@/lib/dashboard-period/storage';

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

  const label = useMemo(
    () => formatDashboardPeriodLabel(selection, parseCalendarDate(today)),
    [selection, today]
  );

  useEffect(() => {
    persistDashboardPeriod(selection);
  }, [selection]);

  useEffect(() => {
    const hasUrlSelection = Object.keys(search).length > 0;
    if (hasUrlSelection) {
      return;
    }

    void navigate({
      search: dashboardSearchFromSelection(selection),
      replace: true,
    });
  }, [navigate, search, selection]);

  const setSelection = useCallback(
    (next: DashboardPeriodSelection) => {
      persistDashboardPeriod(next);
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
    resolved: resolved,
    label,
    selectShortcut,
    applyCustomRange,
  };
};
