import { describe, expect, it } from 'vitest';
import { eachCalendarDate, resolveMonthToDateRange } from './index';

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
