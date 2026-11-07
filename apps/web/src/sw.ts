/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import {
  OFFLINE_ENTRY_CACHE,
  OFFLINE_ENTRY_PATH,
  allowsOfflineEntry,
} from './pwa/offline-entry';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const [cache, response] = await Promise.all([
        caches.open(OFFLINE_ENTRY_CACHE),
        fetch(OFFLINE_ENTRY_PATH, { cache: 'no-store' }),
      ]);
      if (!response.ok) {
        throw new Error(`Offline entry responded ${response.status}`);
      }
      await cache.put(OFFLINE_ENTRY_PATH, response);
    })()
  );
});

self.addEventListener('message', (event) => {
  const data: unknown = event.data;
  const shouldSkipWaiting =
    data === 'SKIP_WAITING' ||
    (typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      data.type === 'SKIP_WAITING');

  if (shouldSkipWaiting) {
    void self.skipWaiting();
  }
});

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && allowsOfflineEntry(url.pathname),
  new NetworkOnly()
);

setCatchHandler(async ({ request }) => {
  if (request.mode !== 'navigate') return Response.error();

  const { pathname } = new URL(request.url);
  if (!allowsOfflineEntry(pathname)) return Response.error();

  const shell = await caches.match(OFFLINE_ENTRY_PATH);
  return shell ?? Response.error();
});
