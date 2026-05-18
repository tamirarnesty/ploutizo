import { z } from 'zod';

// Period selector URL search params (D-02). Absent ?from/?to means month-to-date (no URL pollution).
// Phase 4.2 only writes/reads — does NOT re-fetch dashboard data based on these.
// Phase 6.3 wires them to charts/stats.
export const dashboardSearchSchema = z.object({
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});

export type DashboardSearch = z.infer<typeof dashboardSearchSchema>;
