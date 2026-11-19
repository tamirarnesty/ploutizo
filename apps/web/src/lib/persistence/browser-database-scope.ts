import type { AccessState } from '@/lib/access/access-state';

/**
 * Every scoped database lives under this OPFS directory.
 * Sign-out deletes the directory, so a household visited earlier in the
 * session does not stay on the device.
 */
export const BROWSER_PERSISTENCE_DIRECTORY = 'ploutizo-offline';

export type BrowserPersistenceScope = {
  signedInMemberId: string;
  activeHouseholdId: string;
};

/**
 * Clerk ids are `user_` / `org_` plus base62. Reject anything else so a
 * value cannot add a path segment or leave the persistence directory.
 */
const SAFE_SCOPE_ID = /^[A-Za-z0-9_-]+$/;

const isSafeScopeId = (value: string) => SAFE_SCOPE_ID.test(value);

/** Active household only. Signed-out and onboarding have no database. */
export const browserPersistenceScope = (
  access: AccessState
): BrowserPersistenceScope | null => {
  if (access.status !== 'signed-in-with-active-household') return null;
  if (
    !isSafeScopeId(access.signedInMemberId) ||
    !isSafeScopeId(access.activeHouseholdId)
  ) {
    return null;
  }
  return {
    signedInMemberId: access.signedInMemberId,
    activeHouseholdId: access.activeHouseholdId,
  };
};

export const browserDatabaseName = (scope: BrowserPersistenceScope) => {
  if (
    !isSafeScopeId(scope.signedInMemberId) ||
    !isSafeScopeId(scope.activeHouseholdId)
  ) {
    throw new Error('Browser persistence scope id is not safe');
  }
  return `${BROWSER_PERSISTENCE_DIRECTORY}/${scope.signedInMemberId}/${scope.activeHouseholdId}.sqlite`;
};

/**
 * Tabs that share a file must share a coordinator. The name is the database
 * path, so a different member or household elects a different leader.
 */
export const browserCoordinatorName = (scope: BrowserPersistenceScope) =>
  browserDatabaseName(scope);
