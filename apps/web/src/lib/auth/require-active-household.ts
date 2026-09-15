import type { AccessState, ActiveHouseholdAccess } from './access-policy';

export const requireActiveHousehold = (
  access: AccessState | undefined
): ActiveHouseholdAccess => {
  if (access?.status !== 'signed-in-with-active-household') {
    throw new Error('Active household is required');
  }
  return access;
};
