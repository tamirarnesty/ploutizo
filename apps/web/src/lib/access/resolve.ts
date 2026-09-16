import { createIsomorphicFn, createServerFn } from '@tanstack/react-start';
import { rememberTransitionCredential } from './working-set';
import type { AccessState } from './access-state';

const resolveAccessFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { resolveAccessOnRequest } = await import('./resolve.server');
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
    const { resolveAccessOnRequest } = await import('./resolve.server');
    const { access } = await resolveAccessOnRequest();
    return access;
  })
  .client(resolveAccessOnClient);
