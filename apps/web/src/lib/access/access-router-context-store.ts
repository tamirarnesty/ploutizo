import type { RouterContext } from '@/router';
import { accessKey } from './access-key';
import { getActiveQueryClient } from './working-set-registry';
import type { AccessState } from './access-state';

const signedOutAccess: AccessState = { status: 'signed-out' };

const createPlaceholderContext = (): RouterContext => ({
  queryClient: getActiveQueryClient(),
  access: signedOutAccess,
  identityLoaded: false,
  isReady: false,
});

let currentContext = createPlaceholderContext();
let serverSnapshot: RouterContext | undefined;
const listeners = new Set<() => void>();

export const getAccessRouterContext = () => currentContext;

/** Stable reference for useSyncExternalStore getServerSnapshot (React requires caching). */
export const getAccessRouterContextServerSnapshot = () => {
  serverSnapshot ??= createPlaceholderContext();
  return serverSnapshot;
};

const routerContextMatches = (
  left: RouterContext,
  right: RouterContext
): boolean =>
  left.queryClient === right.queryClient &&
  left.identityLoaded === right.identityLoaded &&
  left.isReady === right.isReady &&
  accessKey(left.access) === accessKey(right.access);

export const publishAccessRouterContext = (context: RouterContext) => {
  if (routerContextMatches(currentContext, context)) {
    return;
  }
  currentContext = context;
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeAccessRouterContext = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resetAccessRouterContextStoreForTests = () => {
  currentContext = createPlaceholderContext();
  serverSnapshot = undefined;
  listeners.clear();
};
