export const PERIOD_SHORTCUT_VALUES = [
  'mtd',
  '30d',
  '6m',
  'ytd',
  'all',
] as const;

export type PeriodShortcut = (typeof PERIOD_SHORTCUT_VALUES)[number];

export const PERIOD_GRAIN_VALUES = ['daily', 'weekly', 'monthly'] as const;

export type PeriodGrain = (typeof PERIOD_GRAIN_VALUES)[number];

/** Inclusive calendar bounds and derived analytics metadata for dashboard periods. */
export type DashboardPeriodRange = {
  from: string | null;
  to: string | null;
  priorFrom: string | null;
  priorTo: string | null;
  grain: PeriodGrain;
};
