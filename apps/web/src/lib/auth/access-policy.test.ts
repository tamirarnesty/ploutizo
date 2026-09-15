import { describe, expect, it } from 'vitest';
import {
  cacheIdentityFromAccess,
  resolveAccessRedirect,
  toAccessState,
} from './access-policy';
import type { AccessPolicy, AccessState } from './access-policy';

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
    policy: 'signed-in',
    state: signedInWithHousehold,
    label: 'onboarding / signed in, has household',
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
    policy: 'active-household',
    state: signedInWithHousehold,
    label: 'app shell / signed in, has household',
    expected: null,
  },
  {
    policy: 'guest',
    state: signedOut,
    label: 'home / signed out',
    expected: null,
  },
  {
    policy: 'guest',
    state: signedInNoHousehold,
    label: 'home / signed in, no household',
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

describe('toAccessState', () => {
  it('maps a Clerk session without a household to signed-in with no household', () => {
    expect(
      toAccessState({
        isAuthenticated: true,
        userId: 'user_123',
        orgId: null,
      })
    ).toEqual(signedInNoHousehold);
  });

  it('maps a Clerk session with an organization to an active household', () => {
    expect(
      toAccessState({
        isAuthenticated: true,
        userId: 'user_123',
        orgId: 'org_123',
      })
    ).toEqual(signedInWithHousehold);
  });
});

describe('cacheIdentityFromAccess', () => {
  it('uses both the signed-in member and the active household', () => {
    expect(cacheIdentityFromAccess(signedInWithHousehold)).toEqual({
      signedInMemberId: 'user_123',
      activeHouseholdId: 'org_123',
    });
  });
});
