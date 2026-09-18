---
status: accepted
---

# Access snapshot and household principal

The identity provider remains the authority for sessions and credentials. Ploutizo does not mint its own login. What we own is **access state**: signed-out / signed-in member / active household, plus a verified **household principal** on interactive household API requests.

In the browser, a Clerk-backed **AccessProvider** owns a single **access snapshot** and publishes it on two read paths:

- **React context** (`useAccess()`) — UI, data-access hooks, bearer recovery
- **Router context** — `beforeLoad` guards and route loaders

There is no bridge or second source of truth. Route policy lives in layout `beforeLoad` guards. Hard authorization stays at the API, with household data still persistence-scoped in queries ([ADR 0003](./0003-org-scoped-queries.md)).

## Decision

### Identity authority

The identity provider owns sessions, credentials, MFA, OAuth, and provider rate limiting. Web and API map verified identity claims into domain language. They do not replace the provider with a DIY session store.

### Web: access snapshot

After Clerk loads, the browser derives **access state** from `useAuth()`: signed out; signed-in member with no household; signed-in member with an active household. Access state never contains bearer material.

The snapshot has two readiness signals:

| Signal           | Meaning                                                                               | Used by                                                           |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `identityLoaded` | Clerk has finished its initial load                                                   | Route policy stall guard (client only)                            |
| `isReady`        | Bearer validated on identity transition (signed-in) or identity resolved (signed-out) | Household loaders, `useHouseholdQuery`, `BearerReadinessBoundary` |

**Route policy (`enforceAccessPolicy`) uses identity (`access`) only.** It does not wait for bearer readiness. Bearer readiness gates household data prefetch and household UI — not navigation redirects.

Navigation policies (`guest`, `signed-in`, `active-household`) are pure functions of access state. Layout routes enforce those policies through `beforeLoad`, reading `access` from router context on the client and `resolve.server` on SSR. That is UX, not data authorization.

For signed-in access, the provider becomes bearer-ready only after Clerk returns a fresh token whose claims match the live access state on identity transition. Steady-state API requests use ordinary `getToken()`. Household UI and household API requests wait on that readiness boundary.

### Provider tree and publication

Auth lives above the router. `AccessProvider` owns the snapshot; `AccessRouterProvider` passes `{ access, identityLoaded, isReady, queryClient }` into `RouterProvider` via the `context` prop on render.

```text
ClerkProvider
  AccessProvider              ← single snapshot owner
    AccessRouterProvider      ← publishes snapshot → RouterProvider context
      QueryClientProvider
        routes…
```

`useAccess()` exposes the snapshot plus client-only bearer recovery (`bearerError`, `retryBearer`). Bearer recovery is never published to router context.

### Router context shape

```ts
interface RouterContext {
  queryClient: QueryClient
  access: AccessState
  identityLoaded: boolean // Clerk isLoaded — client stall guard for route policy
  isReady: boolean // bearer ready (signed-in) or identity resolved (signed-out)
}
```

`getRouter()` seeds placeholder values for SSR bootstrap. Live values come from `AccessRouterProvider` on the client.

### Route policy (`enforceAccessPolicy`)

Route policy uses **identity only**. It does not wait for bearer readiness.

```ts
export const enforceAccessPolicy = async (
  context: Pick<RouterContext, 'access' | 'identityLoaded'>,
  policy: AccessPolicy,
  locationHref: string
) => {
  // Client: access is signed-out placeholder until Clerk loads — do not redirect yet.
  if (!import.meta.env.SSR && !context.identityLoaded) {
    return
  }

  const access = import.meta.env.SSR
    ? await getRequestAccess() // SSR: Clerk auth() per request
    : context.access // client: identity from snapshot

  const target = resolveAccessNavigation(access, policy, locationHref)
  if (target) throw redirect(target)
}
```

Policy outcomes (pure functions of `access` via `resolveAccessRedirect`):

| Policy             | signed-out   | signed-in, no household | signed-in, has household |
| ------------------ | ------------ | ----------------------- | ------------------------ |
| `guest`            | stay         | `/onboarding`           | `/dashboard`             |
| `signed-in`        | `/sign-in/$` | stay                    | stay                     |
| `active-household` | `/sign-in/$` | `/onboarding`           | stay                     |

When bearer is not yet ready but identity is known (e.g. signed-in-with-household on a guest route), policy redirects immediately — the user belongs elsewhere. `BearerReadinessBoundary` gates the household shell; policy does not.

