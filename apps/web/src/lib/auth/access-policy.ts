export type AuthState = {
  isAuthenticated: boolean;
  orgId: string | null | undefined;
};

export type AccessPolicy =
  | 'requireAuth'
  | 'requireAuthAndOrg'
  | 'redirectIfAuthenticated';

export type AccessRedirect = '/sign-in/$' | '/onboarding' | '/dashboard';

export const resolveAccessRedirect = (
  state: AuthState,
  policy: AccessPolicy
): AccessRedirect | null => {
  switch (policy) {
    case 'requireAuth':
      return state.isAuthenticated ? null : '/sign-in/$';
    case 'requireAuthAndOrg':
      if (!state.isAuthenticated) {
        return '/sign-in/$';
      }
      return state.orgId ? null : '/onboarding';
    case 'redirectIfAuthenticated':
      if (!state.isAuthenticated) {
        return null;
      }
      return state.orgId ? '/dashboard' : '/onboarding';
    default: {
      const _exhaustive: never = policy;
      return _exhaustive;
    }
  }
};
