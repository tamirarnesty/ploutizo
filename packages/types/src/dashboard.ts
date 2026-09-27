export type DashboardOverviewTrendPoint = {
  bucketStart: string;
  amountCents: number;
  priorAmountCents: number | null;
};

/** Inclusive calendar dates (`yyyy-MM-dd`). */
export type DashboardOverviewRange = {
  from: string;
  to: string;
};

/** Calendar unit each trend point's `bucketStart` represents. */
export type DashboardOverviewBucket = 'day' | 'month';

export type GetDashboardOverviewResponse = {
  meta: {
    /** Null for an all-time request with no spend. */
    range: DashboardOverviewRange | null;
    /** Comparison window mapped onto the current buckets by index; null when there is none. */
    prior: DashboardOverviewRange | null;
    bucket: DashboardOverviewBucket;
  };
  trend: DashboardOverviewTrendPoint[];
};
