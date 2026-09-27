import { z } from 'zod';

const rangedOverviewQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    bucket: z.enum(['day', 'month']),
    priorFrom: z.iso.date().optional(),
    priorTo: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => value.from <= value.to, {
    message: 'from must be on or before to',
    path: ['from'],
  })
  .refine(
    (value) =>
      (value.priorFrom === undefined) === (value.priorTo === undefined),
    {
      message: 'priorFrom and priorTo must be provided together',
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

export const dashboardOverviewQuerySchema = z.union([
  z.object({}).strict(),
  rangedOverviewQuerySchema,
]);

export type DashboardOverviewQuery = z.infer<
  typeof dashboardOverviewQuerySchema
>;

export type RangedDashboardOverviewQuery = z.infer<
  typeof rangedOverviewQuerySchema
>;
