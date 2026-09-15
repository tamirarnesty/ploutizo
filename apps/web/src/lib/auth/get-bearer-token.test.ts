import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getClientBearerForTests,
  rememberClientBearer,
  resetClientBearerForTests,
  setClientBearerGetter,
} from './get-bearer-token';

describe('getClientBearer', () => {
  afterEach(() => {
    resetClientBearerForTests();
  });

  it('uses the session bearer from ensureAccess until Clerk React returns a token', async () => {
    rememberClientBearer('session-jwt');
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('uses Clerk React once it returns a token', async () => {
    rememberClientBearer('session-jwt');
    setClientBearerGetter(() => Promise.resolve('clerk-jwt'));

    await expect(getClientBearerForTests()).resolves.toBe('clerk-jwt');
  });

  it('does not reuse a leftover bearer after the signed-in member signs out', async () => {
    const cookieMint = vi.fn(() => Promise.resolve('cookie-jwt'));
    rememberClientBearer(null);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBeNull();
    expect(cookieMint).not.toHaveBeenCalled();
  });
});
