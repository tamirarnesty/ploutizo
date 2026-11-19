import type { AccessState } from '@/lib/access/access-state';
import { createBrowserPersistenceSession } from './browser-persistence-session';
import type { PersistedCollectionPersistence } from '@tanstack/browser-db-sqlite-persistence';
import type { BrowserPersistenceSession } from './browser-persistence-session';

const browserPersistenceSupported = () => {
  // DOM lib types mark OPFS and Worker as always present. jsdom does not.
  const host = globalThis as {
    navigator?: { storage?: { getDirectory?: unknown } };
    Worker?: unknown;
  };
  return (
    typeof host.navigator?.storage?.getDirectory === 'function' &&
    typeof host.Worker === 'function'
  );
};

let session: BrowserPersistenceSession<PersistedCollectionPersistence> | null =
  null;

const getSession = () => {
  if (session) return session;
  session = createBrowserPersistenceSession({
    open: async (target) => {
      const opfs = await import('./opfs-browser-persistence');
      return opfs.openOpfsBrowserDatabase(target);
    },
    wipeAll: async () => {
      const opfs = await import('./opfs-browser-persistence');
      return opfs.wipeOpfsBrowserPersistence();
    },
  });
  return session;
};

/**
 * Opens, switches, or wipes the browser database for this access state.
 * Clerk's loading render looks signed out; callers must wait until identity
 * has loaded or a refresh will delete the signed-in member's data.
 */
export const syncBrowserPersistence = (access: AccessState): Promise<void> => {
  if (import.meta.env.SSR || !browserPersistenceSupported()) {
    return Promise.resolve();
  }
  return getSession()
    .sync(access)
    .catch((error: unknown) => {
      const name =
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        typeof error.name === 'string'
          ? error.name
          : 'Error';
      console.error(`Browser persistence sync failed (${name})`);
    });
};

/** Persistence for the current scope, or null when there is nothing to open. */
export const currentBrowserPersistence =
  (): Promise<PersistedCollectionPersistence | null> => {
    if (import.meta.env.SSR || !browserPersistenceSupported()) {
      return Promise.resolve(null);
    }
    return getSession().current();
  };

/**
 * Register a collection teardown that resolves after subscribers leave and
 * `collection.cleanup()` finishes. Call this synchronously from a working-set
 * cleanup so the database stays open until that teardown is done.
 */
export const trackBrowserPersistenceRelease = (release: Promise<void>) => {
  if (import.meta.env.SSR) return;
  getSession().trackRelease(release);
};
