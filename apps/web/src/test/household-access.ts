import type { ActiveHouseholdAccess } from '@/lib/auth/access-policy';

export const testActiveHouseholdAccess: ActiveHouseholdAccess = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_test',
  activeHouseholdId: 'org_test',
};
