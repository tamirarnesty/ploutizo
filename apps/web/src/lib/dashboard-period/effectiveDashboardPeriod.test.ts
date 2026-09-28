import { describe, expect, it } from 'vitest';
import { dashboardPeriodRedirectSearch } from '@/lib/dashboard-period/effectiveDashboardPeriod';

describe('dashboardPeriodRedirectSearch', () => {
  it('redirects a URL without a period to the persisted one', () => {
    expect(
      dashboardPeriodRedirectSearch(
        {},
        { kind: 'custom', from: '2026-01-01', to: '2026-01-15' }
      )
    ).toEqual({ from: '2026-01-01', to: '2026-01-15' });
  });

  it('redirects to MTD when nothing is persisted', () => {
    expect(dashboardPeriodRedirectSearch({}, null)).toEqual({ range: 'mtd' });
  });

  it('keeps a URL that names a period, even when another is persisted', () => {
    expect(
      dashboardPeriodRedirectSearch(
        { range: '30d' },
        { kind: 'shortcut', shortcut: 'all' }
      )
    ).toBeNull();
  });
});
