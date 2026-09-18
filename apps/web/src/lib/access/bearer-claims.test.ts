import { describe, expect, it } from 'vitest';
import { unsignedJwt } from '@/test/jwt-fixture';
import { claimsMatchAccess } from './bearer-claims';
import type { AccessState } from './access-state';

const alexInHouseholdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_a',
};

const alexInHouseholdB: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_alex',
  activeHouseholdId: 'org_b',
};

describe('claimsMatchAccess', () => {
  it('requires both signed-in member and active household claims', () => {
    const token = unsignedJwt({ sub: 'user_alex', org_id: 'org_a' });
    expect(claimsMatchAccess(token, alexInHouseholdA)).toBe(true);
    expect(claimsMatchAccess(token, alexInHouseholdB)).toBe(false);
  });

  it('matches Clerk session tokens that nest the household id under o.id', () => {
    const token = unsignedJwt({
      sub: 'user_alex',
      o: { id: 'org_a' },
    });
    expect(claimsMatchAccess(token, alexInHouseholdA)).toBe(true);
    expect(claimsMatchAccess(token, alexInHouseholdB)).toBe(false);
  });
});
