export type DashboardOverviewTrendPoint = {
  bucketStart: string;
  amountCents: number;
  priorAmountCents: number | null;
};

/** Inclusive calendar dates (`yyyy-MM-dd`) for the current and comparison windows. */
export type DashboardOverviewRange = {
  from: string;
  to: string;
  priorFrom: string;
  priorTo: string;
};

export type GetDashboardOverviewResponse = {
  meta: {
    range: DashboardOverviewRange;
  };
  trend: DashboardOverviewTrendPoint[];
};
