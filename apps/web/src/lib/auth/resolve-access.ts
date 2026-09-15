import { createIsomorphicFn, createServerFn } from '@tanstack/react-start';
import { rememberTransitionCredential } from './get-bearer-token';
import type { AccessState } from './access-policy';

const resolveAccessFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { resolveAccessOnRequest } = await import('./resolve-access.server');
  const { access, requestBearer } = await resolveAccessOnRequest();
  return { access, transitionBearer: requestBearer };
});

export const resolveAccessOnClient = async (): Promise<AccessState> => {
  const { access, transitionBearer } = await resolveAccessFn();
  rememberTransitionCredential(transitionBearer, access);
  return access;
};

export const resolveAccess = createIsomorphicFn()
  .server(async (): Promise<AccessState> => {
    const { resolveAccessOnRequest } = await import('./resolve-access.server');
    const { access } = await resolveAccessOnRequest();
    return access;
  })
  .client(resolveAccessOnClient);
