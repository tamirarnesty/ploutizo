import { createCollection } from '@tanstack/react-db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import { persistedCollectionOptions } from '@tanstack/browser-db-sqlite-persistence';
import {
  accountSchema,
  categorySchema,
  dashboardOverviewResponseSchema,
  orgMemberSchema,
  settlementBalancesResponseSchema,
  tagSchema,
  transactionListResponseSchema,
} from '@ploutizo/validators';
import { z } from 'zod';
import { getActiveQueryClient } from '@/lib/access/working-set-registry';
import { currentBrowserPersistence } from '@/lib/persistence/browser-persistence';
import {
  ingestSuccessfulQuery,
  listAccountRows,
  listCategoryRows,
  listDashboardPeriodRows,
  listMemberRows,
  listTagRows,
  listTransactionViewRows,
  markOfflineReadReady,
  onOfflineReadChanged,
  readSettlementRow,
  replaceOfflineRows,
} from './offline-read-store';

export const OFFLINE_COLLECTION_IDS = [
  'accounts',
  'categories',
  'tags',
  'household-members',
  'transaction-views',
  'dashboard-periods',
  'settlements',
] as const;

export type OfflineCollectionId = (typeof OFFLINE_COLLECTION_IDS)[number];

const SCHEMA_VERSION = 1;
const HYDRATE_TIMEOUT_MS = 1500;

type SnapshotRow = { id: string; syncedAt: string };

type OfflineCollection = {
  status: string;
  subscriberCount: number;
  on: (
    event: 'status:change' | 'subscribers:change',
    handler: () => void
  ) => void;
  off: (
    event: 'status:change' | 'subscribers:change',
    handler: () => void
  ) => void;
  toArray: () => SnapshotRow[];
  cleanup: () => Promise<void>;
  utils: {
    refetch: (options?: { throwOnError?: boolean }) => Promise<unknown>;
  };
};

const transactionViewRow = z.object({
  id: z.string(),
  syncedAt: z.string(),
  pinned: z.boolean(),
  response: transactionListResponseSchema,
});

const dashboardPeriodRow = z.object({
  id: z.string(),
  syncedAt: z.string(),
  overview: dashboardOverviewResponseSchema,
});

const referenceRow = <T extends z.ZodType>(item: T) =>
  z.object({
    id: z.string(),
    syncedAt: z.string(),
    items: z.array(item),
  });

const settlementRow = z.object({
  id: z.literal('list'),
  syncedAt: z.string(),
  balances: settlementBalancesResponseSchema,
});

const accountRow = referenceRow(accountSchema);
const categoryRow = referenceRow(categorySchema);
const tagRow = referenceRow(tagSchema);
const memberRow = referenceRow(orgMemberSchema);

let generation = 0;
let opening: Promise<void> | null = null;
let serveRows = false;
let acceptFlush = false;
let flushScheduled = false;
let collections: OfflineCollection[] = [];
let unsubscribeCache: (() => void) | null = null;

const rowsFor = (id: OfflineCollectionId): SnapshotRow[] => {
  if (!serveRows) {
    const error = new Error('Offline collection is still hydrating');
    error.name = 'OfflineCollectionHydratingError';
    throw error;
  }
  switch (id) {
    case 'accounts':
      return listAccountRows();
    case 'categories':
      return listCategoryRows();
    case 'tags':
      return listTagRows();
    case 'household-members':
      return listMemberRows();
    case 'transaction-views':
      return listTransactionViewRows();
    case 'dashboard-periods':
      return listDashboardPeriodRows();
    case 'settlements':
      return readSettlementRow();
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
};

const parsed = <T>(rows: SnapshotRow[], schema: z.ZodType<T>) =>
  rows.flatMap((row) => {
    const result = schema.safeParse(row);
    return result.success ? [result.data] : [];
  });

const seedFrom = (opened: readonly OfflineCollection[]) => {
  const byId = new Map(
    OFFLINE_COLLECTION_IDS.map((id, index) => [id, opened[index]])
  );
  const read = (id: OfflineCollectionId) => byId.get(id)?.toArray() ?? [];
  replaceOfflineRows({
    transactions: parsed(read('transaction-views'), transactionViewRow),
    periods: parsed(read('dashboard-periods'), dashboardPeriodRow),
    accounts: parsed(read('accounts'), accountRow),
    categories: parsed(read('categories'), categoryRow),
    tags: parsed(read('tags'), tagRow),
    members: parsed(read('household-members'), memberRow),
    settlements: parsed(read('settlements'), settlementRow)[0] ?? null,
  });
};

const waitFor = (
  collection: OfflineCollection,
  event: 'status:change' | 'subscribers:change',
  done: () => boolean
) =>
  new Promise<void>((resolve) => {
    if (done()) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      collection.off(event, onEvent);
      resolve();
    }, HYDRATE_TIMEOUT_MS);
    const onEvent = () => {
      if (!done()) return;
      clearTimeout(timeout);
      collection.off(event, onEvent);
      resolve();
    };
    collection.on(event, onEvent);
  });

