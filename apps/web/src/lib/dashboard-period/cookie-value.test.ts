import { describe, expect, it } from 'vitest';
import {
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
});
