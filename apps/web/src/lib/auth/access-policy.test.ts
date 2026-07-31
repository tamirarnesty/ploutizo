import { describe, expect, it } from 'vitest';
import {
  resolveAccessRedirect,
  type AccessPolicy,
  type AuthState,
} from './access-policy';

const signedOut: AuthState = { isAuthenticated: false, orgId: null };
const signedInNoOrg: AuthState = { isAuthenticated: true, orgId: null };
const signedInWithOrg: AuthState = {
  isAuthenticated: true,
  orgId: 'org_123',
};

type MatrixCase = {
  policy: AccessPolicy;
  state: AuthState;
  label: string;
  expected: ReturnType<typeof resolveAccessRedirect>;
};

const matrix: MatrixCase[] = [
  // Public surfaces — no server fn, documented for completeness
  // sign-in / sign-up: no policy

  // requireAuth (onboarding)
  {
    policy: 'requireAuth',
    state: signedOut,
    label: 'onboarding / signed out',
    expected: '/sign-in/$',
  },
  {
    policy: 'requireAuth',
    state: signedInNoOrg,
    label: 'onboarding / signed in, no org',
    expected: null,
  },
  {
    policy: 'requireAuth',
    state: signedInWithOrg,
    label: 'onboarding / signed in, has org',
    expected: null,
  },

  // requireAuthAndOrg (_layout app shell)
  {
    policy: 'requireAuthAndOrg',
    state: signedOut,
    label: 'app shell / signed out',
    expected: '/sign-in/$',
  },
  {
    policy: 'requireAuthAndOrg',
    state: signedInNoOrg,
    label: 'app shell / signed in, no org',
    expected: '/onboarding',
  },
  {
    policy: 'requireAuthAndOrg',
    state: signedInWithOrg,
    label: 'app shell / signed in, has org',
    expected: null,
  },

  // redirectIfAuthenticated (home /)
  {
    policy: 'redirectIfAuthenticated',
    state: signedOut,
    label: 'home / signed out',
    expected: null,
  },
  {
    policy: 'redirectIfAuthenticated',
    state: signedInNoOrg,
    label: 'home / signed in, no org',
    expected: '/onboarding',
  },
  {
    policy: 'redirectIfAuthenticated',
    state: signedInWithOrg,
    label: 'home / signed in, has org',
    expected: '/dashboard',
  },
];

describe('resolveAccessRedirect', () => {
  it.each(matrix)('$label → $expected', ({ policy, state, expected }) => {
    expect(resolveAccessRedirect(state, policy)).toBe(expected);
  });
});
