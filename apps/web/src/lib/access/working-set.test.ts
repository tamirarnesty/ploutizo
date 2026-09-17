import './working-set-cleanup';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveQueryClient,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';
import { getWorkingSetEpoch } from './working-set-epoch';
import {
  getClientHouseholdBearer,
  resetBearerStateForTests,
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
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
  });

  it('uses a Clerk token from the registered getter', async () => {
    const clerkJwt = unsignedJwt({
      sub: 'user_alex',
      org_id: 'org_a',
    });
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(clerkJwt));

    await expect(getClientHouseholdBearer()).resolves.toBe(clerkJwt);
  });

  it('returns null when Clerk cannot supply a token', async () => {
    setLiveAccess(alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });

  it('does not authorize a request after the signed-in member signs out', async () => {
    setLiveAccess({ status: 'signed-out' });
    setClientBearerGetter(() => Promise.resolve(householdAJwt));

    await expect(getClientHouseholdBearer()).resolves.toBeNull();
  });
});

describe('replaceActiveWorkingSet', () => {
  afterEach(() => {
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
  });

  it('discards the prior client cache on replacement', () => {
    const priorClient = getActiveQueryClient();
    priorClient.setQueryData(['accounts'], [{ id: 'acct_prior' }]);

    replaceActiveWorkingSet();

    expect(priorClient.getQueryCache().getAll()).toHaveLength(0);
    expect(getActiveQueryClient().getQueryCache().getAll()).toHaveLength(0);
    setClientBearerGetter(() => Promise.resolve(null));
  });

  it('bumps the working set epoch on replacement', () => {
    const epochBefore = getWorkingSetEpoch();

    replaceActiveWorkingSet();

    expect(getWorkingSetEpoch()).toBe(epochBefore + 1);
  });
});
