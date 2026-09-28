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

/** What the prior window is, relative to the current range. */
export type DashboardOverviewComparison =
  | 'previous-month'
  | 'previous-30-days'
  | 'previous-year';

/** Window compared against the current range, bucket by bucket. */
export type DashboardOverviewPrior = DashboardOverviewRange & {
  comparison: DashboardOverviewComparison;
};

export type DashboardOverviewMeta =
  | {
      kind: 'all';
      /** First to last day with spend; null when there is none. */
      range: DashboardOverviewRange | null;
      prior: null;
      bucket: 'month';
    }
  | {
      kind: 'ranged';
      range: DashboardOverviewRange;
      /** Mapped onto the current buckets by index; null when there is no comparison. */
      prior: DashboardOverviewPrior | null;
      bucket: DashboardOverviewBucket;
    };

export type GetDashboardOverviewResponse = {
  meta: DashboardOverviewMeta;
  trend: DashboardOverviewTrendPoint[];
};
