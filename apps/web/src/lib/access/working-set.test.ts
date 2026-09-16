import { afterEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { claimsMatchAccess } from './access-state';
import {
  endWorkingSet,
  getClientHouseholdBearer,
  registerWorkingSetStore,
  rememberTransitionCredential,
  resetWorkingSetForTests,
  setClientBearerGetter,
  setLiveAccess,
} from './working-set';
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

const unsignedJwt = (payload: Record<string, unknown>) => {
  const body = btoa(JSON.stringify(payload))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `hdr.${body}.sig`;
};

const householdAJwt = unsignedJwt({
  sub: 'user_alex',
  org_id: 'org_a',
});

const householdBJwt = unsignedJwt({
  sub: 'user_alex',
  org_id: 'org_b',
});

describe('getHouseholdBearer', () => {
  afterEach(() => {
    resetWorkingSetForTests();
  });

  it('uses the transition bearer until Clerk React returns a matching token', async () => {
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBe(householdAJwt);
  });

  it('uses a Clerk token whose claims match live access', async () => {
    const clerkJwt = unsignedJwt({
      sub: 'user_alex',
      org_id: 'org_a',
    });
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(clerkJwt));

    await expect(getClientHouseholdBearer()).resolves.toBe(clerkJwt);
  });

  it('does not let a mismatched Clerk token beat a matching transition bearer', async () => {
    const staleHouseholdA = unsignedJwt({
      sub: 'user_alex',
      org_id: 'org_a',
    });
    rememberTransitionCredential(householdBJwt, alexInHouseholdB);
    setLiveAccess(alexInHouseholdB);
    setClientBearerGetter(() => Promise.resolve(staleHouseholdA));

    await expect(getClientHouseholdBearer()).resolves.toBe(householdBJwt);
  });

  it('keeps the transition bearer while Clerk React is still catching up after login', async () => {
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess(null);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBe(householdAJwt);
  });

  it('does not remember a bearer whose claims do not match the access snapshot', async () => {
    rememberTransitionCredential(
      unsignedJwt({ sub: 'user_other', org_id: 'org_a' }),
      alexInHouseholdA
    );
    setLiveAccess(null);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('does not authorize a request after the signed-in member signs out', async () => {
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess({ status: 'signed-out' });
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('does not authorize a request after the signed-in member changes', async () => {
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess({
      status: 'signed-in-with-active-household',
      signedInMemberId: 'user_sam',
      activeHouseholdId: 'org_a',
    });
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('does not treat an unknown identity as a match for a leftover bearer', async () => {
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess({
      status: 'signed-in-no-household',
      signedInMemberId: 'user_alex',
    });
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });
});

describe('claimsMatchAccess', () => {
  it('requires both signed-in member and active household claims', () => {
    const token = unsignedJwt({ sub: 'user_alex', org_id: 'org_a' });
    expect(claimsMatchAccess(token, alexInHouseholdA)).toBe(true);
    expect(claimsMatchAccess(token, alexInHouseholdB)).toBe(false);
  });
});

describe('endWorkingSet', () => {
  afterEach(() => {
    resetWorkingSetForTests();
    queryClient.clear();
  });

  it('discards cache, transition bearer, and registered stores', async () => {
    queryClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);
    rememberTransitionCredential(householdAJwt, alexInHouseholdA);
    setLiveAccess(alexInHouseholdA);
    let ended = false;
    registerWorkingSetStore({
      end: () => {
        ended = true;
      },
    });

    endWorkingSet();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(ended).toBe(true);
    setClientBearerGetter(() => Promise.resolve(null));
    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });
});
