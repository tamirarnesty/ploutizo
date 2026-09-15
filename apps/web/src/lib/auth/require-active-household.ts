import { enforceAccessPolicy } from './enforce-access';
import type { AccessState, ActiveHouseholdAccess } from './access-policy';

export const requireActiveHousehold = (
  access: AccessState | undefined,
  returnPath?: unknown
): ActiveHouseholdAccess => {
  enforceAccessPolicy(access, 'active-household', returnPath);
  if (access?.status !== 'signed-in-with-active-household') {
    throw new Error('Active household required');
  }
  return access;
};
