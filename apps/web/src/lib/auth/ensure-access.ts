import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { resolveAccessRedirect, toAccessState } from './access-policy';
import type { AccessPolicy, AccessState } from './access-policy';

type EnsureAccessResult = {
  access: AccessState;
  bearerToken: string | null;
};

export const ensureAccess = createServerFn({ method: 'GET' })
  .inputValidator((policy: AccessPolicy) => policy)
  .handler(async ({ data: policy }): Promise<EnsureAccessResult> => {
    const { auth } = await import('@clerk/tanstack-react-start/server');
    const { bindRequestBearer } = await import('./request-bearer.server');
    const { isAuthenticated, userId, orgId, getToken } = await auth();
    const access = toAccessState({ isAuthenticated, userId, orgId });
    const target = resolveAccessRedirect(access, policy);
    if (target) {
      throw redirect({ to: target });
    }
    const bearerToken = (await getToken()) ?? null;
    bindRequestBearer(bearerToken);
    return { access, bearerToken };
  });
