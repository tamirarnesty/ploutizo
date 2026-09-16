import { auth } from '@clerk/tanstack-react-start/server';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';
import { claimsMatchAccess, toAccessState } from './access-state';
import type { AccessState } from './access-state';

export type ResolvedAccess = {
  access: AccessState;
  requestBearer: string | null;
};

const requestBearers = new WeakMap<Request, string | null>();

export const bindRequestBearer = (token: string | null) => {
  requestBearers.set(getRequest(), token);
};

export const getRequestBearer = (): string | null => {
  try {
    const request = getRequest();
    if (requestBearers.has(request)) {
      return requestBearers.get(request) ?? null;
    }
  } catch {
    return null;
  }
  return null;
};

export const resolveAccessOnRequest = async (): Promise<ResolvedAccess> => {
  const { isAuthenticated, userId, orgId, getToken } = await auth();
  const access = toAccessState({ isAuthenticated, userId, orgId });
  if (access.status !== 'signed-out') {
    setResponseHeader('Cache-Control', 'private, no-store');
  }
  const requestBearer = (await getToken()) ?? null;
  const boundBearer =
    requestBearer && claimsMatchAccess(requestBearer, access)
      ? requestBearer
      : null;
  bindRequestBearer(boundBearer);
  return { access, requestBearer: boundBearer };
};
