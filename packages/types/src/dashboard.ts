export type DashboardOverviewTrendPoint = {
  bucketStart: string;
  amountCents: number;
  priorAmountCents: number | null;
};

export type DashboardOverviewGrain = 'daily' | 'weekly' | 'monthly';

export type DashboardOverviewRangeMeta = {
  from: string | null;
  to: string | null;
  priorFrom: string | null;
  priorTo: string | null;
  grain: DashboardOverviewGrain;
};

export type GetDashboardOverviewResponse = {
  meta: {
    range: DashboardOverviewRangeMeta;
  };
  trend: DashboardOverviewTrendPoint[];
};
