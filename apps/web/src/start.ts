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

/** Offline shell prerender (PLO-133): skip Clerk only for `isPrerenderedOfflineShell`. */
const clerkExceptOfflineShell = createMiddleware().server((ctx) => {
  if (isPrerenderedOfflineShell(ctx.request)) return ctx.next();
  const runClerk = clerk.options.server;
  if (!runClerk) {
    throw new Error('Clerk middleware has no server handler');
  }
  return runClerk(ctx);
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, clerkExceptOfflineShell],
  };
});
