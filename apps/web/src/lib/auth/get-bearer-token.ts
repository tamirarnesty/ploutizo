import { createIsomorphicFn } from '@tanstack/react-start';
import type { AccessState, CacheIdentity } from './access-policy';

type TransitionCredential = {
  token: string;
  signedInMemberId: string;
  activeHouseholdId: string | null;
};

let transitionCredential: TransitionCredential | null = null;
let clientBearerGetter: (() => Promise<string | null>) | null = null;
let clientIdentity: CacheIdentity | null = null;

export const rememberTransitionCredential = (
  token: string | null,
  access: AccessState
) => {
  if (!token || access.status === 'signed-out') {
    transitionCredential = null;
    return;
  }
  transitionCredential = {
    token,
    signedInMemberId: access.signedInMemberId,
    activeHouseholdId:
      access.status === 'signed-in-with-active-household'
        ? access.activeHouseholdId
        : null,
  };
};

export const clearTransitionCredential = () => {
  transitionCredential = null;
};

export const setClientAccessIdentity = (identity: CacheIdentity | null) => {
  clientIdentity = identity;
};

export const setClientBearerGetter = (
  getter: (() => Promise<string | null>) | null
) => {
  clientBearerGetter = getter;
};

export const resetClientBearerForTests = () => {
  transitionCredential = null;
  clientBearerGetter = null;
  clientIdentity = null;
};

const transitionMatchesCurrentIdentity = () => {
  if (!transitionCredential) {
    return false;
  }
  if (!clientIdentity || clientIdentity.signedInMemberId === null) {
    return true;
  }
  return (
    clientIdentity.signedInMemberId === transitionCredential.signedInMemberId &&
    clientIdentity.activeHouseholdId === transitionCredential.activeHouseholdId
  );
};

const getClientBearer = async (): Promise<string | null> => {
  if (clientBearerGetter) {
    const token = await clientBearerGetter();
    if (token) {
      transitionCredential = null;
      return token;
    }
  }
  if (transitionCredential && transitionMatchesCurrentIdentity()) {
    return transitionCredential.token;
  }
  return null;
};

export const getClientBearerForTests = getClientBearer;

export const getBearerToken = createIsomorphicFn()
  .client(getClientBearer)
  .server(async () => {
    const { getRequestBearer } = await import('./request-bearer.server');
    return getRequestBearer();
  });
