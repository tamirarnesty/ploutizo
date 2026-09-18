import './working-set-cleanup';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { householdJwt, unsignedJwt } from '@/test/jwt-fixture';
import {
  getActiveQueryClient,
  getActiveWorkingSet,
  replaceActiveWorkingSet,
  resetWorkingSetRegistryForTests,
} from './working-set-registry';
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

const householdAJwt = householdJwt('user_alex', 'org_a');

describe('getHouseholdBearer', () => {
  afterEach(() => {
    resetWorkingSetRegistryForTests();
    resetBearerStateForTests();
  });

  it('uses a Clerk token from the registered getter', async () => {
    const clerkJwt = householdAJwt;
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

  it('assigns a new working set id on replacement', () => {
    const idBefore = getActiveWorkingSet().id;

    replaceActiveWorkingSet();

    expect(getActiveWorkingSet().id).toBe(idBefore + 1);
  });
});
