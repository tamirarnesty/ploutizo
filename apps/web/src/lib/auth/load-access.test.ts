import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getClientBearerForTests,
  resetClientBearerForTests,
} from './get-bearer-token';

const ensureAccess = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      access: {
        status: 'signed-in-with-active-household' as const,
        signedInMemberId: 'user_a',
        activeHouseholdId: 'org_a',
      },
      bearerToken: 'session-jwt',
    })
  )
);

vi.mock('./ensure-access', () => ({
  ensureAccess,
}));

describe('loadAccessOnClient', () => {
  afterEach(() => {
    resetClientBearerForTests();
    ensureAccess.mockClear();
  });

  it('remembers the ensureAccess bearer for client API calls', async () => {
    const { loadAccessOnClient } = await import('./load-access');
    const result = await loadAccessOnClient('active-household');

    expect(result.access).toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });
});
