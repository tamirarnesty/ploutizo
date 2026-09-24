import { generatePeriodBucketStarts } from '@ploutizo/utils/dashboard-period';
import type {
  DashboardOverviewQueryRange,
  DashboardPeriodRange,
} from '@ploutizo/utils/dashboard-period';
import type {
  DashboardOverviewTrendPoint,
  GetDashboardOverviewResponse,
} from '@ploutizo/types';
import {
  fetchAllTimeSpendTrendBuckets,
  fetchSpendTrendBuckets,
} from '@/lib/queries/dashboard';

const generateBucketStarts = generatePeriodBucketStarts;

const indexPriorAmounts = (
  currentBuckets: string[],
  priorBuckets: string[],
  priorAmounts: Map<string, number>
): (number | null)[] => {
  if (priorBuckets.length === 0) {
    return currentBuckets.map(() => null);
  }
  return currentBuckets.map((_bucket, index) => {
    const priorBucket = priorBuckets[index];
    if (!priorBucket) {
      return null;
    }
    return priorAmounts.get(priorBucket) ?? 0;
  });
};

const buildTrendSeries = async (
  orgId: string,
  range: DashboardPeriodRange,
  includePrior: boolean
): Promise<DashboardOverviewTrendPoint[]> => {
  if (!range.from || !range.to) {
    const rows = await fetchAllTimeSpendTrendBuckets(orgId);
    return rows.map((row) => ({
      bucketStart: row.bucketStart,
      amountCents: row.amountCents,
      priorAmountCents: null,
    }));
  }

  const bucketStarts = generateBucketStarts(range.from, range.to, range.grain);
  const currentRows = await fetchSpendTrendBuckets(orgId, {
    from: range.from,
    to: range.to,
    grain: range.grain,
  });
  const currentAmounts = new Map(
    currentRows.map((row) => [row.bucketStart, row.amountCents])
  );

  let priorAmountsByIndex: (number | null)[] = bucketStarts.map(() => null);
  if (
    includePrior &&
    range.priorFrom &&
    range.priorTo &&
    range.priorFrom <= range.priorTo
  ) {
    const priorBucketStarts = generateBucketStarts(
      range.priorFrom,
      range.priorTo,
      range.grain
    );
    const priorRows = await fetchSpendTrendBuckets(orgId, {
      from: range.priorFrom,
      to: range.priorTo,
      grain: range.grain,
    });
    const priorAmounts = new Map(
      priorRows.map((row) => [row.bucketStart, row.amountCents])
    );
    priorAmountsByIndex = indexPriorAmounts(
      bucketStarts,
      priorBucketStarts,
      priorAmounts
    );
  }

  return bucketStarts.map((bucketStart, index) => ({
    bucketStart,
    amountCents: currentAmounts.get(bucketStart) ?? 0,
    priorAmountCents: priorAmountsByIndex[index],
  }));
};

export const getDashboardOverview = async (
  orgId: string,
  resolved: DashboardOverviewQueryRange
): Promise<GetDashboardOverviewResponse> => {
  const { range } = resolved;
  const trend = await buildTrendSeries(orgId, range, resolved.kind !== 'all');

  return {
    meta: {
      range: {
        from: range.from,
        to: range.to,
        priorFrom: range.priorFrom,
        priorTo: range.priorTo,
        grain: range.grain,
      },
    },
    trend,
  };
};
