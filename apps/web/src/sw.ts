/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { OFFLINE_ENTRY_PATH, allowsOfflineEntry } from './pwa/offline-entry';

declare const self: ServiceWorkerGlobalScope;

// Precache revisions are per worker. Install stores the new `/offline.html`
// beside the old one. Activate, not install, drops entries this worker does
// not list, so a waiting worker cannot publish its shell early.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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

  const shell = await matchPrecache(OFFLINE_ENTRY_PATH);
  return shell ?? Response.error();
});