### Responsibility split

| Concern                   | Reads                                    | Does not read  |
| ------------------------- | ---------------------------------------- | -------------- |
| `enforceAccessPolicy`     | `access`, `identityLoaded`               | `isReady`      |
| `isHouseholdLoaderReady`  | `access`, `isReady`                      | —              |
| `BearerReadinessBoundary` | `useAccess()` (`isReady`, `bearerError`) | router context |
| `useHouseholdQuery`       | `useAccess()` (`isReady`)                | router context |
| `apiFetch`                | `getHouseholdBearer()`                   | router context |

### Access working set

The web app holds household data for the live access state only, on one **QueryClient per active working set**. Changing signed-in member or active household is a hard cutoff: cancel in-flight work, dispose the prior client, run TanStack DB/autosave cleanups, publish the new client into the snapshot (router context and `QueryClientProvider`) atomically, then invalidate the router.

Query keys name topics (`['accounts']`, `['import-draft', draftId]`). They do not include signed-in member or active household. Isolation is the readiness boundary plus working-set disposal — not a third identity encoded in keys.

### Credentials

`getHouseholdBearer` is the only way the web app attaches a bearer to household fetches.

- **Browser:** after transition readiness, `apiFetch` uses Clerk's `getToken()` via the registered client getter. Identity transitions verify a fresh token once with `{ skipCache: true }` and claim matching.
- **Server loaders:** each request resolves its bearer directly from Clerk `auth()` on that request. Server loaders do not depend on client transition state.

A same-origin BFF is a later topology choice, not part of this design.

Private server functions do not exist yet. When they do, they resolve verified access on the request — they do not read identity claims ad hoc. Functions with no member or household data stay explicitly public.

### API: household principal

Interactive household API requests require a **household principal**: signed-in member id and active household id from verified identity claims. Missing signed-in member or missing active household is rejected. Invalid authorized party is rejected.

Routes pass the principal's active household id into query and service helpers as `orgId`. Persistence still uses the org-scoped query contract in ADR 0003. Authenticated document responses and sensitive API data send `Cache-Control: private, no-store`. Sign-in return paths must be normalized local paths; absolute and protocol-relative values are rejected, including paths that normalize to protocol-relative.

## Considered options

| Option                                                   | Rejected because                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Replace the identity provider with a DIY session         | Sessions, MFA, OAuth, and provider rate-limiting are not the product                                         |
| Same-origin BFF for all browser → API calls              | Optional later topology; not required to make identity transitions deterministic                             |
| Put the bearer on the access snapshot                    | Serializing credentials into route context outlives the request and can authorize the wrong identity         |
| Identity in query keys plus a cache wipe                 | Keys do not stop a mismatched bearer from writing the previous household's data under the new name           |
| Unbounded module-global token fallback                   | Survives household and member switches                                                                       |
| Treat layout route guards as authorization               | Redirects are UX; the API plus ADR 0003 remain the data boundary                                             |
| Root server-resolved access snapshot on every navigation | Duplicates Clerk client state and re-runs access server functions on hover preloads                          |
| Bearer readiness in route policy guards                  | Conflates identity navigation with credential validation; causes redirect timing bugs and hydration mismatch |
| React-to-router bridge (`router.update` in effects)      | Dual source of truth; one-tick lag; render-phase side effects under TanStack Start                           |
| Private-access middleware before any private fn          | Speculative. Add the convention when the first private server function exists                                |

## Consequences

- New household queries use topic keys. Encoding signed-in member or active household in a key is a bug.
- Interactive API routes authorize from the household principal. They do not take household identity from the request body or path as authority.
- Query/service helpers keep `orgId` as the persistence parameter name (ADR 0003). Domain-facing names stay signed-in member, active household, access state, access working set, and household principal.
- Identity-provider widget chrome may wait for the identity client to load; that is presentation, not a second access model.
- Working-set cleanups are registered in `working-set-cleanup.ts` (imported from `AccessProvider`), not via import side effects in feature modules.
- Route loaders prefetch household data with native `ensureQueryData()` only when router context reports bearer-ready active-household access; otherwise queries wait on `useHouseholdQuery` readiness.
- UI and data-access code use `useAccess()`; route guards and loaders use router `context`. Shared libraries do not import router for auth.
- Non-UI code imports access subpaths directly (`working-set`, `enforce-access-policy`, etc.), not the `@/lib/access` barrel.
