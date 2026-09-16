import './working-set-cleanup';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import {
  endWorkingSet,
  getClientHouseholdBearer,
  registerWorkingSetCleanup,
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

describe('getHouseholdBearer', () => {
  afterEach(() => {
    resetWorkingSetForTests();
  });

  it('uses a Clerk token whose claims match live access', async () => {
    const clerkJwt = unsignedJwt({
      sub: 'user_alex',
      org_id: 'org_a',
    });
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(clerkJwt));

    await expect(getClientHouseholdBearer()).resolves.toBe(clerkJwt);
  });

  it('does not refresh a matching cached Clerk token', async () => {
    const clerkJwt = unsignedJwt({
      sub: 'user_alex',
      org_id: 'org_a',
    });
    const getToken = vi.fn(() => Promise.resolve(clerkJwt));
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(getToken);

    await expect(getClientHouseholdBearer()).resolves.toBe(clerkJwt);
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledWith(undefined);
  });

  it('refreshes with skipCache when the cached token is stale', async () => {
    const staleToken = unsignedJwt({ sub: 'user_alex', org_id: 'org_a' });
    const freshToken = unsignedJwt({ sub: 'user_alex', org_id: 'org_b' });
    const getToken = vi.fn((options?: { skipCache?: boolean }) =>
      Promise.resolve(options?.skipCache ? freshToken : staleToken)
    );
    setLiveAccess(alexInHouseholdB);
    setClientBearerGetter(getToken);

    await expect(getClientHouseholdBearer()).resolves.toBe(freshToken);
    expect(getToken).toHaveBeenCalledWith(undefined);
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it('returns null when Clerk cannot supply a matching token', async () => {
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('does not authorize a request after the signed-in member signs out', async () => {
    setLiveAccess({ status: 'signed-out' });
    setClientBearerGetter(() => Promise.resolve(householdAJwt));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('does not treat an unknown identity as a match for a leftover bearer', async () => {
    setLiveAccess({
      status: 'signed-in-no-household',
      signedInMemberId: 'user_alex',
    });
    setClientBearerGetter(() => Promise.resolve(householdAJwt));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });
});

describe('endWorkingSet', () => {
  afterEach(() => {
    resetWorkingSetForTests();
    queryClient.clear();
  });

  it('discards cache and registered stores', async () => {
    queryClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);
    setLiveAccess(alexInHouseholdA);
    let ended = false;
    registerWorkingSetCleanup(() => {
      ended = true;
    });

    endWorkingSet();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(ended).toBe(true);
    setClientBearerGetter(() => Promise.resolve(null));
    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });
});
