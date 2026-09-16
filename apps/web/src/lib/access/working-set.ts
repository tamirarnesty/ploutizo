import { createIsomorphicFn } from '@tanstack/react-start';
import { endWorkingSetQueryCache } from '@/lib/queryClient';
import { claimsMatchAccess, sameAccess } from './access-state';
import type { AccessState } from './access-state';

type TransitionCredential = {
  token: string;
  access: AccessState;
};

type WorkingSetStore = {
  end: () => void;
};

let transitionCredential: TransitionCredential | null = null;
let clientBearerGetter: (() => Promise<string | null>) | null = null;
let liveAccess: AccessState | null = null;
const workingSetStores: WorkingSetStore[] = [];

export const rememberTransitionCredential = (
  token: string | null,
  access: AccessState
) => {
  if (
    !token ||
    access.status === 'signed-out' ||
    !claimsMatchAccess(token, access)
  ) {
    transitionCredential = null;
    return;
  }
  transitionCredential = { token, access };
};

export const setLiveAccess = (access: AccessState | null) => {
  liveAccess = access;
};

export const setClientBearerGetter = (
  getter: (() => Promise<string | null>) | null
) => {
  clientBearerGetter = getter;
};

export const registerWorkingSetStore = (store: WorkingSetStore) => {
  workingSetStores.push(store);
};

export const resetWorkingSetForTests = () => {
  transitionCredential = null;
  clientBearerGetter = null;
  liveAccess = null;
  workingSetStores.length = 0;
};

const transitionMatchesLive = (): boolean => {
  if (!transitionCredential) {
    return false;
  }
  if (!liveAccess) {
    return true;
  }
  if (liveAccess.status === 'signed-out') {
    return false;
  }
  return sameAccess(transitionCredential.access, liveAccess);
};

export const getClientHouseholdBearer = async (): Promise<string | null> => {
  if (clientBearerGetter && liveAccess && liveAccess.status !== 'signed-out') {
    const token = await clientBearerGetter();
    if (token && claimsMatchAccess(token, liveAccess)) {
      transitionCredential = null;
      return token;
    }
  }
  if (transitionCredential && transitionMatchesLive()) {
    return transitionCredential.token;
  }
  return null;
};

export const endWorkingSet = () => {
  transitionCredential = null;
  endWorkingSetQueryCache();
  for (const store of workingSetStores) {
    store.end();
  }
};

export const getHouseholdBearer = createIsomorphicFn()
  .client(getClientHouseholdBearer)
  .server(async () => {
    const { getRequestBearer } = await import('./resolve.server');
    return getRequestBearer();
  });
