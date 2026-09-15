export type AccessState =
  | { status: 'signed-out' }
  | { status: 'signed-in-no-household'; signedInMemberId: string }
  | {
      status: 'signed-in-with-active-household';
      signedInMemberId: string;
      activeHouseholdId: string;
    };

export type ActiveHouseholdAccess = Extract<
  AccessState,
  { status: 'signed-in-with-active-household' }
>;

export type AccessPolicy = 'guest' | 'signed-in' | 'active-household';

export type AccessRedirect = '/sign-in/$' | '/onboarding' | '/dashboard';

export type AccessNavigation = {
  to: AccessRedirect;
  search?: { redirect: string };
};

export type CacheIdentity = {
  signedInMemberId: string | null;
  activeHouseholdId: string | null;
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

export const cacheIdentityFromAccess = (access: AccessState): CacheIdentity => {
  if (access.status === 'signed-out') {
    return { signedInMemberId: null, activeHouseholdId: null };
  }
  if (access.status === 'signed-in-no-household') {
    return {
      signedInMemberId: access.signedInMemberId,
      activeHouseholdId: null,
    };
  }
  return {
    signedInMemberId: access.signedInMemberId,
    activeHouseholdId: access.activeHouseholdId,
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
  const redirect = sanitizeReturnPath(requestedReturnPath);
  return redirect ? { to, search: { redirect } } : { to };
};

export const canResumeAccessWork = (
  clerkLoaded: boolean,
  clerkAccess: AccessState,
  routeAccess: AccessState | undefined
): boolean => {
  if (!clerkLoaded) {
    return true;
  }
  if (!routeAccess) {
    return false;
  }
  const clerkIdentity = cacheIdentityFromAccess(clerkAccess);
  const routeIdentity = cacheIdentityFromAccess(routeAccess);
  return (
    clerkIdentity.signedInMemberId === routeIdentity.signedInMemberId &&
    clerkIdentity.activeHouseholdId === routeIdentity.activeHouseholdId
  );
};
