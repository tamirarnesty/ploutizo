import { describe, expect, it } from 'vitest';
import { validateDashboardSearch } from '@/lib/dashboard-period/validateDashboardSearch';

describe('validateDashboardSearch', () => {
  it('returns an empty object when search is empty', () => {
    expect(validateDashboardSearch({})).toEqual({});
  });

  it('keeps valid shortcut params', () => {
    expect(validateDashboardSearch({ range: '30d' })).toEqual({ range: '30d' });
  });

  it('keeps valid custom params', () => {
    expect(
      validateDashboardSearch({ from: '2026-01-01', to: '2026-01-31' })
    ).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });

  it('drops mixed or invalid params', () => {
    expect(
      validateDashboardSearch({
        range: 'mtd',
        from: '2026-01-01',
        to: '2026-01-31',
      })
    ).toEqual({});
    expect(validateDashboardSearch({ range: 'nope' })).toEqual({});
    expect(
      validateDashboardSearch({ from: '2026-01-01', to: '2026-01-01' })
    ).toEqual({ from: '2026-01-01', to: '2026-01-01' });
  });
});
