import { redirect } from '@tanstack/react-router';
import { resolveAccessNavigation } from './access-policy';
import type { AccessPolicy, AccessState } from './access-policy';

export const enforceAccessPolicy = (
  access: AccessState | undefined,
  policy: AccessPolicy,
  returnPath?: unknown
) => {
  const target = resolveAccessNavigation(
    access ?? { status: 'signed-out' },
    policy,
    returnPath
  );
  if (target) {
    throw redirect(target);
  }
};
