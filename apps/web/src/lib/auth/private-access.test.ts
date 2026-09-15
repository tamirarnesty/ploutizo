import { describe, expect, it } from 'vitest';
import { assertPrivateAccess } from './private-access';

describe('assertPrivateAccess', () => {
  it('rejects a signed-out caller before returning private data', () => {
    expect(() => assertPrivateAccess({ status: 'signed-out' })).toThrow(
      'Signed-in member required'
    );
  });

  it('allows a signed-in member without an active household', () => {
    expect(
      assertPrivateAccess({
        status: 'signed-in-no-household',
        signedInMemberId: 'user_a',
      })
    ).toEqual({
      status: 'signed-in-no-household',
      signedInMemberId: 'user_a',
    });
  });

  it('allows a signed-in member with an active household', () => {
    expect(
      assertPrivateAccess({
        status: 'signed-in-with-active-household',
        signedInMemberId: 'user_a',
        activeHouseholdId: 'org_a',
      })
    ).toEqual({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_a',
      activeHouseholdId: 'org_a',
    });
  });
});
