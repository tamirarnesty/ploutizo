export type DashboardOverviewTrendPoint = {
  bucketStart: string;
  amountCents: number;
  priorAmountCents: number | null;
};

export const DASHBOARD_OVERVIEW_GRAINS = ['day', 'week', 'month'] as const;

/** Calendar unit each trend point's `bucketStart` represents; weeks start on Monday. */
export type DashboardOverviewGrain = (typeof DASHBOARD_OVERVIEW_GRAINS)[number];

/** Inclusive calendar dates (`yyyy-MM-dd`). */
export type CalendarDateRange = {
  from: string;
  to: string;
};

/** A charted window, the prior window it is compared with (null when there is none), and its bucket grain. */
export type DashboardOverviewRange = CalendarDateRange & {
  priorFrom: string | null;
  priorTo: string | null;
  grain: DashboardOverviewGrain;
};

export type DashboardOverviewMeta =
  | { kind: 'ranged'; range: DashboardOverviewRange }
  | {
      kind: 'all';
      /** First to last day with spend, monthly with no prior; null when there is none. */
      range: DashboardOverviewRange | null;
    };

export type GetDashboardOverviewResponse = {
  meta: DashboardOverviewMeta;
  trend: DashboardOverviewTrendPoint[];
};
