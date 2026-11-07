import { describe, expect, it } from 'vitest';
import { allowsOfflineEntry } from './offline-entry';

describe('allowsOfflineEntry', () => {
  it('allows the app shell and in-app paths', () => {
    expect(allowsOfflineEntry('/')).toBe(true);
    expect(allowsOfflineEntry('/dashboard')).toBe(true);
    expect(allowsOfflineEntry('/transactions')).toBe(true);
  });

  it('excludes API, server functions, and Clerk routes', () => {
    expect(allowsOfflineEntry('/api')).toBe(false);
    expect(allowsOfflineEntry('/api/transactions')).toBe(false);
    expect(allowsOfflineEntry('/_serverFn')).toBe(false);
    expect(allowsOfflineEntry('/_serverFn/abc')).toBe(false);
    expect(allowsOfflineEntry('/sign-in')).toBe(false);
    expect(allowsOfflineEntry('/sign-in/factor-one')).toBe(false);
    expect(allowsOfflineEntry('/sign-up')).toBe(false);
    expect(allowsOfflineEntry('/sign-up/verify')).toBe(false);
    expect(allowsOfflineEntry('/__clerk')).toBe(false);
    expect(allowsOfflineEntry('/__clerk/handshake')).toBe(false);
    expect(allowsOfflineEntry('/.clerk')).toBe(false);
  });
});
