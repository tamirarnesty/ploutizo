import { describe, expect, it } from 'vitest';
import {
  bucketBounds,
  bucketStartsIn,
  dashboardPriorRange,
  dashboardRangeGrain,
  formatDashboardPeriodLabel,
  resolveDashboardPeriod,
} from './index';
import type { DashboardPeriodShortcut } from './index';

const d = (iso: string) => new Date(`${iso}T12:00:00`);

const shortcut = (name: DashboardPeriodShortcut, today: string) =>
  resolveDashboardPeriod({ kind: 'shortcut', shortcut: name }, d(today));

describe('resolveDashboardPeriod', () => {
  it.each([
    ['mtd', '2026-03-24', '2026-03-01'],
    ['30d', '2026-03-24', '2026-02-23'],
    ['6m', '2026-03-24', '2025-10-01'],
    ['ytd', '2026-03-24', '2026-01-01'],
    ['mtd', '2026-01-10', '2026-01-01'],
    ['30d', '2026-01-10', '2025-12-12'],
    ['6m', '2026-02-28', '2025-09-01'],
  ] as const)(
    'resolves %s on %s from %s through today',
    (name, today, from) => {
      expect(shortcut(name, today)).toEqual({
        kind: 'ranged',
        from,
        to: today,
      });
    }
  );

  it('resolves All without dates', () => {
    expect(shortcut('all', '2026-03-24')).toEqual({ kind: 'all' });
  });

  it('keeps a custom range exactly as chosen, whatever today is', () => {
    expect(
      resolveDashboardPeriod(
        { kind: 'custom', from: '2025-02-10', to: '2025-02-20' },
        d('2026-03-24')
      )
    ).toEqual({ kind: 'ranged', from: '2025-02-10', to: '2025-02-20' });
  });
});

describe('dashboardPriorRange', () => {
  it.each([
    ['MTD mid-month', '2026-03-01', '2026-03-15', '2026-02-01', '2026-02-15'],
    [
      'MTD at month end',
      '2026-03-01',
      '2026-03-31',
      '2026-02-01',
      '2026-02-28',
    ],
    [
      'MTD in a leap year',
      '2024-03-01',
      '2024-03-31',
      '2024-02-01',
      '2024-02-29',
    ],
    [
      'a whole leap February',
      '2024-02-01',
      '2024-02-29',
      '2024-01-01',
      '2024-01-31',
    ],
    [
      'MTD across the year boundary',
      '2026-01-01',
      '2026-01-10',
      '2025-12-01',
      '2025-12-10',
    ],
    ['6m', '2025-10-01', '2026-03-24', '2025-04-01', '2025-09-24'],
    ['YTD', '2026-01-01', '2026-03-24', '2025-10-01', '2025-12-24'],
    ['30d', '2026-02-23', '2026-03-24', '2026-01-24', '2026-02-22'],
    [
      'a custom mid-month range',
      '2026-02-10',
      '2026-02-20',
      '2026-01-30',
      '2026-02-09',
    ],
  ])('steps back from %s (%s – %s)', (_label, from, to, priorFrom, priorTo) => {
    expect(dashboardPriorRange({ from, to })).toEqual({
      from: priorFrom,
      to: priorTo,
    });
  });

  it('clamps the end day to a shorter prior month', () => {
    expect(
      dashboardPriorRange({ from: '2026-03-01', to: '2026-03-30' })
    ).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('dashboardRangeGrain', () => {
  it.each([
    ['2026-03-01', '2026-03-24', 'day'],
    ['2026-02-23', '2026-03-24', 'day'],
    ['2026-01-01', '2026-02-14', 'day'],
    ['2026-01-01', '2026-02-15', 'week'],
    ['2025-10-01', '2026-03-24', 'week'],
    ['2025-10-01', '2026-03-31', 'week'],
    ['2025-10-01', '2026-04-01', 'month'],
    ['2026-01-01', '2026-09-28', 'month'],
  ] as const)('charts %s – %s by %s', (from, to, grain) => {
    expect(dashboardRangeGrain({ from, to })).toBe(grain);
  });
});

describe('bucketStartsIn', () => {
  it('lists every day inclusively', () => {
    expect(
      bucketStartsIn({ from: '2026-02-27', to: '2026-03-02' }, 'day')
    ).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });

  it('starts weeks on the Monday on or before the range start', () => {
    expect(
      bucketStartsIn({ from: '2026-03-04', to: '2026-03-17' }, 'week')
    ).toEqual(['2026-03-02', '2026-03-09', '2026-03-16']);
  });

  it('lists month starts through the month containing the range end', () => {
    expect(
      bucketStartsIn({ from: '2025-11-15', to: '2026-01-02' }, 'month')
    ).toEqual(['2025-11-01', '2025-12-01', '2026-01-01']);
  });
});

describe('bucketBounds', () => {
  it.each([
    ['2026-03-04', 'day', '2026-03-04', '2026-03-04'],
    ['2026-03-04', 'week', '2026-03-02', '2026-03-08'],
    ['2024-02-10', 'month', '2024-02-01', '2024-02-29'],
  ] as const)('bounds %s by %s', (date, grain, from, to) => {
    expect(bucketBounds(date, grain)).toEqual({ from, to });
  });
});

describe('formatDashboardPeriodLabel', () => {
  it('labels a range within one year with a single year', () => {
    expect(formatDashboardPeriodLabel(shortcut('mtd', '2026-03-24'))).toBe(
      'Mar 1 – Mar 24, 2026'
    );
  });

  it('labels a range across years with both years', () => {
    expect(
      formatDashboardPeriodLabel({
        kind: 'ranged',
        from: '2025-12-15',
        to: '2026-02-03',
      })
    ).toBe('Dec 15, 2025 – Feb 3, 2026');
  });

  it('labels All as all time', () => {
    expect(formatDashboardPeriodLabel({ kind: 'all' })).toBe('All time');
  });
});
