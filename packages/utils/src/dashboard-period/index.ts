import { resolvePeriodShortcut } from './resolve-period';
import type { DashboardPeriodRange } from './types';

export type {
  DashboardPeriodRange,
  PeriodGrain,
  PeriodShortcut,
} from './types';
export { PERIOD_GRAIN_VALUES, PERIOD_SHORTCUT_VALUES } from './types';
export { generatePeriodBucketStarts } from './buckets';
export {
  derivePeriodGrain,
  isCalendarDateString,
  parseCalendarDate,
  resolveOverviewQueryRange,
  resolvePeriodFromCalendarDates,
  resolvePeriodShortcut,
  toCalendarDate,
  type DashboardOverviewQueryRange,
} from './resolve-period';

/** Convenience for client overview fetch keys — fixed MTD until the selector ships. */
export const resolveFixedMtdOverviewRange = (
  today: Date = new Date()
): DashboardPeriodRange => resolvePeriodShortcut('mtd', today);

export const overviewQueryKeyRange = (
  range: DashboardPeriodRange
): readonly [string | null, string | null] => [range.from, range.to];

export const overviewQueryKeySuffix = (range: DashboardPeriodRange): string =>
  range.from && range.to ? `${range.from}:${range.to}` : 'all';
