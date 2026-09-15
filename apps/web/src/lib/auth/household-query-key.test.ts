import { describe, expect, it } from 'vitest';
import { householdQueryKey } from './household-query-key';
import type { ActiveHouseholdAccess } from './access-policy';

const alexInHouseholdA: ActiveHouseholdAccess = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_a',
};

const alexInHouseholdB: ActiveHouseholdAccess = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_b',
};

const samInHouseholdA: ActiveHouseholdAccess = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_sam',
  activeHouseholdId: 'org_a',
};

describe('householdQueryKey', () => {
  it('does not collide across active households for the same signed-in member', () => {
    expect(householdQueryKey(alexInHouseholdA, 'settlements')).not.toEqual(
      householdQueryKey(alexInHouseholdB, 'settlements')
    );
  });

  it('includes both the signed-in member and the active household', () => {
    expect(householdQueryKey(alexInHouseholdA, 'settlements')).toEqual([
      'household',
      'user_alex',
      'org_a',
      'settlements',
    ]);
  });

  it('does not collide across signed-in members of the same household', () => {
    expect(householdQueryKey(alexInHouseholdA, 'settlements')).not.toEqual(
      householdQueryKey(samInHouseholdA, 'settlements')
    );
  });
});
