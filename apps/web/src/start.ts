import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start';
import { isPrerenderedOfflineShell } from './pwa/offline-shell-request';

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

const clerk = clerkMiddleware();

const clerkExceptOfflineShell = createMiddleware().server((ctx) => {
  if (isPrerenderedOfflineShell(ctx.request)) return ctx.next();
  return clerk.options.server?.(ctx) ?? ctx.next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, clerkExceptOfflineShell],
  };
});
