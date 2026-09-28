import { z } from 'zod';

const rangedOverviewQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    bucket: z.enum(['day', 'month']),
    priorFrom: z.iso.date().optional(),
    priorTo: z.iso.date().optional(),
    comparison: z
      .enum(['previous-month', 'previous-30-days', 'previous-year'])
      .optional(),
  })
  .strict()
  .refine((value) => value.from <= value.to, {
    message: 'from must be on or before to',
    path: ['from'],
  })
  .refine(
    (value) =>
      (value.priorFrom === undefined) === (value.priorTo === undefined) &&
      (value.priorFrom === undefined) === (value.comparison === undefined),
    {
      message: 'priorFrom, priorTo and comparison must be provided together',
      path: ['priorFrom'],
    }
  )
  .refine(
    (value) =>
      value.priorFrom === undefined ||
      value.priorTo === undefined ||
      value.priorFrom <= value.priorTo,
    {
      message: 'priorFrom must be on or before priorTo',
      path: ['priorFrom'],
    }
  );

/** No params means All; otherwise a range, optionally compared bucket by bucket with a prior window. */
export const dashboardOverviewQuerySchema = z.union([
  z
    .object({})
    .strict()
    .transform(() => ({ kind: 'all' as const })),
  rangedOverviewQuerySchema.transform(
    ({ from, to, bucket, priorFrom, priorTo, comparison }) => ({
      kind: 'ranged' as const,
      range: { from, to },
      bucket,
      prior:
        priorFrom !== undefined &&
        priorTo !== undefined &&
        comparison !== undefined
          ? { from: priorFrom, to: priorTo, comparison }
          : null,
    })
  ),
]);

export type DashboardOverviewQuery = z.output<
  typeof dashboardOverviewQuerySchema
>;

export type RangedDashboardOverviewQuery = Extract<
  DashboardOverviewQuery,
  { kind: 'ranged' }
>;
