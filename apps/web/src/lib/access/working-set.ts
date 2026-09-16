import { createIsomorphicFn } from '@tanstack/react-start';
import { endWorkingSetQueryCache } from '@/lib/queryClient';
import { resolveMatchingBearer } from './resolve-matching-bearer';
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
  endWorkingSetQueryCache();
  for (const cleanup of workingSetCleanups) {
    cleanup();
  }
  clientBearerGetter = null;
  liveAccess = null;
};

export const getClientHouseholdBearer = async (): Promise<string | null> => {
  if (
    !clientBearerGetter ||
    !liveAccess ||
    liveAccess.status === 'signed-out'
  ) {
    return null;
  }
  return resolveMatchingBearer(clientBearerGetter, liveAccess);
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
