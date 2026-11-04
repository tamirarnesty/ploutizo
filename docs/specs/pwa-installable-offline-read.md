# Installable PWA with limited read-only offline

**Parent:** [PLO-132](https://linear.app/ploutizo/issue/PLO-132)

## Problem Statement

Household members use Ploutizo on phones and desktops but can only reach it through a browser tab. The app cannot be installed, has no real manifest (`apps/web/public/manifest.json` is the unedited TanStack sample and is not linked), has no service worker, and shows a browser error when offline.

## Solution

Ship the existing web app as a PWA, installable on mobile and desktop from the same code that runs in a browser tab. Layer it:

1. **Installable shell.** Real manifest, icons generated from one source logo, head tags, and an app-shell service worker that precaches hashed static assets and serves an offline fallback page. SSR HTML, `/api`, and Clerk routes are never cached.
2. **Update prompt.** A new deploy shows a "new version available" toast; the user chooses when to refresh.
3. **Limited read-only offline.** TanStack DB browser persistence (WA-SQLite on OPFS) stores the collections that feed the dashboard and transactions list. The same code path serves browser tabs and the installed app; there is no PWA-specific branching.

## User Stories

1. As a household member, I want to install Ploutizo on my phone and desktop, so that it opens like an app.
2. As a household member, I want the installed app to open standalone with the correct name, icon, and colors.
3. As a household member, I want to be told when a new version is available and choose when to refresh, so that I do not lose in-progress work.
4. As a household member, I want to open the dashboard and transactions list without a connection, so that I can look things up on the go.
5. As a household member, I want a clear "offline, data as of <time>" indicator, so that I know the data may be stale.
6. As a household member, I want writes blocked clearly while offline, so that nothing silently fails.
7. As a household member, I want my local data wiped when I sign out or my session expires, so that my financial data does not linger on a shared device.
8. As a household member switching households, I want data from the other household never shown.
9. As a household member, I want a "New transaction" shortcut from the app icon, so that I can add a transaction quickly.

## Implementation Decisions

- **Scope of offline:** read-only. Offline writes and sync are deferred.
- **Offline data:** TanStack DB browser persistence. The dashboard and transactions list currently read plain TanStack Query results (transactions keyed by page and filters, dashboard by period); there are no collections to wrap yet, so this work creates `queryCollectionOptions` collections for them and wraps those with `persistedCollectionOptions`. The reference data they render (accounts, categories, tags, household members) is persisted the same way. Other collections follow later with the same pattern. Import review and finalize remain online-only.
- **Offline coverage:** offline reads cover the persisted window only: the default transactions view and any pages and filter sets the user has already loaded, and the dashboard period(s) already loaded. Anything never saved shows an explicit "not available offline" empty state, not an error or a spinner. The exact windowing and size bounds are settled in PLO-139.
- **Offline entry:** the app hydrates a server-rendered document, so cached JS and CSS alone cannot start it. A data-free Start shell is prerendered to `/offline.html` and served only for failed navigations; it boots the app from local data. Authenticated SSR responses are never cached. See PLO-133 findings.
- **Same path everywhere:** browser tab and installed PWA both use persistence. SSR renders without it; the database opens client-side only.
- **Multi-tab:** `BrowserCollectionCoordinator` when more than one window can share the database.
- **Scoping and wipe:** database name scoped by signed-in member and active household, consistent with the **access working set** (ADR 0007). Changing either discards the previous database. Sign-out wipes it.
- **Offline launch (auth):** trust the last known session on the device. The cached shell and local data open offline with a banner. On next online contact the session is re-validated; expiry wipes local data and returns to sign-in. A device re-lock is out of scope.
- **Service worker:** `vite-plugin-pwa` in `injectManifest` mode (Workbox), with prompt-mode updates. `generateSW` is not used: its navigation fallback is cache-first for every navigation and would skip SSR. The worker caches hashed static assets only. `sw.js` and the manifest are served with `Cache-Control: no-cache`. See PLO-133 findings.
- **Branding:** one source logo supplied by the product owner; a script generates 192/512/maskable and Apple touch icons. Name and short name "Ploutizo". `theme-color` meta uses light/dark media queries; manifest colors use one neutral value.
- **Mobile polish:** install plumbing plus an audit of dashboard, transactions, accounts, and settings in standalone mode (safe areas, tap targets, sheets, sidebar). Mobile navigation redesign is a follow-up.
- **Shortcut:** a manifest shortcut deep-links to the transactions page with the transaction sheet open. Delivered last.

## Testing Decisions

- Spikes (PLO-133, PLO-134) produce written go/no-go findings, including Safari and iOS for persistence.
- Unit and integration tests cover: persistence scoping per member and household, wipe on sign-out and session expiry, offline indicator state, service worker update prompt state, and the deep-link search param.
- Manual verification: installability (Lighthouse, Chrome/Edge install, iOS Add to Home Screen, Android), offline launch with network off, and auth flows with the service worker active.

## Out of Scope

- Push notifications and background sync.
- Offline writes and sync.
- App store packaging (TWA, Capacitor).
- A custom in-app install prompt (including an iOS hint).
- A device re-lock after offline time.
- Mobile navigation redesign (for example a bottom tab bar).

## PLO-133 findings

**Use `vite-plugin-pwa`.** `injectManifest` is the mode that fits this app. A hand-written worker is not required; the plugin injects the asset manifest into `src/sw.ts`.

Proved against the production Nitro server Railway starts (`node apps/web/.output/server/index.mjs`), not a live Railway deploy:

- Vite 8, TanStack Start, and Nitro work together when the plugin runs only on the client environment and writes to `.output/public`. Nitro's server build is a separate Vite environment. Generating the worker there rewrites `sw.js` after Nitro has recorded its size, and the server then truncates the script.
- `sw.js` is served at `/sw.js` with scope `/` and `Cache-Control: no-cache`. Hashed `/assets/*` stay immutable. This spike does not emit a web manifest (`manifest: false`); the same no-cache rule is already in place for `/manifest.webmanifest`.
- The precache is hashed JS, CSS, and fonts only. There is no HTML in it. Navigations use `NetworkOnly`. A catch handler returns the offline entry only when the navigation failed and the path is not `/api`, `/_serverFn`, `/sign-in`, `/sign-up`, `/__clerk`, or `/.clerk`. `navigateFallback` is unset. Clerk's Frontend API is cross-origin and is not intercepted.
- The offline entry is a prerender of `/` with the Start shell header, written to `/offline.html`. Global SPA mode stays off, so dev and ordinary requests still server-render. Nitro snapshots public files before prerender and does not serve that HTML itself, so a server route reads the file. The shell has no household data; the server-rendered `/` document is different and is not cached. The worker fetches the shell at install (`cache: 'no-store'`; `cache: 'reload'` is illegal in a service worker) and stores it separately from the precache.
- The client registers the worker in production only, and only activates an update when it receives `SKIP_WAITING`, so the update prompt can hook the same registration later. The first install activates on its own. The page is controlled on the next load.
- Headed Chrome: the worker reaches `activated`, the precache holds the hashed assets (2011 entries in this build), and a reload with the network off and the HTTP cache disabled still boots the public home. Offline `/sign-in` is the browser's network error, and `/api` fails to fetch. Headless Chrome never finishes Workbox's install, because `setTimeout` inside `cache.put` does not fire during install. That is a headless limitation.

## Further Notes

Slices, in dependency order: PLO-133 and PLO-134 spikes; PLO-135 installable shell; PLO-136 update prompt; PLO-137 standalone mobile audit; PLO-138 persistence foundation; PLO-139 offline-readable dashboard and transactions; PLO-140 new transaction shortcut.
