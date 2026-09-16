import type { AccessState } from './access-state';

type BearerClaims = {
  sub?: unknown;
  org_id?: unknown;
  o?: { id?: unknown };
};

export const decodeBearerClaims = (token: string): BearerClaims | null => {
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
