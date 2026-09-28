import { describe, expect, it } from 'vitest';
import { cookieValueFrom } from '@/lib/cookies/cookie-value';

describe('cookieValueFrom', () => {
  it('reads the named entry from a cookie string', () => {
    expect(
      cookieValueFrom(
        'sidebar_state=true; dashboard_period=2026-01-01_2026-01-15; other=1',
        'dashboard_period'
      )
    ).toBe('2026-01-01_2026-01-15');
  });

  it('does not match a cookie whose name only starts with the given one', () => {
    expect(
      cookieValueFrom('dashboard_period_old=6m', 'dashboard_period')
    ).toBeUndefined();
  });
});
