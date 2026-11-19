import { BROWSER_PERSISTENCE_DIRECTORY } from './browser-database-scope';
import type {
  BrowserPersistenceTarget,
  OpenedBrowserPersistence,
} from './browser-persistence-session';
import type { PersistedCollectionPersistence } from '@tanstack/browser-db-sqlite-persistence';

const WIPE_ATTEMPTS = 8;

const BUSY_ENTRY_ERRORS = new Set([
  'NoModificationAllowedError',
  'InvalidStateError',
  'InvalidModificationError',
]);

const errorName = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return '';
  }
  return typeof error.name === 'string' ? error.name : '';
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

type OpfsDirectory = {
  removeEntry: (
    name: string,
    options?: { recursive?: boolean }
  ) => Promise<void>;
};

export type WipeOpfsBrowserPersistenceDeps = {
  getDirectory?: () => Promise<OpfsDirectory>;
  sleep?: (ms: number) => Promise<void>;
};

const readRoot = (
  getDirectory: WipeOpfsBrowserPersistenceDeps['getDirectory']
) => {
  if (getDirectory) return getDirectory();
  return navigator.storage.getDirectory();
};

/**
 * OPFSCoopSyncVFS stores `databaseName` as a path under the origin directory.
 * `ploutizo-offline/<member>/<household>.sqlite` and its `-journal` / `-wal`
 * siblings therefore all live in one directory that sign-out can delete.
 * The package opens that path with OPFSCoopSyncVFS, which does not use
 * SharedArrayBuffer and does not need COOP or COEP.
 */
export const openOpfsBrowserDatabase = async (
  target: BrowserPersistenceTarget
): Promise<OpenedBrowserPersistence<PersistedCollectionPersistence>> => {
  const {
    BrowserCollectionCoordinator,
    createBrowserWASQLitePersistence,
    openBrowserWASQLiteOPFSDatabase,
  } = await import('@tanstack/browser-db-sqlite-persistence');

  const database = await openBrowserWASQLiteOPFSDatabase({
    databaseName: target.databaseName,
  });
  const coordinator = new BrowserCollectionCoordinator({
    dbName: target.coordinatorName,
  });

  const release = async () => {
    try {
      coordinator.dispose();
    } finally {
      await database.close?.();
    }
  };

  try {
    const persistence = createBrowserWASQLitePersistence({
      database,
      coordinator,
    });
    return { persistence, close: release };
  } catch (error) {
    await release();
    throw error;
  }
};

/**
 * Deletes every scoped database. A busy sync access handle (another tab
 * still closing) is retried. A missing directory means the data is already gone.
 */
export const wipeOpfsBrowserPersistence = async (
  deps: WipeOpfsBrowserPersistenceDeps = {}
) => {
  const sleep = deps.sleep ?? delay;
  const root = await readRoot(deps.getDirectory);

  for (let attempt = 0; attempt < WIPE_ATTEMPTS; attempt += 1) {
    try {
      await root.removeEntry(BROWSER_PERSISTENCE_DIRECTORY, {
        recursive: true,
      });
      return;
    } catch (error) {
      if (errorName(error) === 'NotFoundError') return;
      const busy = BUSY_ENTRY_ERRORS.has(errorName(error));
      if (!busy || attempt === WIPE_ATTEMPTS - 1) throw error;
      await sleep(25 * (attempt + 1));
    }
  }
};
