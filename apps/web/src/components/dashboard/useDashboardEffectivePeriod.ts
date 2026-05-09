import { useMemo } from 'react';
import { useSearch } from '@tanstack/react-router';
import { parseSearchToDashboardRange } from '@/components/dashboard/dashboardPeriod';

/** Calendar day changes (e.g. midnight) should refresh default MTD and URL-default stripping. */
export const useDashboardEffectivePeriod = () => {
  const search = useSearch({ from: '/_layout/dashboard' });
  const calendarDayKey = new Date().toLocaleDateString('en-CA');

  return useMemo(() => {
    const now = new Date();
    return parseSearchToDashboardRange(search.from, search.to, now);
  }, [search.from, search.to, calendarDayKey]);
};
