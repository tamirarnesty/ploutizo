import { auth } from '@clerk/tanstack-react-start/server';
import { redirect } from '@tanstack/react-router';
import { resolveAccessRedirect, toAccessState } from './access-policy';
import { bindRequestBearer } from './request-bearer.server';
import type { AccessPolicy, AccessState } from './access-policy';

export type EnsureAccessResult = {
  access: AccessState;
  bearerToken: string | null;
};

export const ensureAccessOnRequest = async (
  policy: AccessPolicy
): Promise<EnsureAccessResult> => {
  const { isAuthenticated, userId, orgId, getToken } = await auth();
  const access = toAccessState({ isAuthenticated, userId, orgId });
  const target = resolveAccessRedirect(access, policy);
  if (target) {
    throw redirect({ to: target });
  }
  const bearerToken = (await getToken()) ?? null;
  bindRequestBearer(bearerToken);
  return { access, bearerToken };
};
