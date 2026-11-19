import { afterEach, describe, expect, it, vi } from 'vitest';

const persistence = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let subscriberCount = 0;
  const cleanup = vi.fn(async () => undefined);
  const closeDatabase = vi.fn(async () => undefined);
  const dispose = vi.fn();

  return {
    listeners,
    cleanup,
    closeDatabase,
    dispose,
    get subscriberCount() {
      return subscriberCount;
    },
    set subscriberCount(value: number) {
      subscriberCount = value;
    },
    emit() {
      for (const listener of [...listeners]) listener();
    },
    reset() {
      listeners.clear();
      subscriberCount = 0;
      cleanup.mockReset();
      cleanup.mockResolvedValue(undefined);
      closeDatabase.mockReset();
      closeDatabase.mockResolvedValue(undefined);
      dispose.mockReset();
    },
  };
});

vi.mock('@tanstack/react-db', () => ({
  createCollection: () => ({
    get subscriberCount() {
      return persistence.subscriberCount;
    },
    on: (_event: string, callback: () => void) => {
      persistence.listeners.add(callback);
    },
    off: (_event: string, callback: () => void) => {
      persistence.listeners.delete(callback);
    },
    cleanup: persistence.cleanup,
  }),
}));

vi.mock('@tanstack/browser-db-sqlite-persistence', () => ({
  openBrowserWASQLiteOPFSDatabase: async () => ({
    close: persistence.closeDatabase,
  }),
  BrowserCollectionCoordinator: class {
    getNodeId() {
      return 'node-1';
    }
    isLeader() {
      return true;
    }
    dispose() {
      persistence.dispose();
    }
  },
  createBrowserWASQLitePersistence: () => ({}),
  persistedCollectionOptions: (options: unknown) => options,
}));

const loadAcquire = async () => {
  vi.resetModules();
  const module = await import('./open-accounts-persistence');
  return module.acquireAccountsPersistence;
};

describe('acquireAccountsPersistence', () => {
  afterEach(() => {
    persistence.reset();
  });

  it('closes the database after live-query subscribers leave', async () => {
    persistence.subscriberCount = 1;
    const acquire = await loadAcquire();
    const handle = await acquire();
    const release = handle.release();

    await Promise.resolve();
    expect(persistence.cleanup).not.toHaveBeenCalled();
    expect(persistence.closeDatabase).not.toHaveBeenCalled();

    persistence.subscriberCount = 0;
    persistence.emit();
    await release;

    expect(persistence.cleanup).toHaveBeenCalledOnce();
    expect(persistence.closeDatabase).toHaveBeenCalledOnce();
    expect(persistence.dispose).toHaveBeenCalledOnce();
  });

  it('opens the next database only after those subscribers leave', async () => {
    persistence.subscriberCount = 1;
    const acquire = await loadAcquire();
    const first = await acquire();
    const release = first.release();
    let secondOpened = false;
    const second = acquire().then((handle) => {
      secondOpened = true;
      return handle;
    });

    await Promise.resolve();
    expect(secondOpened).toBe(false);

    persistence.subscriberCount = 0;
    persistence.emit();
    await release;
    const handle = await second;
    expect(secondOpened).toBe(true);
    await handle.release();
  });
});
