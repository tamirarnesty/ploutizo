import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/router';
import { getRequestAccess } from './resolve.server';
import { resolveAccessNavigation } from './access-state';
import type { AccessPolicy } from './access-state';

export const enforceAccessPolicy = async (
  context: Pick<RouterContext, 'access' | 'identityLoaded'>,
  policy: AccessPolicy,
  locationHref: string
) => {
  if (!import.meta.env.SSR && !context.identityLoaded) {
    return;
  }

  const access = import.meta.env.SSR
    ? await getRequestAccess()
    : context.access;

  const target = resolveAccessNavigation(access, policy, locationHref);
  if (target) {
    throw redirect(target);
  }
};
