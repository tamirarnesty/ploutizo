import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  openOpfsBrowserDatabase,
  wipeOpfsBrowserPersistence,
} from './opfs-browser-persistence';

const packageMock = vi.hoisted(() => ({
  coordinatorNames: [] as string[],
  disposed: 0,
  closed: 0,
  failCreate: false,
  persistenceOptions: [] as unknown[],
  openedNames: [] as string[],
}));

vi.mock('@tanstack/browser-db-sqlite-persistence', () => ({
  BrowserCollectionCoordinator: class {
    constructor(options: { dbName: string }) {
      packageMock.coordinatorNames.push(options.dbName);
    }
    dispose() {
      packageMock.disposed += 1;
    }
  },
  createBrowserWASQLitePersistence: (options: unknown) => {
    packageMock.persistenceOptions.push(options);
    if (packageMock.failCreate) {
      throw new Error('create failed');
    }
    return { kind: 'persistence' };
  },
  openBrowserWASQLiteOPFSDatabase: (options: { databaseName: string }) => {
    packageMock.openedNames.push(options.databaseName);
    return Promise.resolve({
      close: () => {
        packageMock.closed += 1;
        return Promise.resolve();
      },
    });
  },
}));

const busy = () =>
  new DOMException('file is open', 'NoModificationAllowedError');

describe('OPFS browser persistence', () => {
  beforeEach(() => {
    packageMock.coordinatorNames = [];
    packageMock.disposed = 0;
    packageMock.closed = 0;
    packageMock.failCreate = false;
    packageMock.persistenceOptions = [];
    packageMock.openedNames = [];
  });

  it('opens the scoped file with a coordinator and OPFSCoopSyncVFS defaults', async () => {
    const databaseName = 'ploutizo-offline/user_alex/org_a.sqlite';
    const opened = await openOpfsBrowserDatabase({
      databaseName,
      coordinatorName: databaseName,
    });

    expect(packageMock.openedNames).toEqual([databaseName]);
    expect(packageMock.coordinatorNames).toEqual([databaseName]);
    expect(packageMock.persistenceOptions).toHaveLength(1);
    expect(opened.persistence).toEqual({ kind: 'persistence' });

    await opened.close();

    expect(packageMock.disposed).toBe(1);
    expect(packageMock.closed).toBe(1);
  });

  it('closes the file when the persistence adapter cannot be created', async () => {
    packageMock.failCreate = true;

    await expect(
      openOpfsBrowserDatabase({
        databaseName: 'ploutizo-offline/user_alex/org_a.sqlite',
        coordinatorName: 'ploutizo-offline/user_alex/org_a.sqlite',
      })
    ).rejects.toThrow('create failed');

    expect(packageMock.disposed).toBe(1);
    expect(packageMock.closed).toBe(1);
  });

  it('removes the persistence directory', async () => {
    const removeEntry = vi.fn(() => Promise.resolve());

    await wipeOpfsBrowserPersistence({
      getDirectory: () => Promise.resolve({ removeEntry }),
    });

    expect(removeEntry).toHaveBeenCalledWith('ploutizo-offline', {
      recursive: true,
    });
  });

  it('treats a missing directory as already wiped', async () => {
    const removeEntry = vi.fn(() =>
      Promise.reject(new DOMException('missing', 'NotFoundError'))
    );

    await wipeOpfsBrowserPersistence({
      getDirectory: () => Promise.resolve({ removeEntry }),
    });

    expect(removeEntry).toHaveBeenCalledTimes(1);
  });

  it('retries while another tab still holds the file', async () => {
    const removeEntry = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(busy())
      .mockRejectedValueOnce(busy())
      .mockResolvedValueOnce(undefined);
    const sleep = vi.fn(() => Promise.resolve());

    await wipeOpfsBrowserPersistence({
      getDirectory: () => Promise.resolve({ removeEntry }),
      sleep,
    });

    expect(removeEntry).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('stops retrying a wipe error that is not a busy file', async () => {
    const removeEntry = vi.fn(() =>
      Promise.reject(new DOMException('denied', 'SecurityError'))
    );

    await expect(
      wipeOpfsBrowserPersistence({
        getDirectory: () => Promise.resolve({ removeEntry }),
        sleep: () => Promise.resolve(),
      })
    ).rejects.toThrow('denied');
    expect(removeEntry).toHaveBeenCalledTimes(1);
  });
});
