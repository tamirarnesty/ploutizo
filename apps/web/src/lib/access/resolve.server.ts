import { auth } from '@clerk/tanstack-react-start/server';
import { setResponseHeader } from '@tanstack/react-start/server';
import { claimsMatchAccess } from './bearer-claims';
import { toAccessState } from './access-state';
import type { AccessState } from './access-state';

export const getRequestAccess = async (): Promise<AccessState> => {
  const { isAuthenticated, userId, orgId } = await auth();
  return toAccessState({ isAuthenticated, userId, orgId });
};

export const getRequestHouseholdBearer = async (): Promise<string | null> => {
  const { isAuthenticated, userId, orgId, getToken } = await auth();
  const access = toAccessState({ isAuthenticated, userId, orgId });
  if (access.status !== 'signed-out') {
    setResponseHeader('Cache-Control', 'private, no-store');
  }
  if (access.status === 'signed-out') {
    return null;
  }
  const token = (await getToken()) ?? null;
  if (!token || !claimsMatchAccess(token, access)) {
    return null;
  }
  return token;
};
