import { selectionFromDashboardSearch } from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSearch,
  DashboardPeriodSelection,
} from '@ploutizo/utils/dashboard-period';
import { readPersistedDashboardPeriod } from '@/lib/dashboard-period/storage';

export const resolveEffectiveDashboardPeriod = (
  search: DashboardPeriodSearch
): DashboardPeriodSelection =>
  selectionFromDashboardSearch(search) ??
  readPersistedDashboardPeriod() ?? { kind: 'shortcut', shortcut: 'mtd' };
