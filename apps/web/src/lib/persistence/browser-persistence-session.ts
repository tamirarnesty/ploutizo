import type { AccessState } from '@/lib/access/access-state';
import {
  browserCoordinatorName,
  browserDatabaseName,
  browserPersistenceScope,
} from './browser-database-scope';
import type { BrowserPersistenceScope } from './browser-database-scope';

export type BrowserPersistenceTarget = {
  databaseName: string;
  coordinatorName: string;
};

export type OpenedBrowserPersistence<TPersistence> = {
  persistence: TPersistence;
  close: () => Promise<void>;
};

export type BrowserPersistenceRuntime<TPersistence> = {
  open: (
    target: BrowserPersistenceTarget
  ) => Promise<OpenedBrowserPersistence<TPersistence>>;
  wipeAll: () => Promise<void>;
};

type Desired = {
  scope: BrowserPersistenceScope | null;
  wipe: boolean;
};

export type BrowserPersistenceSession<TPersistence> = {
  sync: (access: AccessState) => Promise<void>;
  current: () => Promise<TPersistence | null>;
  trackRelease: (release: Promise<void>) => void;
};

type OpenConnection<TPersistence> = {
  key: string;
  persistence: TPersistence;
  close: () => Promise<void>;
};

const desiredKey = (desired: Desired) =>
  desired.scope ? browserDatabaseName(desired.scope) : null;

const sameDesired = (left: Desired | null, right: Desired) =>
  left !== null &&
  desiredKey(left) === desiredKey(right) &&
  left.wipe === right.wipe;

const toDesired = (access: AccessState): Desired => ({
  scope: browserPersistenceScope(access),
  wipe: access.status === 'signed-out',
});

/**
 * One OPFS connection for the access working set.
 * Switching member or household closes it and opens the other file.
 * Sign-out closes it and deletes every file under the persistence directory.
 */
export const createBrowserPersistenceSession = <TPersistence>(
  runtime: BrowserPersistenceRuntime<TPersistence>
): BrowserPersistenceSession<TPersistence> => {
  let generation = 0;
  let tail: Promise<void> = Promise.resolve();
  let attempted: Desired | null = null;
  let opened: OpenConnection<TPersistence> | null = null;
  let wiped = false;
  const releases = new Set<Promise<void>>();

  const awaitReleases = async () => {
    while (releases.size > 0) {
      const pending = [...releases];
      await Promise.all(
        pending.map((release) => release.catch(() => undefined))
      );
    }
  };

  const apply = async (request: number, desired: Desired) => {
    if (request !== generation) return;

    const key = desiredKey(desired);
    if (opened && opened.key !== key) {
      await awaitReleases();
      if (request !== generation) return;
      const closing = opened;
      opened = null;
      let closeError: unknown;
      try {
        await closing.close();
      } catch (error) {
        closeError = error;
      }
      if (request !== generation) {
        if (closeError) throw closeError;
        return;
      }
      if (desired.wipe && !wiped) {
        await runtime.wipeAll();
        if (request !== generation) return;
        wiped = true;
      }
      if (closeError) throw closeError;
    } else if (desired.wipe && !wiped) {
      await runtime.wipeAll();
      if (request !== generation) return;
      wiped = true;
    }

    if (!desired.scope || opened) return;

    const handle = await runtime.open({
      databaseName: browserDatabaseName(desired.scope),
      coordinatorName: browserCoordinatorName(desired.scope),
    });
    if (request !== generation) {
      await handle.close();
      return;
    }
    opened = {
      key: browserDatabaseName(desired.scope),
      persistence: handle.persistence,
      close: handle.close,
    };
    wiped = false;
  };

  const sync = (access: AccessState) => {
    const next = toDesired(access);
    if (sameDesired(attempted, next)) return tail;
    attempted = next;
    const request = ++generation;
    tail = tail.catch(() => undefined).then(() => apply(request, next));
    return tail;
  };

  const current = () => {
    const pending = tail;
    return pending.then(
      () => opened?.persistence ?? null,
      () => opened?.persistence ?? null
    );
  };

  /**
   * Working-set cleanups register the promise that finishes
   * `collection.cleanup()` after live-query subscribers leave.
   * The session waits for those promises before it closes the file.
   */
  const trackRelease = (release: Promise<void>) => {
    releases.add(release);
    void release.finally(() => {
      releases.delete(release);
    });
  };

  return { sync, current, trackRelease };
};
