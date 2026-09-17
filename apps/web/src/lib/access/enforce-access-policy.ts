import { redirect } from '@tanstack/react-router';
import type { RouterContext } from '@/router';
import { resolveAccessNavigation } from './access-state';
import type { AccessPolicy } from './access-state';

export const enforceAccessPolicy = (
  context: Pick<RouterContext, 'access' | 'isReady'>,
  policy: AccessPolicy,
  locationHref: string
) => {
  if (!context.isReady) {
    return;
  }
  const target = resolveAccessNavigation(context.access, policy, locationHref);
  if (target) {
    throw redirect(target);
  }
};
