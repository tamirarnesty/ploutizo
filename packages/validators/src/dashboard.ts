import { z } from 'zod';
import { DASHBOARD_PERIOD_SHORTCUTS } from '@ploutizo/utils/dashboard-period';

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

const calendarDateRangeSchema = z
  .object(calendarDates)
  .strict()
  .refine(isOrderedRange, orderedRangeError);

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

/** No params means All; otherwise the range to chart, whose prior window and grain the API derives. */
export const dashboardOverviewQuerySchema = z.union([
  z
    .object({})
    .strict()
    .transform(() => ({ kind: 'all' as const })),
  calendarDateRangeSchema.transform((range) => ({
    kind: 'ranged' as const,
    ...range,
  })),
]);

export type DashboardOverviewQuery = z.output<
  typeof dashboardOverviewQuerySchema
>;
