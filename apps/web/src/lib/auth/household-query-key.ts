import type { ActiveHouseholdAccess } from './access-policy';

export const householdQueryKey = (
  access: ActiveHouseholdAccess,
  ...parts: readonly unknown[]
) =>
  [
    'household',
    access.signedInMemberId,
    access.activeHouseholdId,
    ...parts,
  ] as const;
