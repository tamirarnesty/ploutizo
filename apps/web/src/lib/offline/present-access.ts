import type { BrowserPersistenceScope } from '@/lib/persistence/browser-database-scope';
import type { AccessState } from '@/lib/access/access-state';

export type PresentAccessInput = {
  clerkLoaded: boolean;
  clerkAccess: AccessState;
  offline: boolean;
  remembered: BrowserPersistenceScope | null;
  /** Online revalidation of an offline launch found no session. */
  expired: boolean;
};

/**
 * While offline, a remembered household is the session. Clerk's signed-out
 * result during a failed load must not wipe that database. Online, Clerk wins,
 * and an expired offline launch is signed out.
 */
export const presentAccess = ({
  clerkLoaded,
  clerkAccess,
  offline,
  remembered,
  expired,
}: PresentAccessInput): AccessState => {
  if (!offline && expired) return { status: 'signed-out' };
  if (!offline) return clerkAccess;
  if (clerkLoaded && clerkAccess.status === 'signed-in-with-active-household') {
    return clerkAccess;
  }
  if (clerkLoaded && clerkAccess.status === 'signed-in-no-household') {
    return clerkAccess;
  }
  if (remembered) {
    return {
      status: 'signed-in-with-active-household',
      signedInMemberId: remembered.signedInMemberId,
      activeHouseholdId: remembered.activeHouseholdId,
    };
  }
  return { status: 'signed-out' };
};
