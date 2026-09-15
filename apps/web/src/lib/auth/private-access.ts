import { createMiddleware } from '@tanstack/react-start';
import { setResponseStatus } from '@tanstack/react-start/server';
import type { AccessState } from './access-policy';

export const assertPrivateAccess = <TAccess extends AccessState>(
  access: TAccess
): Exclude<TAccess, { status: 'signed-out' }> => {
  if (access.status === 'signed-out') {
    throw new Error('Signed-in member required');
  }
  return access as Exclude<TAccess, { status: 'signed-out' }>;
};

export const privateAccessMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => {
  const { resolveAccessOnRequest } = await import('./resolve-access.server');
  const { access } = await resolveAccessOnRequest();
  if (access.status === 'signed-out') {
    setResponseStatus(401);
    throw new Error('Signed-in member required');
  }
  return next({ context: { access } });
});
