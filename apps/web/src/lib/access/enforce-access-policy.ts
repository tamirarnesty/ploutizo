import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/router';
import { resolveAccessNavigation } from './access-state';
import type { AccessPolicy } from './access-state';

export const enforceAccessPolicy = (
  context: Pick<RouterContext, 'access' | 'isReady'>,
  policy: AccessPolicy,
  locationHref: string
) => {
  // Bearer readiness is for household data, not identity. Skip only while Clerk
  // still looks signed-out; otherwise guest routes stay mounted after sign-in
  // and Clerk's afterSignIn redirect races the router.
  if (!context.isReady && context.access.status === 'signed-out') {
    return;
  }
  const target = resolveAccessNavigation(context.access, policy, locationHref);
  if (target) {
    throw redirect(target);
  }
};
