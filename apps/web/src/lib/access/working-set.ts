import { createIsomorphicFn } from '@tanstack/react-start';
import { endWorkingSetQueryCache } from '@/lib/queryClient';
import { claimsMatchAccess } from './access-state';
import type { AccessState } from './access-state';

type WorkingSetCleanup = () => void;

let clientBearerGetter:
  | ((options?: { skipCache?: boolean }) => Promise<string | null>)
  | null = null;
let liveAccess: AccessState | null = null;
const workingSetCleanups: WorkingSetCleanup[] = [];

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
  clientBearerGetter = null;
  liveAccess = null;
  workingSetCleanups.length = 0;
};

export const getClientHouseholdBearer = async (): Promise<string | null> => {
  if (
    !clientBearerGetter ||
    !liveAccess ||
    liveAccess.status === 'signed-out'
  ) {
    return null;
  }
  for (const options of [undefined, { skipCache: true }]) {
    const token = await clientBearerGetter(options);
    if (token && claimsMatchAccess(token, liveAccess)) {
      return token;
    }
  }
  return null;
};

export const endWorkingSet = () => {
  endWorkingSetQueryCache();
  for (const cleanup of workingSetCleanups) {
    cleanup();
  }
};

export const getHouseholdBearer = createIsomorphicFn()
  .client(getClientHouseholdBearer)
  .server(async () => {
    const { getRequestHouseholdBearer } = await import('./resolve.server');
    return getRequestHouseholdBearer();
  });
