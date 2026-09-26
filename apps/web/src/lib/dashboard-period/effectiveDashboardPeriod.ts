import {
  defaultDashboardPeriodSelection,
  parseDashboardPeriodSearch,
  selectionFromDashboardSearch,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSearch,
  DashboardPeriodSelection,
} from '@ploutizo/utils/dashboard-period';
import { readPersistedDashboardPeriod } from '@/lib/dashboard-period/storage';

export const resolveEffectiveDashboardPeriod = (
  search: DashboardPeriodSearch
): DashboardPeriodSelection => {
  const fromUrl = selectionFromDashboardSearch(
    parseDashboardPeriodSearch(search)
  );
  if (fromUrl) {
    return fromUrl;
  }

  const persisted = readPersistedDashboardPeriod();
  if (persisted) {
    return persisted;
  }

  return defaultDashboardPeriodSelection();
};
