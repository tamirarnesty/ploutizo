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

  it('does not mint a token when the signed-in member is signed out', async () => {
    const cookieMint = vi.fn(() => Promise.resolve('cookie-jwt'));
    setClientBearerGetter(() => Promise.resolve(null));
    rememberClientBearer('stale-jwt');

    await expect(getClientBearerForTests()).resolves.toBeNull();
    expect(cookieMint).not.toHaveBeenCalled();
  });

  it('uses the session bearer from ensureAccess until Clerk React is bound', async () => {
    rememberClientBearer('session-jwt');
    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });
});
