import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/router';
import { resolveAccessNavigation } from './access-state';
import type { AccessPolicy } from './access-state';

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

  const access = import.meta.env.SSR
    ? await (await import('./resolve.server')).getRequestAccess()
    : context.access;

  const target = resolveAccessNavigation(access, policy, locationHref);
  if (target) {
    throw redirect(target);
  }
};
