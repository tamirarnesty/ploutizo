import { describe, expect, it } from 'vitest';
import {
  formatTrendBucket,
  partialMonthEdges,
  segmentPartialMonths,
  spendTrendCaption,
  spendTrendHasPriorSeries,
  spendTrendSeriesLabels,
  spendTrendYDomain,
  toSpendTrendChartData,
} from '@/components/dashboard/spend-trend/spendTrendChartUtils';

describe('spendTrendHasPriorSeries', () => {
  it('is false when every prior value is null (no prior series)', () => {
    expect(
      spendTrendHasPriorSeries([
        { bucketStart: '2026-03-01', current: 100, prior: null },
        { bucketStart: '2026-03-02', current: 200, prior: null },
      ])
    ).toBe(false);
  });

  it('is true when any bucket has prior data', () => {
    expect(
      spendTrendHasPriorSeries([
        { bucketStart: '2026-03-01', current: 100, prior: null },
        { bucketStart: '2026-03-02', current: 200, prior: 50 },
      ])
    ).toBe(true);
  });
});

describe('spendTrendYDomain', () => {
  it('returns a non-degenerate domain for empty or all-zero data', () => {
    expect(spendTrendYDomain([])).toEqual([-1, 1]);
    expect(
      spendTrendYDomain([{ bucketStart: '2026-03-01', current: 0, prior: 0 }])
    ).toEqual([-1, 1]);
  });

  it('includes zero and extends below when values are negative', () => {
    const [min, max] = spendTrendYDomain([
      { bucketStart: '2026-03-01', current: -500, prior: 100 },
    ]);
    expect(min).toBeLessThanOrEqual(-500);
    expect(max).toBeGreaterThanOrEqual(0);
  });
});

describe('formatTrendBucket', () => {
  it('labels day buckets by day', () => {
    expect(formatTrendBucket('2026-03-05', 'day', 'axis')).toBe('Mar 5');
    expect(formatTrendBucket('2026-03-05', 'day', 'tooltip')).toBe(
      'Mar 5, 2026'
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
  it('charts running totals for both series when there is a comparison', () => {
    expect(
      toSpendTrendChartData([
        { bucketStart: '2026-03-01', amountCents: 100, priorAmountCents: 50 },
        { bucketStart: '2026-03-02', amountCents: 0, priorAmountCents: 70 },
        { bucketStart: '2026-03-03', amountCents: -30, priorAmountCents: null },
      ])
    ).toEqual([
      { bucketStart: '2026-03-01', current: 100, prior: 50 },
      { bucketStart: '2026-03-02', current: 100, prior: 120 },
      { bucketStart: '2026-03-03', current: 70, prior: null },
    ]);
  });

  it('charts each bucket on its own when there is no comparison', () => {
    expect(
      toSpendTrendChartData([
        { bucketStart: '2026-01-01', amountCents: 500, priorAmountCents: null },
        { bucketStart: '2026-02-01', amountCents: 700, priorAmountCents: null },
      ])
    ).toEqual([
      { bucketStart: '2026-01-01', current: 500, prior: null },
      { bucketStart: '2026-02-01', current: 700, prior: null },
    ]);
  });
});

describe('spendTrendSeriesLabels', () => {
  it.each([
    ['mtd', 'This month', 'Last month'],
    ['30d', 'Last 30 days', 'Previous 30 days'],
    ['ytd', 'This year', 'Last year'],
  ] as const)('names the %s comparison', (shortcut, current, prior) => {
    expect(spendTrendSeriesLabels({ kind: 'shortcut', shortcut })).toEqual({
      current,
      prior,
    });
  });

  it.each([
    { kind: 'shortcut', shortcut: '6m' },
    { kind: 'shortcut', shortcut: 'all' },
    { kind: 'custom', from: '2026-01-01', to: '2026-01-31' },
  ] as const)('labels a period without a comparison as Spend', (selection) => {
    expect(spendTrendSeriesLabels(selection).current).toBe('Spend');
  });
});

describe('spendTrendCaption', () => {
  it('describes a comparison as a running total against the prior window', () => {
    expect(
      spendTrendCaption({ current: 'This month', prior: 'Last month' }, 'day')
    ).toBe('Running total vs last month');
  });

  it('describes a standalone period as spend per bucket', () => {
    expect(spendTrendCaption({ current: 'Spend', prior: '' }, 'month')).toBe(
      'Spend per month'
    );
  });
});

describe('partialMonthEdges', () => {
  const monthly = (from: string, to: string) => ({
    range: { from, to },
    prior: null,
    bucket: 'month' as const,
  });

  it('marks the current month as partial while it is in progress', () => {
    expect(
      partialMonthEdges(monthly('2026-04-01', '2026-09-27'), '2026-09-27')
    ).toEqual({ first: false, last: true });
  });

  it('treats an earlier last month as whole once it has ended', () => {
    expect(
      partialMonthEdges(monthly('2026-01-01', '2026-03-12'), '2026-09-27')
    ).toEqual({ first: false, last: false });
  });

  it('marks a first month the range starts partway through', () => {
    expect(
      partialMonthEdges(monthly('2025-11-15', '2026-02-28'), '2026-02-28')
    ).toEqual({ first: true, last: false });
  });

  it('never marks daily buckets', () => {
    expect(
      partialMonthEdges(
        {
          range: { from: '2026-09-01', to: '2026-09-27' },
          prior: null,
          bucket: 'day',
        },
        '2026-09-27'
      )
    ).toEqual({ first: false, last: false });
  });
});

describe('segmentPartialMonths', () => {
  const point = (bucketStart: string, current: number) => ({
    bucketStart,
    current,
    prior: null,
  });

  it('draws whole months solid and joins a dashed stroke into the partial last month', () => {
    expect(
      segmentPartialMonths(
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
    const [first, second] = segmentPartialMonths(
      [point('2026-01-01', 100), point('2026-02-01', 200)],
      { first: false, last: false }
    );
    expect([first.partial, second.partial]).toEqual([null, null]);
    expect([first.complete, second.complete]).toEqual([100, 200]);
  });
});
