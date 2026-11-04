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
- **Offline entry:** the app hydrates a server-rendered document, so cached JS and CSS alone cannot start it. A data-free, client-rendered offline entry document is precached and served only for failed navigations; it boots the app from local data. Authenticated SSR responses are never cached. Feasibility with TanStack Start and Nitro is part of the PLO-133 spike.
- **Same path everywhere:** browser tab and installed PWA both use persistence. SSR renders without it; the database opens client-side only. The route that owns the database sets `ssr: false`, and the open is a dynamic import that refuses to run when `import.meta.env.SSR` is set. Vite replaces that flag per bundle, so the server build cannot open OPFS.
- **Headers:** no COOP or COEP. `@tanstack/browser-db-sqlite-persistence` 0.2.37 uses wa-sqlite `OPFSCoopSyncVFS` in a dedicated worker. That VFS does not use `SharedArrayBuffer`. Adding cross-origin isolation would fight Clerk and is not required for OPFS.
- **Persistence package (PLO-134):** `@tanstack/browser-db-sqlite-persistence` 0.2.37 with `@journeyapps/wa-sqlite` 1.5.0. That release depends on `@tanstack/db-sqlite-persistence-core` 0.4.12, which depends on `@tanstack/db` 0.15.2, the version installed with `@tanstack/query-db-collection` 1.4.8. The 1.0.0-rc persistence line depends on `@tanstack/db` 1.0.0-rc and is not a drop-in. Findings are below.
- **Multi-tab:** `BrowserCollectionCoordinator` when more than one window can share the database.
- **Scoping and wipe:** database name scoped by signed-in member and active household, consistent with the **access working set** (ADR 0007). Changing either discards the previous database. Sign-out wipes it.
- **Offline launch (auth):** trust the last known session on the device. The cached shell and local data open offline with a banner. On next online contact the session is re-validated; expiry wipes local data and returns to sign-in. A device re-lock is out of scope.
- **Service worker:** `vite-plugin-pwa` (Workbox) with prompt-mode updates, pending the compatibility spike (PLO-133). Fallback: a hand-written service worker with an injected asset manifest. Caches hashed static assets only. `sw.js` and the manifest are served with `Cache-Control: no-cache`.
- **Branding:** one source logo supplied by the product owner; a script generates 192/512/maskable and Apple touch icons. Name and short name "Ploutizo". `theme-color` meta uses light/dark media queries; manifest colors use one neutral value.
- **Mobile polish:** install plumbing plus an audit of dashboard, transactions, accounts, and settings in standalone mode (safe areas, tap targets, sheets, sidebar). Mobile navigation redesign is a follow-up.
- **Shortcut:** a manifest shortcut deep-links to the transactions page with the transaction sheet open. Delivered last.

## Testing Decisions

- Spikes (PLO-133, PLO-134) produce written go/no-go findings, including Safari and iOS for persistence.
- Unit and integration tests cover: persistence scoping per member and household, wipe on sign-out and session expiry, offline indicator state, service worker update prompt state, and the deep-link search param.
- Manual verification: installability (Lighthouse, Chrome/Edge install, iOS Add to Home Screen, Android), offline launch with network off, and auth flows with the service worker active.

## PLO-134 findings

**Go** for the Chrome persistence path on the package versions above. **Safari desktop, iOS Safari, and an installed iOS home-screen window were not run** in this spike, so those checks are not a pass.

Verified in Chrome against the dev server, signed in to the Test Org household:

- The accounts query collection, wrapped with `persistedCollectionOptions`, opened `ploutizo-persistence-spike.sqlite` through the published OPFS worker. `crossOriginIsolated` was `no`. Three accounts (Amex Cobalt, Joint Chequing, Joint Savings) rendered from the live query.
- A reload that aborted `localhost:8080` still opened the database and showed those three accounts. Sync reported `Failed to fetch` and the live query status was `error`. Hydrated rows stayed on screen. PLO-139 has to render that state instead of replacing it with an error page.
- Two tabs in one browser profile showed the same three accounts, different coordinator node ids, and exactly one leader. A single tab becomes the leader after election; the first read can still say follower.
- The production client build emits the OPFS worker and calls the browser guard with `false`. The server build calls it with `true` and does not open the database. A signed-out request for the route redirects to sign-in. Preview on port 4173 could not call the API: that origin is outside the API allowlist, so the shell hit its existing error page before persistence could be judged there.
- Reloading with the network off, including the document, still needs the offline entry from PLO-133. This spike kept the dev server reachable and blocked the API only.

Not verified:

- Safari desktop and iOS Safari, including an installed home-screen app. wa-sqlite documents `OPFSCoopSyncVFS` as the multi-connection OPFS VFS with no COOP/COEP requirement, including on WebKit. That is library documentation, not a run on Safari or an iPhone.
- A tab plus an installed window. Chrome tabs in one profile share OPFS and `BroadcastChannel`, so an installed Chrome window on that profile should behave like the second tab. iOS keeps a home-screen web app in a separate storage partition from Safari, so those two do not share a database or a coordinator. PLO-138 should scope each partition on its own and not assume one database spans them.

The proof route is `/persistence-spike` (not in the nav). It is a spike harness: one unscoped database, no wipe on sign-out. PLO-138 replaces it. Do not ship the harness as the persistence foundation.

The installed TanStack skill text still says DB 0.6.17. The compatible persistence release for the installed 0.15.2 line is 0.2.37, as above. `@journeyapps/wa-sqlite`'s postinstall only downloads PowerSync dynamic cores; the persistence worker already vendors wa-sqlite, so that script stays disabled.

## Out of Scope

- Push notifications and background sync.
- Offline writes and sync.
- App store packaging (TWA, Capacitor).
- A custom in-app install prompt (including an iOS hint).
- A device re-lock after offline time.
- Mobile navigation redesign (for example a bottom tab bar).

## Further Notes

Slices, in dependency order: PLO-133 and PLO-134 spikes; PLO-135 installable shell; PLO-136 update prompt; PLO-137 standalone mobile audit; PLO-138 persistence foundation; PLO-139 offline-readable dashboard and transactions; PLO-140 new transaction shortcut.
