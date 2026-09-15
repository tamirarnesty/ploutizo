import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearTransitionCredential,
  getClientBearerForTests,
  rememberTransitionCredential,
  resetClientBearerForTests,
  setClientAccessIdentity,
  setClientBearerGetter,
} from './get-bearer-token';
import type { AccessState } from './access-policy';

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

describe('getClientBearer', () => {
  afterEach(() => {
    resetClientBearerForTests();
  });

  it('uses the transition bearer until Clerk React returns a token', async () => {
    rememberTransitionCredential('session-jwt', alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('uses Clerk React once it returns a token', async () => {
    rememberTransitionCredential('session-jwt', alexInHouseholdA);
    setClientBearerGetter(() => Promise.resolve('clerk-jwt'));

    await expect(getClientBearerForTests()).resolves.toBe('clerk-jwt');
  });

  it('keeps the transition bearer while Clerk React is still catching up after login', async () => {
    rememberTransitionCredential('session-jwt', alexInHouseholdA);
    setClientAccessIdentity({
      signedInMemberId: null,
      activeHouseholdId: null,
    });
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBe('session-jwt');
  });

  it('does not reuse a leftover bearer after the signed-in member signs out', async () => {
    rememberTransitionCredential('session-jwt', alexInHouseholdA);
    clearTransitionCredential();
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBeNull();
  });

  it('does not authorize a request after the signed-in member changes', async () => {
    rememberTransitionCredential('alex-jwt', alexInHouseholdA);
    setClientAccessIdentity({
      signedInMemberId: 'user_sam',
      activeHouseholdId: 'org_a',
    });
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBeNull();
  });

  it('does not authorize a request after the active household changes', async () => {
    rememberTransitionCredential('household-a-jwt', alexInHouseholdA);
    setClientAccessIdentity({
      signedInMemberId: 'user_alex',
      activeHouseholdId: 'org_b',
    });
    setClientBearerGetter(() => Promise.resolve(null));

    await expect(getClientBearerForTests()).resolves.toBeNull();
    rememberTransitionCredential('household-b-jwt', alexInHouseholdB);
    await expect(getClientBearerForTests()).resolves.toBe('household-b-jwt');
  });
});
