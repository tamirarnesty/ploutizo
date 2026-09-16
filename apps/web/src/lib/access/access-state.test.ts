import { describe, expect, it } from 'vitest';
import {
  isAccessAligned,
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
  it('maps a signed-in member without a household to signed-in with no household', () => {
    expect(
      toAccessState({
        isAuthenticated: true,
        userId: 'user_123',
        orgId: null,
      })
    ).toEqual(signedInNoHousehold);
  });

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
  it('keeps a local app path', () => {
    expect(sanitizeReturnPath('/accounts')).toBe('/accounts');
  });

  it('keeps a local path with search and hash', () => {
    expect(sanitizeReturnPath('/import?tab=history#drafts')).toBe(
      '/import?tab=history#drafts'
    );
  });

  it('rejects absolute URLs', () => {
    expect(sanitizeReturnPath('https://evil.example/steal')).toBeUndefined();
  });

  it('rejects protocol-relative URLs', () => {
    expect(sanitizeReturnPath('//evil.example/steal')).toBeUndefined();
  });

  it('rejects backslash-normalized open redirects', () => {
    expect(sanitizeReturnPath('/\\evil.example')).toBeUndefined();
  });

  it('rejects paths that normalize to protocol-relative', () => {
    expect(sanitizeReturnPath('/.//evil.example')).toBeUndefined();
    expect(sanitizeReturnPath('/..//evil.example')).toBeUndefined();
  });
});

describe('resolveAccessNavigation', () => {
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

describe('isAccessAligned', () => {
  it('does not resume household work against a stale route snapshot', () => {
    expect(
      isAccessAligned(signedInWithHousehold, {
        status: 'signed-in-with-active-household',
        signedInMemberId: 'user_123',
        activeHouseholdId: 'org_other',
      })
    ).toBe(false);
  });

  it('resumes only when provider identity and route access agree', () => {
    expect(isAccessAligned(signedInWithHousehold, signedInWithHousehold)).toBe(
      true
    );
  });

  it('treats a loaded signed-out provider as disagreement with a signed-in route', () => {
    expect(isAccessAligned(signedOut, signedInWithHousehold)).toBe(false);
  });
});
