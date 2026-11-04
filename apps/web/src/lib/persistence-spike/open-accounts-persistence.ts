import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { accountSchema } from '@ploutizo/validators';
import type { Account } from '@ploutizo/validators';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { fetchAccounts } from '@/lib/data-access/accounts';
import { accountsQueryKey } from '@/lib/data-access/accounts/useGetAccounts';
import {
  SPIKE_ACCOUNTS_COLLECTION_ID,
  SPIKE_COORDINATOR_NAME,
  SPIKE_DATABASE_NAME,
} from './constants';
import { fetchSpikeAccounts } from './fetch-spike-accounts';
import { assertBrowserPersistenceRuntime } from './spike-runtime';
import type { Collection } from '@tanstack/db';

export type SpikeLeadership = {
  nodeId: string;
  isLeader: boolean;
};

export type SpikeAccountCollection = Collection<Account, string>;

export type AccountsPersistenceHandle = {
  collection: SpikeAccountCollection;
  readLeadership: () => SpikeLeadership;
  release: () => Promise<void>;
};

type OpenedAccountsPersistence = {
  collection: SpikeAccountCollection;
  readLeadership: () => SpikeLeadership;
  close: () => Promise<void>;
};

let users = 0;
let session: Promise<OpenedAccountsPersistence> | null = null;
let closed: Promise<void> = Promise.resolve();

const openAccountsPersistence =
  async (): Promise<OpenedAccountsPersistence> => {
    assertBrowserPersistenceRuntime(import.meta.env.SSR);
    const {
      BrowserCollectionCoordinator,
      createBrowserWASQLitePersistence,
      openBrowserWASQLiteOPFSDatabase,
      persistedCollectionOptions,
    } = await import('@tanstack/browser-db-sqlite-persistence');

    const database = await openBrowserWASQLiteOPFSDatabase({
      databaseName: SPIKE_DATABASE_NAME,
    });
    const coordinator = new BrowserCollectionCoordinator({
      dbName: SPIKE_COORDINATOR_NAME,
    });
    const persistence = createBrowserWASQLitePersistence({
      database,
      coordinator,
    });
    const collection = createCollection(
      persistedCollectionOptions({
        ...queryCollectionOptions({
          id: SPIKE_ACCOUNTS_COLLECTION_ID,
          queryKey: accountsQueryKey(false),
          queryFn: ({ signal }) => fetchSpikeAccounts(fetchAccounts, signal),
          queryClient: getActiveQueryClient(),
          schema: accountSchema,
          getKey: (account) => account.id,
          retry: false,
          networkMode: 'always',
        }),
        persistence,
        schemaVersion: 1,
      })
    ) as SpikeAccountCollection;

    return {
      collection,
      readLeadership: () => ({
        nodeId: coordinator.getNodeId(),
        isLeader: coordinator.isLeader(SPIKE_ACCOUNTS_COLLECTION_ID),
      }),
      close: async () => {
        try {
          await collection.cleanup();
        } finally {
          coordinator.dispose();
          await database.close?.();
        }
      },
    };
  };

/**
 * One OPFS connection per tab. React re-mounts wait until the previous
 * connection has closed, because a sync access handle is exclusive while open.
 */
export const acquireAccountsPersistence =
  async (): Promise<AccountsPersistenceHandle> => {
    assertBrowserPersistenceRuntime(import.meta.env.SSR);
    users += 1;
    session ??= closed.then(() => openAccountsPersistence());
    const current = session;

    try {
      const opened = await current;
      let released = false;
      return {
        collection: opened.collection,
        readLeadership: opened.readLeadership,
        release: async () => {
          if (released) return;
          released = true;
          users -= 1;
          if (users > 0) return;
          if (session === current) session = null;
          closed = opened.close().then(
            () => undefined,
            () => undefined
          );
          await closed;
        },
      };
    } catch (error) {
      users -= 1;
      if (users <= 0 && session === current) {
        users = 0;
        session = null;
      }
      throw error;
    }
  };
