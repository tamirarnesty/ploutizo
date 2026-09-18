import { describe, expect, it } from 'vitest';
import type { RouterContext } from '@/router';
import { isClientHouseholdLoaderReady } from './household-loader-ready';
import type { AccessState } from './access-state';

const householdAccess: AccessState = {
  status: 'signed-in-with-active-household',
  signedInMemberId: 'user_a',
  activeHouseholdId: 'org_a',
};

const householdContext = (
  overrides: Partial<RouterContext> = {}
): RouterContext => ({
  queryClient: {} as RouterContext['queryClient'],
  access: householdAccess,
  identityLoaded: true,
  isReady: true,
  ...overrides,
});

describe('isClientHouseholdLoaderReady', () => {
  it('is true when bearer-ready active-household access is published', () => {
    expect(isClientHouseholdLoaderReady(householdContext())).toBe(true);
  });

  it('is false before bearer readiness', () => {
    expect(
      isClientHouseholdLoaderReady(householdContext({ isReady: false }))
    ).toBe(false);
  });

  it('is false for signed-in members without an active household', () => {
    expect(
      isClientHouseholdLoaderReady(
        householdContext({
          access: {
            status: 'signed-in-no-household',
            signedInMemberId: 'user_a',
          },
        })
      )
    ).toBe(false);
  });
});
