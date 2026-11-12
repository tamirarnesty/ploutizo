import { describe, expect, it } from 'vitest';
import { allowsOfflineEntry } from './offline-entry';
import { isPrerenderedOfflineShell } from './offline-shell-request';

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

describe('isPrerenderedOfflineShell', () => {
  const shellRequest = () =>
    new Request('http://127.0.0.1:3000/', {
      headers: { 'X-TSS_SHELL': 'true' },
    });

  it('is only the prerender request that carries the shell header', () => {
    const previous = process.env.TSS_PRERENDERING;
    delete process.env.TSS_PRERENDERING;
    expect(isPrerenderedOfflineShell(shellRequest())).toBe(false);

    process.env.TSS_PRERENDERING = 'true';
    try {
      expect(isPrerenderedOfflineShell(shellRequest())).toBe(true);
      expect(
        isPrerenderedOfflineShell(
          new Request('http://127.0.0.1:3000/dashboard')
        )
      ).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.TSS_PRERENDERING;
      else process.env.TSS_PRERENDERING = previous;
    }
  });
});
