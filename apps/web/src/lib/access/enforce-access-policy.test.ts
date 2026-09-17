import { describe, expect, it } from 'vitest';
import { enforceAccessPolicy } from './enforce-access-policy';
import {
  resolveAccessNavigation,
  resolveAccessRedirect,
  sanitizeReturnPath,
  toAccessState,
} from './access-state';
import type { AccessPolicy, AccessState } from './access-state';

const signedOut: AccessState = { status: 'signed-out' };
const signedInNoHousehold: AccessState = {
  status: 'signed-in-no-household',
  signedInMemberId: 'user_123',
};
const signedInWithHousehold: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_123',
  activeHouseholdId: 'org_123',
};

type MatrixCase = {
  policy: AccessPolicy;
  state: AccessState;
  label: string;
  expected: ReturnType<typeof resolveAccessRedirect>;
};

const matrix: MatrixCase[] = [
  {
    policy: 'signed-in',
    state: signedOut,
    label: 'onboarding / signed out',
    expected: '/sign-in/$',
  },
  {
    policy: 'signed-in',
    state: signedInNoHousehold,
    label: 'onboarding / signed in, no household',
    expected: null,
  },
  {
    policy: 'active-household',
    state: signedOut,
    label: 'app shell / signed out',
    expected: '/sign-in/$',
  },
  {
    policy: 'active-household',
    state: signedInNoHousehold,
    label: 'app shell / signed in, no household',
    expected: '/onboarding',
  },
  {
    policy: 'guest',
    state: signedInWithHousehold,
    label: 'home / signed in, has household',
    expected: '/dashboard',
  },
];

describe('resolveAccessRedirect', () => {
  it.each(matrix)('$label → $expected', ({ policy, state, expected }) => {
    expect(resolveAccessRedirect(state, policy)).toBe(expected);
  });
});

describe('enforceAccessPolicy', () => {
  it('does not redirect while Clerk still looks signed-out on the client', async () => {
    await expect(
      enforceAccessPolicy(
        { access: signedOut, isReady: false },
        'active-household',
        '/accounts'
      )
    ).resolves.toBeUndefined();
  });

  it('redirects a signed-in visitor off a guest route before bearer readiness', async () => {
    await expect(
      enforceAccessPolicy(
        { access: signedInWithHousehold, isReady: false },
        'guest',
        '/sign-in'
      )
    ).rejects.toThrow();
  });

  it('preserves a local return path when sending a signed-out visitor to sign-in', () => {
    expect(
      resolveAccessNavigation(signedOut, 'active-household', '/accounts')
    ).toEqual({
      to: '/sign-in/$',
      search: { redirect: '/accounts' },
    });
  });

  it('omits an external return path when sending a signed-out visitor to sign-in', () => {
    expect(
      resolveAccessNavigation(
        signedOut,
        'active-household',
        'https://evil.example'
      )
    ).toEqual({ to: '/sign-in/$' });
  });
});

describe('toAccessState', () => {
  it('maps a signed-in member with an active household to that household', () => {
    expect(
      toAccessState({
        isAuthenticated: true,
        userId: 'user_123',
        orgId: 'org_123',
      })
    ).toEqual(signedInWithHousehold);
  });
});

describe('sanitizeReturnPath', () => {
  it('rejects absolute URLs', () => {
    expect(sanitizeReturnPath('https://evil.example/steal')).toBeUndefined();
  });
});
