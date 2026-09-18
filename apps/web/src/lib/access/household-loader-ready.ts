import { createIsomorphicFn } from '@tanstack/react-start';
import type { RouterContext } from '@/router';
import { getRequestAccess, getRequestHouseholdBearer } from './resolve.server';

const resolveServerHouseholdLoaderReady = async (): Promise<boolean> => {
  const access = await getRequestAccess();
  if (access.status !== 'signed-in-with-active-household') {
    return false;
  }
  const bearer = await getRequestHouseholdBearer();
  return bearer !== null;
};

export const isClientHouseholdLoaderReady = (context: RouterContext) =>
  context.isReady &&
  context.access.status === 'signed-in-with-active-household';

export const isHouseholdLoaderReady = createIsomorphicFn()
  .client(isClientHouseholdLoaderReady)
  .server(resolveServerHouseholdLoaderReady);
