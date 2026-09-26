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
      priorFrom: '2026-02-01',
      priorTo: '2026-02-15',
    });
  });

  it('clamps the prior window to a shorter previous month', () => {
    expect(resolveMonthToDateRange(d('2026-03-31'))).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
      priorFrom: '2026-02-01',
      priorTo: '2026-02-28',
    });
  });

  it('handles leap years', () => {
    expect(resolveMonthToDateRange(d('2024-03-31')).priorTo).toBe('2024-02-29');
  });

  it('crosses the year boundary in January', () => {
    expect(resolveMonthToDateRange(d('2026-01-10'))).toEqual({
      from: '2026-01-01',
      to: '2026-01-10',
      priorFrom: '2025-12-01',
      priorTo: '2025-12-10',
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
      priorFrom: '2026-02-01',
      priorTo: '2026-02-24',
    });
  });

  it('resolves 30d as 30 inclusive days ending today', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: '30d' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2026-02-23',
      to: '2026-03-24',
      priorFrom: '2026-01-24',
      priorTo: '2026-02-22',
    });
  });

  it('resolves 6m from the start of the month five months ago', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: '6m' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2025-10-01',
      to: '2026-03-24',
      priorFrom: '2025-04-09',
      priorTo: '2025-09-30',
    });
  });

  it('resolves YTD with the prior year window', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: 'ytd' }, today)
    ).toEqual({
      kind: 'ranged',
      from: '2026-01-01',
      to: '2026-03-24',
      priorFrom: '2025-01-01',
      priorTo: '2025-03-24',
    });
  });

  it('resolves All without dates', () => {
    expect(
      resolveDashboardPeriod({ kind: 'shortcut', shortcut: 'all' }, today)
    ).toEqual({ kind: 'all' });
  });

  it('resolves custom ranges with an equal-length prior window', () => {
    expect(
      resolveDashboardPeriod(
        { kind: 'custom', from: '2026-02-10', to: '2026-02-20' },
        today
      )
    ).toEqual({
      kind: 'ranged',
      from: '2026-02-10',
      to: '2026-02-20',
      priorFrom: '2026-01-30',
      priorTo: '2026-02-09',
    });
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

  it('formats shortcut and custom labels', () => {
    expect(
      formatDashboardPeriodLabel(
        { kind: 'shortcut', shortcut: 'mtd' },
        d('2026-03-24')
      )
    ).toBe('MTD');
    expect(
      formatDashboardPeriodLabel(
        { kind: 'custom', from: '2026-01-15', to: '2026-02-03' },
        d('2026-03-24')
      )
    ).toBe('Jan 15 – Feb 3, 2026');
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
