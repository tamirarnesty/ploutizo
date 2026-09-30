import { describe, expect, it } from 'vitest';
import type { DashboardOverviewGrain } from '@ploutizo/types';
import type { DashboardOverviewMeta } from '@ploutizo/validators';
import {
  formatTrendBucket,
  partialBucketEdges,
  segmentPartialBuckets,
  spendTrendCaption,
  spendTrendModeLabel,
  spendTrendSeriesLabels,
  toSpendTrendChartData,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

const rangedMeta = (
  grain: DashboardOverviewGrain,
  from = '2026-03-01',
  to = '2026-03-24'
): DashboardOverviewMeta => ({
  kind: 'ranged',
  range: { from, to, priorFrom: '2026-02-01', priorTo: '2026-02-24', grain },
});

const allMeta = (from: string, to: string): DashboardOverviewMeta => ({
  kind: 'all',
  range: { from, to, priorFrom: null, priorTo: null, grain: 'month' },
});

describe('formatTrendBucket', () => {
  it('labels day buckets by day', () => {
    expect(formatTrendBucket('2026-03-05', 'day', 'axis')).toBe('Mar 5');
    expect(formatTrendBucket('2026-03-05', 'day', 'tooltip')).toBe(
      'Mar 5, 2026'
    );
  });

  it('labels week buckets by their Monday', () => {
    expect(formatTrendBucket('2026-03-02', 'week', 'axis')).toBe('Mar 2');
    expect(formatTrendBucket('2026-03-02', 'week', 'tooltip')).toBe(
      'Week of Mar 2, 2026'
    );
  });

  it('labels month buckets by month and year', () => {
    expect(formatTrendBucket('2026-08-01', 'month', 'axis')).toBe('Aug 2026');
    expect(formatTrendBucket('2026-08-01', 'month', 'tooltip')).toBe(
      'August 2026'
    );
  });
});

describe('toSpendTrendChartData', () => {
  const comparison = {
    meta: rangedMeta('day', '2026-03-01', '2026-03-03'),
    trend: [
      { bucketStart: '2026-03-01', amountCents: 100, priorAmountCents: 50 },
      { bucketStart: '2026-03-02', amountCents: 0, priorAmountCents: 70 },
      { bucketStart: '2026-03-03', amountCents: -30, priorAmountCents: null },
    ],
    categories: [],
  };
  const allTime = {
    meta: allMeta('2026-01-01', '2026-02-28'),
    trend: [
      { bucketStart: '2026-01-01', amountCents: 500, priorAmountCents: null },
      { bucketStart: '2026-02-01', amountCents: 700, priorAmountCents: null },
    ],
    categories: [],
  };

  it('charts running totals for both series in running mode', () => {
    expect(toSpendTrendChartData(comparison, 'running')).toEqual([
      { bucketStart: '2026-03-01', current: 100, prior: 50 },
      { bucketStart: '2026-03-02', current: 100, prior: 120 },
      { bucketStart: '2026-03-03', current: 70, prior: null },
    ]);
  });

  it('charts each bucket against its matching prior bucket in bucket mode', () => {
    expect(toSpendTrendChartData(comparison, 'bucket')).toEqual([
      { bucketStart: '2026-03-01', current: 100, prior: 50 },
      { bucketStart: '2026-03-02', current: 0, prior: 70 },
      { bucketStart: '2026-03-03', current: -30, prior: null },
    ]);
  });

  it('charts All’s running total from its first month in running mode', () => {
    expect(toSpendTrendChartData(allTime, 'running')).toEqual([
      { bucketStart: '2026-01-01', current: 500, prior: null },
      { bucketStart: '2026-02-01', current: 1200, prior: null },
    ]);
  });

  it('charts each of All’s months on its own in bucket mode', () => {
    expect(toSpendTrendChartData(allTime, 'bucket')).toEqual([
      { bucketStart: '2026-01-01', current: 500, prior: null },
      { bucketStart: '2026-02-01', current: 700, prior: null },
    ]);
  });
});

describe('spendTrendModeLabel', () => {
  it('names bucket mode by the grain on screen', () => {
    expect(spendTrendModeLabel('bucket', 'day')).toBe('Per day');
    expect(spendTrendModeLabel('bucket', 'week')).toBe('Per week');
    expect(spendTrendModeLabel('bucket', 'month')).toBe('Per month');
  });

  it('names running mode the same at every grain', () => {
    expect(spendTrendModeLabel('running', 'week')).toBe('Running total');
  });
});

describe('spendTrendSeriesLabels', () => {
  it('names the current and prior series of a comparison', () => {
    expect(spendTrendSeriesLabels(rangedMeta('day'))).toEqual({
      current: 'This period',
      prior: 'Prior period',
    });
  });

  it('labels All, which has no comparison, as Spend', () => {
    expect(
      spendTrendSeriesLabels(allMeta('2026-01-15', '2026-03-12')).current
    ).toBe('Spend');
  });
});

describe('spendTrendCaption', () => {
  it('names the measure and the prior window it is compared against', () => {
    expect(spendTrendCaption(rangedMeta('day'), 'running')).toBe(
      'Running total vs Feb 1 – Feb 24, 2026'
    );
    expect(spendTrendCaption(rangedMeta('week'), 'bucket')).toBe(
      'Spend per week vs Feb 1 – Feb 24, 2026'
    );
  });

  it('names only the measure for All, which has no comparison', () => {
    expect(
      spendTrendCaption(allMeta('2026-01-15', '2026-03-12'), 'bucket')
    ).toBe('Spend per month');
    expect(
      spendTrendCaption(allMeta('2026-01-15', '2026-03-12'), 'running')
    ).toBe('Running total');
    expect(spendTrendCaption({ kind: 'all', range: null }, 'bucket')).toBe(
      'Spend per month'
    );
  });
});

describe('partialBucketEdges', () => {
  it('marks the current month as partial while it is in progress', () => {
    expect(
      partialBucketEdges(
        rangedMeta('month', '2026-01-01', '2026-09-27'),
        '2026-09-27'
      )
    ).toEqual({ first: false, last: true });
  });

  it('treats All’s last month as whole once it has ended, whenever the last spend fell', () => {
    expect(
      partialBucketEdges(allMeta('2026-01-01', '2026-03-12'), '2026-09-27')
    ).toEqual({ first: false, last: false });
  });

  it('marks All’s last month as partial while it is in progress', () => {
    expect(
      partialBucketEdges(allMeta('2026-01-01', '2026-09-12'), '2026-09-27')
    ).toEqual({ first: false, last: true });
  });

  it('treats All’s first month as whole, though its first spend falls partway through', () => {
    expect(
      partialBucketEdges(allMeta('2026-01-07', '2026-03-12'), '2026-09-27')
    ).toEqual({ first: false, last: false });
  });

  it('marks a first month the range starts partway through', () => {
    expect(
      partialBucketEdges(
        rangedMeta('month', '2025-11-15', '2026-02-28'),
        '2026-02-28'
      )
    ).toEqual({ first: true, last: false });
  });

  it('marks weeks the range starts and ends partway through', () => {
    expect(
      partialBucketEdges(
        rangedMeta('week', '2025-10-01', '2026-03-24'),
        '2026-03-24'
      )
    ).toEqual({ first: true, last: true });
  });

  it('treats weeks from Monday through Sunday as whole', () => {
    expect(
      partialBucketEdges(
        rangedMeta('week', '2025-09-29', '2026-03-22'),
        '2026-03-24'
      )
    ).toEqual({ first: false, last: false });
  });

  it('never marks daily buckets', () => {
    expect(partialBucketEdges(rangedMeta('day'), '2026-03-24')).toEqual({
      first: false,
      last: false,
    });
  });
});

describe('segmentPartialBuckets', () => {
  const point = (bucketStart: string, current: number) => ({
    bucketStart,
    current,
    prior: null,
  });

  it('draws whole months solid and joins a dashed stroke into the partial last month', () => {
    expect(
      segmentPartialBuckets(
        [
          point('2026-07-01', 100),
          point('2026-08-01', 200),
          point('2026-09-01', 50),
        ],
        { first: false, last: true }
      )
    ).toEqual([
      { ...point('2026-07-01', 100), complete: 100, partial: null },
      { ...point('2026-08-01', 200), complete: 200, partial: 200 },
      { ...point('2026-09-01', 50), complete: null, partial: 50 },
    ]);
  });

  it('draws everything solid when no month is partial', () => {
    const [first, second] = segmentPartialBuckets(
      [point('2026-01-01', 100), point('2026-02-01', 200)],
      { first: false, last: false }
    );
    expect([first.partial, second.partial]).toEqual([null, null]);
    expect([first.complete, second.complete]).toEqual([100, 200]);
  });
});
