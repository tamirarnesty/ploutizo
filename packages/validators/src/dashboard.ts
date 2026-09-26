import { z } from 'zod';

const rangedOverviewQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    priorFrom: z.iso.date(),
    priorTo: z.iso.date(),
  })
  .refine((value) => value.from <= value.to, {
    message: 'from must be on or before to',
    path: ['from'],
  })
  .refine((value) => value.priorFrom <= value.priorTo, {
    message: 'priorFrom must be on or before priorTo',
    path: ['priorFrom'],
  });

export const dashboardOverviewQuerySchema = z.union([
  z.object({}).strict(),
  rangedOverviewQuerySchema,
]);

export type DashboardOverviewQuery = z.infer<
  typeof dashboardOverviewQuerySchema
>;
