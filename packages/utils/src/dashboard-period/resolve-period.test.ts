import { describe, expect, it } from 'vitest';
import {
  resolveOverviewQueryRange,
  resolvePeriodFromCalendarDates,
  resolvePeriodShortcut,
} from './index';

const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('resolvePeriodShortcut', () => {
  it('resolves MTD with calendar prior month clamping', () => {
    expect(resolvePeriodShortcut('mtd', d('2026-03-31'))).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
      priorFrom: '2026-02-01',
      priorTo: '2026-02-28',
      grain: 'daily',
    });
  });

  it('resolves MTD on a mid-month day', () => {
    expect(resolvePeriodShortcut('mtd', d('2026-03-15'))).toEqual({
      from: '2026-03-01',
      to: '2026-03-15',
      priorFrom: '2026-02-01',
      priorTo: '2026-02-15',
      grain: 'daily',
    });
  });

  it('handles leap-day MTD prior clamping', () => {
    expect(resolvePeriodShortcut('mtd', d('2024-03-31'))).toEqual({
      from: '2024-03-01',
      to: '2024-03-31',
      priorFrom: '2024-02-01',
      priorTo: '2024-02-29',
      grain: 'daily',
    });
  });

  it('resolves 30d as an inclusive 30-day window', () => {
    expect(resolvePeriodShortcut('30d', d('2026-05-10'))).toEqual({
      from: '2026-04-11',
      to: '2026-05-10',
      priorFrom: '2026-03-12',
      priorTo: '2026-04-10',
      grain: 'daily',
    });
  });

  it('resolves 6m from the start of the month five months ago', () => {
    expect(resolvePeriodShortcut('6m', d('2026-09-24'))).toEqual({
      from: '2026-04-01',
      to: '2026-09-24',
      priorFrom: '2025-10-06',
      priorTo: '2026-03-31',
      grain: 'weekly',
    });
  });

  it('forces monthly grain for YTD', () => {
    expect(resolvePeriodShortcut('ytd', d('2026-02-10'))).toEqual({
      from: '2026-01-01',
      to: '2026-02-10',
      priorFrom: '2025-01-01',
      priorTo: '2025-02-10',
      grain: 'monthly',
    });
  });

  it('returns no bounds or prior for All', () => {
    expect(resolvePeriodShortcut('all', d('2026-02-10'))).toEqual({
      from: null,
      to: null,
      priorFrom: null,
      priorTo: null,
      grain: 'monthly',
    });
  });
});

describe('resolvePeriodFromCalendarDates', () => {
  it('uses YTD prior-year clamping when the range matches YTD shape', () => {
    expect(resolvePeriodFromCalendarDates('2024-01-01', '2024-02-29')).toEqual({
      from: '2024-01-01',
      to: '2024-02-29',
      priorFrom: '2023-01-01',
      priorTo: '2023-02-28',
      grain: 'monthly',
    });
  });

  it('uses equal-length prior windows for arbitrary custom ranges', () => {
    expect(resolvePeriodFromCalendarDates('2026-04-10', '2026-04-20')).toEqual({
      from: '2026-04-10',
      to: '2026-04-20',
      priorFrom: '2026-03-30',
      priorTo: '2026-04-09',
      grain: 'daily',
    });
  });

  it('rejects invalid or reversed dates', () => {
    expect(resolvePeriodFromCalendarDates('2026-04-20', '2026-04-10')).toBe(
      'invalid'
    );
    expect(resolvePeriodFromCalendarDates('not-a-date', '2026-04-10')).toBe(
      'invalid'
    );
  });
});

describe('resolveOverviewQueryRange', () => {
  it('treats omitted dates as All', () => {
    expect(resolveOverviewQueryRange(undefined, undefined)).toEqual({
      kind: 'all',
      range: resolvePeriodShortcut('all'),
    });
  });

  it('rejects mixed or partial params', () => {
    expect(resolveOverviewQueryRange('2026-01-01', undefined)).toBe('invalid');
    expect(resolveOverviewQueryRange(undefined, '2026-01-31')).toBe('invalid');
  });
});
