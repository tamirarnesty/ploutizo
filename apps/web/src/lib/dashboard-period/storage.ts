import { DASHBOARD_PERIOD_SHORTCUTS } from '@ploutizo/utils/dashboard-period';
import type {
  DashboardPeriodSelection,
  DashboardPeriodShortcut,
} from '@ploutizo/utils/dashboard-period';
import { DASHBOARD_PERIOD_STORAGE_KEY } from '@/lib/dashboard-period/constants';

const isCalendarDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parsePersisted = (raw: string): DashboardPeriodSelection | null => {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || !('kind' in value)) {
      return null;
    }
    const record = value as { kind?: unknown };
    if (record.kind === 'shortcut') {
      const shortcut = (value as { shortcut?: unknown }).shortcut;
      if (
        typeof shortcut !== 'string' ||
        !(DASHBOARD_PERIOD_SHORTCUTS as readonly string[]).includes(shortcut)
      ) {
        return null;
      }
      return {
        kind: 'shortcut',
        shortcut: shortcut as DashboardPeriodShortcut,
      };
    }
    if (record.kind !== 'custom') {
      return null;
    }
    const { from, to } = value as { from?: unknown; to?: unknown };
    if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) {
      return null;
    }
    return { kind: 'custom', from, to };
  } catch {
    return null;
  }
};

export const readPersistedDashboardPeriod =
  (): DashboardPeriodSelection | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = window.localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parsePersisted(raw);
  };

export const persistDashboardPeriod = (selection: DashboardPeriodSelection) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    DASHBOARD_PERIOD_STORAGE_KEY,
    JSON.stringify(selection)
  );
};
