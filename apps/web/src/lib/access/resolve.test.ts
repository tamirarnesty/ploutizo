import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getClientHouseholdBearer,
  resetWorkingSetForTests,
} from './working-set';

const fixtures = vi.hoisted(() => {
  const body = btoa(JSON.stringify({ sub: 'user_a', org_id: 'org_a' }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  const householdAJwt = `hdr.${body}.sig`;
  return {
    householdAJwt,
    resolveAccessOnRequest: vi.fn(() =>
      Promise.resolve({
        access: {
          status: 'signed-in-with-active-household' as const,
          signedInMemberId: 'user_a',
          activeHouseholdId: 'org_a',
        },
        requestBearer: householdAJwt,
      })
    ),
  };
});

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

vi.mock('./resolve.server', () => ({
  resolveAccessOnRequest: fixtures.resolveAccessOnRequest,
}));

describe('resolveAccessOnClient', () => {
  afterEach(() => {
    resetWorkingSetForTests();
    fixtures.resolveAccessOnRequest.mockClear();
  });

  it('remembers a transition bearer without putting it in the access snapshot', async () => {
    const { resolveAccessOnClient } = await import('./resolve');
    const access = await resolveAccessOnClient();

    expect(access).toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
    expect(access).not.toHaveProperty('transitionBearer');
    expect(access).not.toHaveProperty('bearerToken');
    await expect(getClientHouseholdBearer()).resolves.toBe(
      fixtures.householdAJwt
    );
  });
});
