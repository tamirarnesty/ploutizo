import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHouseholdBearer } from './resolve.server';
import type { AccessState } from './access-state';

type BearerGetter = (options?: {
  skipCache?: boolean;
}) => Promise<string | null>;

let clientBearerGetter: BearerGetter | null = null;
let liveAccess: AccessState | null = null;

export const setLiveAccess = (access: AccessState | null) => {
  liveAccess = access;
};

export const setClientBearerGetter = (getter: BearerGetter | null) => {
  clientBearerGetter = getter;
};

export const resetBearerStateForTests = () => {
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
  return clientBearerGetter();
};

export const getHouseholdBearer = createIsomorphicFn()
  .client(getClientHouseholdBearer)
  .server(async () => getRequestHouseholdBearer());