const openOne = (
  id: OfflineCollectionId,
  persistence: NonNullable<
    Awaited<ReturnType<typeof currentBrowserPersistence>>
  >
) =>
  createCollection(
    persistedCollectionOptions({
      ...queryCollectionOptions({
        id,
        queryKey: ['offline-collection', id] as const,
        queryFn: () => rowsFor(id),
        queryClient: getActiveQueryClient(),
        getKey: (row: SnapshotRow) => row.id,
        enabled: false,
        retry: false,
      }),
      persistence,
      schemaVersion: SCHEMA_VERSION,
    }) as never
  ) as unknown as OfflineCollection;

const scheduleFlush = () => {
  if (flushScheduled || !acceptFlush) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    if (!acceptFlush) return;
    const current = [...collections];
    void Promise.all(
      current.map((collection) =>
        collection.utils.refetch({ throwOnError: false })
      )
    );
  });
};

const ingestCachedQueries = () => {
  for (const query of getActiveQueryClient().getQueryCache().findAll()) {
    if (query.state.status !== 'success') continue;
    ingestSuccessfulQuery(query.queryKey, query.state.data);
  }
};

const bindQueryCache = () => {
  unsubscribeCache?.();
  const client = getActiveQueryClient();
  unsubscribeCache = client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    if ('manual' in event.action && event.action.manual) return;
    ingestSuccessfulQuery(event.query.queryKey, event.query.state.data);
  });
};

const openOfflineCollections = async (request: number) => {
  let persistence: Awaited<ReturnType<typeof currentBrowserPersistence>>;
  try {
    persistence = await currentBrowserPersistence();
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error';
    console.error(`Offline collection open failed (${name})`);
    if (request !== generation) return;
    markOfflineReadReady();
    return;
  }
  if (request !== generation) return;

  bindQueryCache();
  onOfflineReadChanged(() => {
    if (acceptFlush) scheduleFlush();
  });

  if (!persistence) {
    ingestCachedQueries();
    serveRows = true;
    markOfflineReadReady();
    return;
  }

  const opened = OFFLINE_COLLECTION_IDS.map((id) => openOne(id, persistence));
  const closeOpened = () =>
    Promise.all(opened.map((collection) => collection.cleanup()));
  if (request !== generation) {
    await closeOpened();
    return;
  }
  await Promise.all(
    opened.map((collection) =>
      waitFor(
        collection,
        'status:change',
        () => collection.status === 'ready' || collection.status === 'error'
      )
    )
  );
  if (request !== generation) {
    await closeOpened();
    return;
  }
  collections = opened;
  seedFrom(opened);
  ingestCachedQueries();
  serveRows = true;
  acceptFlush = true;
  markOfflineReadReady();
  scheduleFlush();
};

const OFFLINE_READ_QUERY_KEYS = [
  ['transactions'],
  ['dashboard-overview'],
  ['accounts'],
  ['categories'],
  ['tags'],
  ['members'],
  ['settlements'],
] as const;

let reconnectListener: (() => void) | null = null;

/** Refetch saved views when the browser comes back online. */
const refreshOfflineReadsOnReconnect = () => {
  if (reconnectListener || import.meta.env.SSR) return;
  reconnectListener = () => {
    const client = getActiveQueryClient();
    for (const queryKey of OFFLINE_READ_QUERY_KEYS) {
      void client.invalidateQueries({ queryKey });
    }
  };
  window.addEventListener('online', reconnectListener);
};

/** Load saved rows into memory and keep later query results. */
export const hydrateOfflineRead = () => {
  if (import.meta.env.SSR) return Promise.resolve();
  refreshOfflineReadsOnReconnect();
  opening ??= openOfflineCollections(generation).catch((error: unknown) => {
    const name = error instanceof Error ? error.name : 'Error';
    console.error(`Offline collection hydrate failed (${name})`);
    markOfflineReadReady();
  });
  return opening;
};

/** Stop flushing before the working set drops its query client. */
export const pauseOfflineCollectionFlush = () => {
  generation += 1;
  opening = null;
  serveRows = false;
  acceptFlush = false;
  onOfflineReadChanged(null);
  unsubscribeCache?.();
  unsubscribeCache = null;
};

/**
 * Close collections after subscribers leave. The persistence session waits
 * on this promise before it closes the database file.
 */
export const releaseOfflineCollections = async () => {
  const closing = collections;
  collections = [];
  serveRows = false;
  acceptFlush = false;
  await Promise.all(
    closing.map(async (collection) => {
      if (collection.subscriberCount > 0) {
        await waitFor(
          collection,
          'subscribers:change',
          () => collection.subscriberCount === 0
        );
      }
      await collection.cleanup();
    })
  );
};
