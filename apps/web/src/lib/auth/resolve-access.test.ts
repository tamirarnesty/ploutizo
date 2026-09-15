import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getClientBearerForTests,
  resetClientBearerForTests,
} from './get-bearer-token';

const resolveAccessOnRequest = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      access: {
        status: 'signed-in-with-active-household' as const,
        signedInMemberId: 'user_a',
        activeHouseholdId: 'org_a',
      },
      requestBearer: 'session-jwt',
    })
  )
);

vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal();
  if (typeof actual !== 'object' || actual === null) {
    throw new Error('Unexpected @tanstack/react-start module shape.');
  }
  return {
    ...actual,
    createServerFn: () => ({
      handler: (fn: () => unknown) => fn,
    }),
  };
});

vi.mock('./resolve-access.server', () => ({
  resolveAccessOnRequest,
}));

describe('resolveAccessOnClient', () => {
  afterEach(() => {
    resetClientBearerForTests();
    resolveAccessOnRequest.mockClear();
  });

  it('remembers a transition bearer without putting it in the access snapshot', async () => {
    const { resolveAccessOnClient } = await import('./resolve-access');
    const access = await resolveAccessOnClient();

    expect(access).toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
    expect(access).not.toHaveProperty('transitionBearer');
    expect(access).not.toHaveProperty('bearerToken');
    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });
});
