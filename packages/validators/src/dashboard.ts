import { z } from 'zod';

export const dashboardOverviewQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .superRefine((value, ctx) => {
    const hasFrom = value.from !== undefined;
    const hasTo = value.to !== undefined;
    if (hasFrom !== hasTo) {
      ctx.addIssue({
        code: 'custom',
        message: 'from and to must both be provided or both omitted',
        path: hasFrom ? ['to'] : ['from'],
      });
    }
  });

export type DashboardOverviewQuery = z.infer<
  typeof dashboardOverviewQuerySchema
>;
