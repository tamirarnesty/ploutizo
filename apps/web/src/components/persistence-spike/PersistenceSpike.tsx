import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { Button } from '@ploutizo/ui/components/button';
import { Text } from '@ploutizo/ui/components/text';
import {
  SPIKE_COORDINATOR_NAME,
  SPIKE_DATABASE_NAME,
} from '@/lib/persistence-spike/constants';
import { setSpikeAccountsApiBlocked } from '@/lib/persistence-spike/fetch-spike-accounts';
import { acquireAccountsPersistence } from '@/lib/persistence-spike/open-accounts-persistence';
import type {
  SpikeAccountCollection,
  SpikeLeadership,
} from '@/lib/persistence-spike/open-accounts-persistence';

const readCrossOriginIsolated = () => window.crossOriginIsolated;

const readServerCrossOriginIsolated = () => false;

const subscribeCrossOriginIsolated = () => () => undefined;

type SpikeStatus = 'opening' | 'ready' | 'error';

type SpikeSession = {
  collection: SpikeAccountCollection;
  readLeadership: () => SpikeLeadership;
};

const errorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Could not open the local database';
};

const syncErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Accounts sync failed';
};

const reloadSpike = (apiBlocked: boolean) => {
  const url = new URL(window.location.href);
  if (apiBlocked) url.searchParams.set('api', 'offline');
  else url.searchParams.delete('api');
  window.location.assign(url.pathname + url.search);
};

export const PersistenceSpike = ({ apiBlocked }: { apiBlocked: boolean }) => {
  const [status, setStatus] = useState<SpikeStatus>('opening');
  const [openError, setOpenError] = useState<string | null>(null);
  const [session, setSession] = useState<SpikeSession | null>(null);
  const [leadership, setLeadership] = useState<SpikeLeadership | null>(null);
  const isolated = useSyncExternalStore(
    subscribeCrossOriginIsolated,
    readCrossOriginIsolated,
    readServerCrossOriginIsolated
  );

  useEffect(() => {
    setSpikeAccountsApiBlocked(apiBlocked);
    let cancelled = false;
    let release: (() => Promise<void>) | undefined;

    const run = async () => {
      try {
        const handle = await acquireAccountsPersistence();
        if (cancelled) {
          await handle.release();
          return;
        }
        release = handle.release;
        setSession({
          collection: handle.collection,
          readLeadership: handle.readLeadership,
        });
        setLeadership(handle.readLeadership());
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setOpenError(errorText(error));
        setStatus('error');
      }
    };

    void run();
    return () => {
      cancelled = true;
      void release?.();
    };
  }, [apiBlocked]);

  useEffect(() => {
    if (!session) return;
    const read = () => setLeadership(session.readLeadership());
    read();
    const timer = window.setInterval(read, 500);
    return () => window.clearInterval(timer);
  }, [session]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <Text as="h1" variant="h3">
          Persistence spike
        </Text>
        <Text variant="body-sm">
          PLO-134 proof for the accounts collection. Rows live in{' '}
          {SPIKE_DATABASE_NAME}. The {SPIKE_COORDINATOR_NAME} coordinator is
          shared by tabs in this browser profile. Sign-out does not wipe this
          database; member and household scoping is a later slice.
        </Text>
      </div>

      <div className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
        <Text as="div" variant="caption">
          Local database
        </Text>
        <Text as="div" variant="body-sm" data-testid="spike-status">
          {status === 'opening' && 'Opening'}
          {status === 'ready' && 'Open'}
          {status === 'error' && (openError ?? 'Failed to open')}
        </Text>
        <Text as="div" variant="caption">
          crossOriginIsolated
        </Text>
        <Text as="div" variant="body-sm" data-testid="spike-isolated">
          {isolated ? 'yes' : 'no'}
        </Text>
        <Text as="div" variant="caption">
          API
        </Text>
        <Text as="div" variant="body-sm" data-testid="spike-api">
          {apiBlocked ? 'blocked' : 'online'}
        </Text>
        <Text as="div" variant="caption">
          Coordinator
        </Text>
        <Text
          as="div"
          variant="body-sm"
          data-testid="spike-leadership"
          data-leader={leadership ? String(leadership.isLeader) : 'unknown'}
          data-node-id={leadership?.nodeId ?? ''}
        >
          {leadership
            ? `${leadership.isLeader ? 'leader' : 'follower'} ${leadership.nodeId}`
            : 'Waiting for the database'}
        </Text>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reloadSpike(true)}>
          Reload with the accounts API blocked
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => reloadSpike(false)}
        >
          Reload online
        </Button>
      </div>

      {session ? (
        <PersistedAccounts collection={session.collection} />
      ) : (
        <Text variant="body-sm" data-testid="spike-accounts" data-count="0">
          {status === 'error'
            ? 'No local rows are available.'
            : 'Waiting for the local database.'}
        </Text>
      )}
    </div>
  );
};

const PersistedAccounts = ({
  collection,
}: {
  collection: SpikeAccountCollection;
}) => {
  const accounts = useLiveQuery({
    query: (q) => q.from({ account: collection }),
  });
  const rows = [...accounts.data].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const utils = collection.utils as {
    isError?: boolean;
    lastError?: unknown;
    isFetching?: boolean;
  };
  const syncFailed = utils.isError === true;

  return (
    <div className="space-y-3">
      <Text variant="body-sm" data-testid="spike-sync">
        {syncFailed
          ? syncErrorText(utils.lastError)
          : utils.isFetching
            ? 'Syncing accounts'
            : 'Accounts sync idle'}
      </Text>
      <Text
        as="h2"
        variant="body"
        data-testid="spike-accounts"
        data-count={String(rows.length)}
      >
        {rows.length} account{rows.length === 1 ? '' : 's'} from the local
        collection
      </Text>
      {rows.length === 0 ? (
        <Text variant="body-sm">No accounts stored in the local database.</Text>
      ) : (
        <ul className="space-y-1">
          {rows.map((account) => (
            <li key={account.id}>
              <Text as="span" variant="body-sm">
                {account.name}
              </Text>
            </li>
          ))}
        </ul>
      )}
      <Text variant="caption" data-testid="spike-query-status">
        Live query {accounts.status}
        {accounts.isLoading ? ', loading' : ''}
      </Text>
    </div>
  );
};
