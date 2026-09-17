import { redirect } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import type { RouterContext } from '@/router';
import { getRequestAccess } from './resolve.server';
import { resolveAccessNavigation } from './access-state';
import type { AccessPolicy } from './access-state';

const resolveAccessForPolicy = createIsomorphicFn()
  .client((context: Pick<RouterContext, 'access'>) => context.access)
  .server(async () => getRequestAccess());

export const enforceAccessPolicy = async (
  context: Pick<RouterContext, 'access' | 'isReady'>,
  policy: AccessPolicy,
  locationHref: string
) => {
  // Bearer readiness is for household data, not identity. Skip only while Clerk
  // still looks signed-out on the client; otherwise guest routes stay mounted
  // after sign-in and Clerk's afterSignIn redirect races the router.
  if (
    !import.meta.env.SSR &&
    !context.isReady &&
    context.access.status === 'signed-out'
  ) {
    return;
  }

  const access = await resolveAccessForPolicy(context);

  const target = resolveAccessNavigation(access, policy, locationHref);
  if (target) {
    throw redirect(target);
  }
};
