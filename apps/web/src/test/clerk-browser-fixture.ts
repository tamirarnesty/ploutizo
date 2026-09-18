import { vi } from 'vitest';
import type { InjectedClerk } from '@/app/AppAuthShell';

/** Clerk test publishable key (format only — no network calls in tests). */
export const CLERK_TEST_PUBLISHABLE_KEY = 'pk_test_Y2xlcmsudGVzdC5kZXYk';

type TestClerkOptions = {
  isSignedIn?: boolean;
  userId?: string | null;
  orgId?: string | null;
  getToken?: (options?: { skipCache?: boolean }) => Promise<string | null>;
};

const createSession = (
  userId: string,
  orgId: string | null,
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
) => {
  const organization = orgId ? { id: orgId, slug: 'test-org' } : null;
  const user = {
    id: userId,
    organizationMemberships: organization
      ? [
          {
            organization,
            role: 'org:admin',
            permissions: [],
          },
        ]
      : [],
  };

  return {
    id: 'sess_test',
    status: 'active',
    user,
    getToken,
    factorVerificationAge: [0, 0] as [number, number],
    lastActiveToken: { jwt: { claims: { sub: userId, org_id: orgId } } },
  };
};

const createEmittedResources = (
  session: ReturnType<typeof createSession> | null,
  orgId: string | null
) => ({
  client: {
    sessions: session ? [session] : [],
    signedInSessions: session ? [session] : [],
  },
  session,
  user: session?.user ?? null,
  organization: session && orgId ? { id: orgId, slug: 'test-org' } : null,
});

export const createTestClerk = (options: TestClerkOptions = {}) => {
  const {
    isSignedIn = false,
    userId = null,
    orgId = null,
    getToken = async () => null,
  } = options;

  const listeners = new Set<(payload: unknown) => void>();

  const session =
    isSignedIn && userId ? createSession(userId, orgId, getToken) : null;
  const emittedResources = createEmittedResources(session, orgId);

  const clerk = {
    loaded: true,
    client: emittedResources.client,
    session,
    user: emittedResources.user,
    organization: emittedResources.organization,
    __internal_lastEmittedResources: emittedResources,
    load: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn(
      (
        listener: (payload: unknown) => void,
        options?: { skipInitialEmit?: boolean }
      ) => {
        listeners.add(listener);
        if (!options?.skipInitialEmit) {
          listener(emittedResources);
        }
        return () => {
          listeners.delete(listener);
        };
      }
    ),
    removeListener: vi.fn((listener: (payload: unknown) => void) => {
      listeners.delete(listener);
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
    setActive: vi.fn().mockResolvedValue(undefined),
    emit: (payload: unknown = emittedResources) => {
      for (const listener of listeners) {
        listener(payload);
      }
    },
  };

  return clerk as unknown as InjectedClerk;
};

export const installClerkSignedOutFixture = () => {
  vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', CLERK_TEST_PUBLISHABLE_KEY);
  window.__clerk_init_state = {
    __internal_clerk_state: {
      __clerk_ssr_state: undefined,
      __publishableKey: CLERK_TEST_PUBLISHABLE_KEY,
    },
  };
  return createTestClerk();
};

export const resetClerkBrowserFixture = () => {
  delete window.__clerk_init_state;
  vi.unstubAllEnvs();
};

declare global {
  interface Window {
    __clerk_init_state?: {
      __internal_clerk_state?: {
        __clerk_ssr_state?: unknown;
        __publishableKey?: string;
      };
    };
  }
}
