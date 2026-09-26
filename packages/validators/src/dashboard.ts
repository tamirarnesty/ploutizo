import { z } from 'zod';

export const dashboardOverviewQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine((value) => value.from === `${value.to.slice(0, 7)}-01`, {
    message: 'from must be the first day of the month containing to',
    path: ['from'],
  });

export type DashboardOverviewQuery = z.infer<
  typeof dashboardOverviewQuerySchema
>;
