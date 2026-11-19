import { useSyncExternalStore } from 'react';
import { isBrowserOffline, subscribeBrowserOnline } from './browser-online';
import {
  getOfflineHydration,
  subscribeOfflineRead,
} from './offline-read-store';
import type { UseQueryResult } from '@tanstack/react-query';

export type OfflineQueryView<T> = {
  data: T | undefined;
  isError: boolean;
  isPending: boolean;
  isFetching: boolean;
  isLoading: boolean;
  offlineUnavailable: boolean;
};

export const resolveOfflineQueryView = <T>({
  offline,
  hydration,
  data,
  isError,
  isPending,
  isFetching,
  snapshot,
}: {
  offline: boolean;
  hydration: 'pending' | 'ready';
  data: T | undefined;
  isError: boolean;
  isPending: boolean;
  isFetching: boolean;
  snapshot: T | undefined;
}): OfflineQueryView<T> => {
  if (!offline) {
    return {
      data,
      isError,
      isPending,
      isFetching,
      isLoading: isPending && isFetching,
      offlineUnavailable: false,
    };
  }

  const saved = data ?? snapshot;
  if (saved !== undefined) {
    return {
      data: saved,
      isError: false,
      isPending: false,
      isFetching: false,
      isLoading: false,
      offlineUnavailable: false,
    };
  }

  if (hydration === 'pending') {
    return {
      data: undefined,
      isError: false,
      isPending: true,
      isFetching: true,
      isLoading: true,
      offlineUnavailable: false,
    };
  }

  return {
    data: undefined,
    isError: false,
    isPending: false,
    isFetching: false,
    isLoading: false,
    offlineUnavailable: true,
  };
};

export const useOfflineReadableQuery = <T>(
  query: UseQueryResult<T>,
  readSnapshot: () => T | undefined
): UseQueryResult<T> & { offlineUnavailable: boolean } => {
  const offline = useSyncExternalStore(
    subscribeBrowserOnline,
    isBrowserOffline,
    () => false
  );
  const snapshot = useSyncExternalStore(
    subscribeOfflineRead,
    readSnapshot,
    () => undefined
  );
  const hydration = useSyncExternalStore(
    subscribeOfflineRead,
    getOfflineHydration,
    () => 'ready' as const
  );
  const view = resolveOfflineQueryView({
    offline,
    hydration,
    data: query.data,
    isError: query.isError,
    isPending: query.isPending,
    isFetching: query.isFetching,
    snapshot,
  });

  if (!offline) {
    return { ...query, offlineUnavailable: false };
  }

  return {
    ...query,
    data: view.data,
    isError: view.isError,
    isPending: view.isPending,
    isFetching: view.isFetching,
    isLoading: view.isLoading,
    isSuccess: view.data !== undefined,
    status: view.data !== undefined ? 'success' : 'pending',
    fetchStatus: view.isFetching ? 'fetching' : 'idle',
    offlineUnavailable: view.offlineUnavailable,
  } as UseQueryResult<T> & { offlineUnavailable: boolean };
};
