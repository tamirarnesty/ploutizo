---
status: accepted
---

# Browser persistence scope and sign-out wipe

Offline reads need a durable browser database. That database holds household financial data, so it has to follow the same cutoff as the **access working set**: one signed-in member and one active household at a time, and nothing left behind after sign-out.

## Decision

Use `@tanstack/browser-db-sqlite-persistence` 0.2.37 with `@journeyapps/wa-sqlite` 1.5.0. Open OPFS through `openBrowserWASQLiteOPFSDatabase`, which uses `OPFSCoopSyncVFS`. That VFS does not use `SharedArrayBuffer`. The app does not send COOP or COEP and does not require `crossOriginIsolated`.

The database opens in the browser only, after Clerk has loaded. SSR does not open it. The same path runs in a browser tab and an installed window.

### Scope

The file name is `ploutizo-offline/<signed-in member id>/<active household id>.sqlite`. Each id must match `[A-Za-z0-9_-]`; anything else does not get a database. `OPFSCoopSyncVFS` stores that path under the origin directory, including the `-journal` and `-wal` siblings.

`BrowserCollectionCoordinator` uses the same path as `dbName`. Tabs that share a file elect one leader. Tabs for a different member or household do not.

There is no database during onboarding (signed in, no active household).

### Switch and wipe

Switching signed-in member or active household closes the connection and opens the other file. The previous file stays on disk so that pair can hydrate again. It is not opened for anyone else.

Sign-out deletes the `ploutizo-offline` directory after the connection closes. A session that resolves as signed out takes the same path, including expiry. Deleting the directory removes every household visited on this origin, not only the one that was open. A missing directory is already wiped. A file another tab still has open is retried until that tab closes it.

Clerk's first render looks signed out. Persistence does not sync until identity has loaded, so a refresh does not wipe a signed-in member's file.

### Collections

A collection opts in with `persistedCollectionOptions`, `await currentBrowserPersistence()`, a stable `id`, and a `schemaVersion`. `null` means there is no active household or this browser cannot open OPFS. The collection does not close the database. On working-set replacement it registers a release that finishes `collection.cleanup()` after subscribers leave; the session waits for that release before closing the file.

Import review stays online-only.

iOS Safari and an installed home-screen window opened this stack. Desktop Safari is a final release QA step, not a blocker for the foundation.

## Considered options

| Option | Rejected because |
| --- | --- |
| One shared database, with member and household only in query keys | Query keys do not stop the wrong working set from reading the file. ADR 0007 already rejects identity in keys. |
| Delete the previous file when the member or household changes | Returning to that household would lose the local copy. The other scope never opens the file. Sign-out is what removes it. |
| On sign-out, delete only the open database | Households visited earlier in the session would remain on a shared device. |
| COOP/COEP so a SharedArrayBuffer VFS can run | `OPFSCoopSyncVFS` does not need them, and those headers isolate the rest of the shell. |
| A separate database path for the installed app | An installed window on the same profile shares OPFS with a tab. An iOS home-screen window has its own partition, and the same code still scopes and wipes it. |
| The 1.0.0-rc persistence packages | They depend on `@tanstack/db` 1.0.0-rc. The app is on 0.15.2. |

## Consequences

- Browser persistence is not a query-key concern. The working set's open file is the isolation boundary.
- `apps/web` pins both packages. `wa-sqlite`'s postinstall stays disabled; the published worker vendors its wasm.
- Vite must keep `@tanstack/browser-db-sqlite-persistence` out of `optimizeDeps` and out of the server bundle. Prebundling rewrites the worker URL.
- Persisted collections are created after the access snapshot has synced. They register their teardown on the working-set cleanup, not by closing OPFS themselves.
- Desktop Safari is still unchecked. That does not block this foundation.
