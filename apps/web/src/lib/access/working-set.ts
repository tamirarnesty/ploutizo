import { createIsomorphicFn } from '@tanstack/react-start';
import { endWorkingSetQueryCache } from '@/lib/queryClient';
import { claimsMatchAccess, sameAccess } from './access-state';
import type { AccessState } from './access-state';

type TransitionCredential = {
  token: string;
  access: AccessState;
};

type WorkingSetCleanup = () => void;

let transitionCredential: TransitionCredential | null = null;
let clientBearerGetter:
  | ((options?: { skipCache?: boolean }) => Promise<string | null>)
  | null = null;
let liveAccess: AccessState | null = null;
const workingSetCleanups: WorkingSetCleanup[] = [];

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
  getter: ((options?: { skipCache?: boolean }) => Promise<string | null>) | null
) => {
  clientBearerGetter = getter;
};

export const registerWorkingSetCleanup = (cleanup: WorkingSetCleanup) => {
  workingSetCleanups.push(cleanup);
};

export const resetWorkingSetForTests = () => {
  transitionCredential = null;
  clientBearerGetter = null;
  liveAccess = null;
  workingSetCleanups.length = 0;
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
    for (const options of [undefined, { skipCache: true }]) {
      const token = await clientBearerGetter(options);
      if (token && claimsMatchAccess(token, liveAccess)) {
        transitionCredential = null;
        return token;
      }
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
  for (const cleanup of workingSetCleanups) {
    cleanup();
  }
};

export const getHouseholdBearer = createIsomorphicFn()
  .client(getClientHouseholdBearer)
  .server(async () => {
    const { getRequestBearer } = await import('./resolve.server');
    return getRequestBearer();
  });
