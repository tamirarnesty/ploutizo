import { describe, expect, it } from 'vitest';
import { shouldInvalidateRouterOnAccessChange } from './should-invalidate-router-on-access-change';
import type { AccessState } from './access-state';

const signedOut: AccessState = { status: 'signed-out' };
const signedInNoHousehold: AccessState = {
  status: 'signed-in-no-household',
  signedInMemberId: 'user_a',
};
const householdA: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_a',
};
const householdB: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_b',
};

describe('shouldInvalidateRouterOnAccessChange', () => {
  it('does not invalidate on first mount before readiness', () => {
    expect(
      shouldInvalidateRouterOnAccessChange({
        previousAccessKey: undefined,
        access: signedOut,
        isReady: false,
        routerContextReady: false,
      })
    ).toBe(false);
  });

  it('invalidates when identity changes', () => {
    expect(
      shouldInvalidateRouterOnAccessChange({
        previousAccessKey: 'household:user_a:org_a',
        access: householdB,
        isReady: true,
        routerContextReady: true,
      })
    ).toBe(true);
  });

  it('invalidates when signed-out readiness becomes ready', () => {
    expect(
      shouldInvalidateRouterOnAccessChange({
        previousAccessKey: 'signed-out',
        access: signedOut,
        isReady: true,
        routerContextReady: false,
      })
    ).toBe(true);
  });

  it('invalidates when active-household bearer becomes ready', () => {
    expect(
      shouldInvalidateRouterOnAccessChange({
        previousAccessKey: 'household:user_a:org_a',
        access: householdA,
        isReady: true,
        routerContextReady: false,
      })
    ).toBe(true);
  });

  it('invalidates when onboarding readiness becomes ready', () => {
    expect(
      shouldInvalidateRouterOnAccessChange({
        previousAccessKey: 'member:user_a',
        access: signedInNoHousehold,
        isReady: true,
        routerContextReady: false,
      })
    ).toBe(true);
  });
});
