export type AccessState =
  | { status: 'signed-out' }
  | { status: 'signed-in-no-household'; signedInMemberId: string }
  | {
      status: 'signed-in-with-active-household';
      signedInMemberId: string;
      activeHouseholdId: string;
    };

export type AccessPolicy = 'guest' | 'signed-in' | 'active-household';

export type AccessRedirect = '/sign-in/$' | '/onboarding' | '/dashboard';

export type AccessNavigation = {
  to: AccessRedirect;
  search?: { redirect: string };
};

export const toAccessState = ({
  isAuthenticated,
  userId,
  orgId,
}: {
  isAuthenticated: boolean;
  userId: string | null | undefined;
  orgId: string | null | undefined;
}): AccessState => {
  if (!isAuthenticated || !userId) {
    return { status: 'signed-out' };
  }
  if (!orgId) {
    return { status: 'signed-in-no-household', signedInMemberId: userId };
  }
  return {
    status: 'signed-in-with-active-household',
    signedInMemberId: userId,
    activeHouseholdId: orgId,
  };
};

export const resolveAccessRedirect = (
  state: AccessState,
  policy: AccessPolicy
): AccessRedirect | null => {
  switch (policy) {
    case 'guest':
      if (state.status === 'signed-out') {
        return null;
      }
      return state.status === 'signed-in-with-active-household'
        ? '/dashboard'
        : '/onboarding';
    case 'signed-in':
      return state.status === 'signed-out' ? '/sign-in/$' : null;
    case 'active-household':
      if (state.status === 'signed-out') {
        return '/sign-in/$';
      }
      return state.status === 'signed-in-with-active-household'
        ? null
        : '/onboarding';
    default: {
      const _exhaustive: never = policy;
      return _exhaustive;
    }
  }
};

const RETURN_PATH_ORIGIN = 'https://ploutizo.invalid';

export const sanitizeReturnPath = (value: unknown): string | undefined => {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return undefined;
  }
  if (value.includes('\\') || value.includes('://')) {
    return undefined;
  }

  try {
    const url = new URL(value, RETURN_PATH_ORIGIN);
    if (url.origin !== RETURN_PATH_ORIGIN) {
      return undefined;
    }
    if (url.pathname.startsWith('//')) {
      return undefined;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
};

export const resolveAccessNavigation = (
  state: AccessState,
  policy: AccessPolicy,
  requestedReturnPath?: unknown
): AccessNavigation | null => {
  const to = resolveAccessRedirect(state, policy);
  if (!to) {
    return null;
  }
  if (to !== '/sign-in/$') {
    return { to };
  }
  const redirectPath = sanitizeReturnPath(requestedReturnPath);
  return redirectPath ? { to, search: { redirect: redirectPath } } : { to };
};

type BearerClaims = {
  sub?: unknown;
  org_id?: unknown;
  o?: { id?: unknown };
};

const decodeBearerClaims = (token: string): BearerClaims | null => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const normalized = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    );
    return JSON.parse(atob(padded)) as BearerClaims;
  } catch {
    return null;
  }
};

const householdIdFromClaims = (claims: BearerClaims): string | undefined => {
  if (typeof claims.org_id === 'string' && claims.org_id !== '') {
    return claims.org_id;
  }
  const nestedId = claims.o?.id;
  if (typeof nestedId === 'string' && nestedId !== '') {
    return nestedId;
  }
  return undefined;
};

export const claimsMatchAccess = (
  token: string,
  access: AccessState
): boolean => {
  if (access.status === 'signed-out') {
    return false;
  }
  const claims = decodeBearerClaims(token);
  if (!claims || typeof claims.sub !== 'string') {
    return false;
  }
  if (claims.sub !== access.signedInMemberId) {
    return false;
  }
  const householdId = householdIdFromClaims(claims);
  if (access.status === 'signed-in-no-household') {
    return householdId === undefined;
  }
  return householdId === access.activeHouseholdId;
};
