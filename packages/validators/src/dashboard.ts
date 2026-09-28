import { z } from 'zod';
import {
  DASHBOARD_PERIOD_SHORTCUTS,
  DASHBOARD_RANGED_SHORTCUTS,
} from '@ploutizo/utils/dashboard-period';

const calendarDates = {
  from: z.iso.date(),
  to: z.iso.date(),
};

const isOrderedRange = (value: { from: string; to: string }) =>
  value.from <= value.to;

const orderedRangeError = {
  message: 'from must be on or before to',
  path: ['from'],
};

// Not strict: the router re-validates its own output, which carries the unused keys as undefined.
const absent = z.never().optional();

/** Dashboard URL search: a shortcut name or a custom from–to, never both. */
export const dashboardPeriodSearchSchema = z.union([
  z.object({
    range: z.enum(DASHBOARD_PERIOD_SHORTCUTS),
    from: absent,
    to: absent,
  }),
  z
    .object({ range: absent, ...calendarDates })
    .refine(isOrderedRange, orderedRangeError),
]);

/**
 * No params means All. Otherwise the range to chart, and the shortcut it came from, which picks the prior
 * window; a range without one is custom. The API derives the prior window and grain.
 */
export const dashboardOverviewQuerySchema = z.union([
  z
    .object({})
    .strict()
    .transform(() => ({ kind: 'all' as const })),
  z
    .object({
      ...calendarDates,
      shortcut: z.enum(DASHBOARD_RANGED_SHORTCUTS).optional(),
    })
    .strict()
    .refine(isOrderedRange, orderedRangeError)
    .transform(({ shortcut, ...range }) => ({
      kind: 'ranged' as const,
      shortcut: shortcut ?? null,
      ...range,
    })),
]);

export type DashboardOverviewQuery = z.output<
  typeof dashboardOverviewQuerySchema
>;
