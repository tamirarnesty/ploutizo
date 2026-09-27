import { describe, expect, it } from 'vitest';
import {
  dashboardSearchFromSelection,
  eachCalendarDate,
  formatDashboardPeriodLabel,
  parseDashboardPeriodSearch,
  resolveDashboardPeriod,
  resolveMonthToDateRange,
  selectionFromDashboardSearch,
} from './index';

const d = (iso: string) => new Date(`${iso}T12:00:00`);

describe('resolveMonthToDateRange', () => {
  it('compares a mid-month day with the same days last month', () => {
    expect(resolveMonthToDateRange(d('2026-03-15'))).toEqual({
      from: '2026-03-01',
      to: '2026-03-15',
      bucket: 'day',
      prior: { from: '2026-02-01', to: '2026-02-15' },
    });
  });

  it('clamps the prior window to a shorter previous month', () => {
    expect(resolveMonthToDateRange(d('2026-03-31'))).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
      bucket: 'day',
      prior: { from: '2026-02-01', to: '2026-02-28' },
    });
  });

  it('handles leap years', () => {
    expect(resolveMonthToDateRange(d('2024-03-31')).prior?.to).toBe(
      '2024-02-29'
    );
  });

  it('crosses the year boundary in January', () => {
    expect(resolveMonthToDateRange(d('2026-01-10'))).toEqual({
      from: '2026-01-01',
      to: '2026-01-10',
      bucket: 'day',
      prior: { from: '2025-12-01', to: '2025-12-10' },
    });
  });
});

describe('resolveDashboardPeriod', () => {
  const today = d('2026-03-24');

  it('resolves MTD with rolling prior month clamping', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: 'mtd' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2026-03-01',
      to: '2026-03-24',
      bucket: 'day',
      prior: { from: '2026-02-01', to: '2026-02-24' },
    });
  });

  it('resolves 30d as 30 inclusive days ending today', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: '30d' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2026-02-23',
      to: '2026-03-24',
      bucket: 'day',
      prior: { from: '2026-01-24', to: '2026-02-22' },
    });
  });

  it('resolves 6m monthly from the start of the month five months ago, without a comparison', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: '6m' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2025-10-01',
      to: '2026-03-24',
      bucket: 'month',
      prior: null,
    });
  });

  it('resolves YTD with the prior year window', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: 'ytd' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2026-01-01',
      to: '2026-03-24',
      bucket: 'day',
      prior: { from: '2025-01-01', to: '2025-03-24' },
    });
  });

  it('resolves All without dates', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: 'all' }, today)
    ).toEqual({ kind: 'all' });
  });

  it('resolves short custom ranges daily, without a comparison', () => {
    expect(
      resolveDashboardPeriod(
        { kind: 'custom', from: '2026-02-10', to: '2026-02-20' },
        today
      )
    ).toEqual({
      kind: 'ranged',
      from: '2026-02-10',
      to: '2026-02-20',
      bucket: 'day',
      prior: null,
    });
  });

  it('resolves custom ranges longer than two months monthly', () => {
    expect(
      resolveDashboardPeriod(
        { kind: 'custom', from: '2025-11-01', to: '2026-02-20' },
        today
      )
    ).toMatchObject({ bucket: 'month', prior: null });
  });
});

describe('dashboard period search round-trip', () => {
  it('parses shortcut search params', () => {
    const search = parseDashboardPeriodSearch({ range: 'ytd' });
    expect(selectionFromDashboardSearch(search)).toEqual({
      kind: 'shortcut',
      shortcut: 'ytd',
    });
    expect(
      dashboardSearchFromSelection({
        kind: 'shortcut',
        shortcut: 'ytd',
      })
    ).toEqual({ range: 'ytd' });
  });

  it('parses custom search params', () => {
    const search = parseDashboardPeriodSearch({
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(selectionFromDashboardSearch(search)).toEqual({
      kind: 'custom',
      from: '2026-01-01',
      to: '2026-01-31',
    });
    expect(
      dashboardSearchFromSelection({
        kind: 'custom',
        from: '2026-01-01',
        to: '2026-01-31',
      })
    ).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });

  it('rejects mixed shortcut and custom params', () => {
    expect(
      selectionFromDashboardSearch(
        parseDashboardPeriodSearch({
          range: 'mtd',
          from: '2026-01-01',
          to: '2026-01-31',
        })
      )
    ).toBeNull();
  });

  it('rejects invalid shortcuts, dates, and partial custom params', () => {
    expect(
      selectionFromDashboardSearch(parseDashboardPeriodSearch({ range: 'bad' }))
    ).toBeNull();
    expect(
      selectionFromDashboardSearch(
        parseDashboardPeriodSearch({ from: '2026-13-01', to: '2026-01-31' })
      )
    ).toBeNull();
    expect(
      selectionFromDashboardSearch(
        parseDashboardPeriodSearch({ from: '2026-02-10', to: '2026-02-01' })
      )
    ).toBeNull();
    expect(
      selectionFromDashboardSearch(
        parseDashboardPeriodSearch({ from: '2026-01-01' })
      )
    ).toBeNull();
  });

  it('labels a ranged period by its resolved dates', () => {
    expect(
      formatDashboardPeriodLabel(
        resolveDashboardPeriod(
          { kind: 'shortcut', shortcut: 'mtd' },
          d('2026-03-24')
        )
      )
    ).toBe('Mar 1 – Mar 24, 2026');
    expect(
      formatDashboardPeriodLabel(
        resolveDashboardPeriod(
          { kind: 'custom', from: '2025-12-15', to: '2026-02-03' },
          d('2026-03-24')
        )
      )
    ).toBe('Dec 15, 2025 – Feb 3, 2026');
  });

  it('labels All as all time', () => {
    expect(formatDashboardPeriodLabel({ kind: 'all' })).toBe('All time');
  });
});

describe('eachCalendarDate', () => {
  it('lists every day inclusively', () => {
    expect(eachCalendarDate('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });
});
