import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveEffectiveDashboardPeriod } from '@/lib/dashboard-period/effectiveDashboardPeriod';
import { DASHBOARD_PERIOD_STORAGE_KEY } from '@/lib/dashboard-period/storage';

describe('resolveEffectiveDashboardPeriod', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('prefers URL search params over localStorage', () => {
    window.localStorage.setItem(
      DASHBOARD_PERIOD_STORAGE_KEY,
      JSON.stringify({ range: 'all' })
    );

    expect(resolveEffectiveDashboardPeriod({ range: '30d' })).toEqual({
      kind: 'shortcut',
      shortcut: '30d',
    });
  });

  it('falls back to localStorage when the URL has no period', () => {
    window.localStorage.setItem(
      DASHBOARD_PERIOD_STORAGE_KEY,
      JSON.stringify({
        from: '2026-01-01',
        to: '2026-01-15',
      })
    );

    expect(resolveEffectiveDashboardPeriod({})).toEqual({
      kind: 'custom',
      from: '2026-01-01',
      to: '2026-01-15',
    });
  });

  it('defaults to MTD when URL and localStorage are empty', () => {
    expect(resolveEffectiveDashboardPeriod({})).toEqual({
      kind: 'shortcut',
      shortcut: 'mtd',
    });
  });

  it('ignores invalid URL params and uses localStorage', () => {
    window.localStorage.setItem(
      DASHBOARD_PERIOD_STORAGE_KEY,
      JSON.stringify({ range: 'ytd' })
    );

    expect(
      resolveEffectiveDashboardPeriod({
        range: 'mtd',
        from: '2026-01-01',
        to: '2026-01-31',
      })
    ).toEqual({
      kind: 'shortcut',
      shortcut: 'ytd',
    });
  });
});
