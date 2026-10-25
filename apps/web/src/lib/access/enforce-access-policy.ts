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
  context: Pick<RouterContext, 'access' | 'identityLoaded'>,
  policy: AccessPolicy,
  locationHref: string
) => {
  if (!import.meta.env.SSR && !context.identityLoaded) {
    return;
  }

  const access = await resolveAccessForPolicy(context);

  const target = resolveAccessNavigation(access, policy, locationHref);
  if (target) {
    throw redirect(target);
  }
};
