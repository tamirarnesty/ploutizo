import { auth } from '@clerk/tanstack-react-start/server';
import { setResponseHeader } from '@tanstack/react-start/server';
import { toAccessState } from './access-policy';
import { bindRequestBearer } from './request-bearer.server';
import type { AccessState } from './access-policy';

export type ResolvedAccess = {
  access: AccessState;
  requestBearer: string | null;
};

export const resolveAccessOnRequest = async (): Promise<ResolvedAccess> => {
  const { isAuthenticated, userId, orgId, getToken } = await auth();
  const access = toAccessState({ isAuthenticated, userId, orgId });
  if (access.status !== 'signed-out') {
    setResponseHeader('Cache-Control', 'private, no-store');
  }
  const requestBearer = (await getToken()) ?? null;
  bindRequestBearer(requestBearer);
  return { access, requestBearer };
};
