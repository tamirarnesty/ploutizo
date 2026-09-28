import { describe, expect, it } from 'vitest';
import {
  dashboardPeriodCookieFrom,
  parseDashboardPeriodCookie,
  serializeDashboardPeriodCookie,
} from '@/lib/dashboard-period/cookie-value';

describe('dashboard period cookie value', () => {
  it.each([
    { kind: 'shortcut', shortcut: '6m' },
    { kind: 'custom', from: '2026-01-01', to: '2026-01-15' },
  ] as const)('round-trips %o', (selection) => {
    expect(
      parseDashboardPeriodCookie(serializeDashboardPeriodCookie(selection))
    ).toEqual(selection);
  });

  it.each(['nope', '2026-02-10_2026-02-01', '2026-01-01_2026-01-02_x', ''])(
    'rejects %j',
    (value) => {
      expect(parseDashboardPeriodCookie(value)).toBeNull();
    }
  );

  it('reads its entry from a cookie string', () => {
    expect(
      dashboardPeriodCookieFrom(
        'sidebar_state=true; dashboard_period=2026-01-01_2026-01-15; other=1'
      )
    ).toBe('2026-01-01_2026-01-15');
  });
});
