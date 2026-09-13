import { redirect } from '@tanstack/react-router';
import { auth } from '@clerk/tanstack-react-start/server';
import { createServerFn } from '@tanstack/react-start';
import { resolveAccessRedirect } from './access-policy';
import type { AccessPolicy } from './access-policy';

const enforceAccessPolicy = async (policy: AccessPolicy) => {
  const { isAuthenticated, orgId } = await auth();
  const target = resolveAccessRedirect({ isAuthenticated, orgId }, policy);
  if (target) {
    throw redirect({ to: target });
  }
};

export const requireAuth = createServerFn({ method: 'GET' }).handler(
  async () => {
    await enforceAccessPolicy('requireAuth');
  }
);

export const requireAuthAndOrg = createServerFn({ method: 'GET' }).handler(
  async () => {
    await enforceAccessPolicy('requireAuthAndOrg');
  }
);

export const getAuthOrgId = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string | null> => {
    const { orgId } = await auth();
    return orgId ?? null;
  }
);

export const redirectIfAuthenticated = createServerFn({
  method: 'GET',
}).handler(async () => {
  await enforceAccessPolicy('redirectIfAuthenticated');
});
