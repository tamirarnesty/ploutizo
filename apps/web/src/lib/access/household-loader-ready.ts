import { createIsomorphicFn } from '@tanstack/react-start';
import type { RouterContext } from '@/router';
import { getRequestAccess, getRequestHouseholdBearer } from './resolve.server';
import type { AccessState } from './access-state';

export const isHouseholdBearerReady = (isReady: boolean, access: AccessState) =>
  isReady && access.status === 'signed-in-with-active-household';

const resolveServerHouseholdLoaderReady = async (): Promise<boolean> => {
  const access = await getRequestAccess();
  if (access.status !== 'signed-in-with-active-household') {
    return false;
  }
  const bearer = await getRequestHouseholdBearer();
  return bearer !== null;
};

export const isClientHouseholdLoaderReady = (context: RouterContext) =>
  isHouseholdBearerReady(context.isReady, context.access);

export const isHouseholdLoaderReady = createIsomorphicFn()
  .client(isClientHouseholdLoaderReady)
  .server(resolveServerHouseholdLoaderReady);
