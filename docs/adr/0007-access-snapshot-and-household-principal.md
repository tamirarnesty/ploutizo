---
status: accepted
---

# Access snapshot and household principal

The identity provider remains the authority for sessions and credentials. Ploutizo does not mint its own login. What we own is **access state**: signed-out / signed-in member / active household, plus a verified **household principal** on interactive household API requests. In the browser, a Clerk-backed **AccessProvider** owns live access and token readiness; an **AccessRouterBridge** publishes that state into TanStack Router context and coordinates the **access working set**. Route policy lives in layout `beforeLoad` guards. Hard authorization stays at the API, with household data still persistence-scoped in queries ([ADR 0003](./0003-org-scoped-queries.md)).

## Decision

### Identity authority

The identity provider owns sessions, credentials, MFA, OAuth, and provider rate limiting. Web and API map verified identity claims into domain language. They do not replace the provider with a DIY session store.

### Web: client access provider

After Clerk loads, the browser derives **access state** from `useAuth()`: signed out; signed-in member with no household; signed-in member with an active household. Access state never contains bearer material.

Navigation policies (`guest`, `signed-in`, `active-household`) are pure functions of access state. Layout routes enforce those policies through `beforeLoad`, reading live access from router context. That is UX, not data authorization.

For signed-in access, the provider becomes ready only after Clerk returns a fresh bearer whose claims match the live access state on identity transition. Steady-state API requests use ordinary `getToken()`. Household UI and household API requests wait on that readiness boundary.

### Access working set

The web app holds household data for the live access state only, on one **QueryClient per active working set**. Changing signed-in member or active household is a hard cutoff: cancel in-flight work, dispose the prior client, run TanStack DB/autosave cleanups, publish the new client into router context and `QueryClientProvider` atomically, then invalidate the router.

Query keys name topics (`['accounts']`, `['import-draft', draftId]`). They do not include signed-in member or active household. Isolation is the readiness boundary plus working-set disposal — not a third identity encoded in keys.

### Credentials

`getHouseholdBearer` is the only way the web app attaches a bearer to household fetches.

- **Browser:** after transition readiness, `apiFetch` uses Clerk's `getToken()` via the registered client getter. Identity transitions verify a fresh token once with `{ skipCache: true }` and claim matching.
- **Server loaders:** each request resolves its bearer directly from Clerk `auth()` on that request. Server loaders do not depend on a root route snapshot or client transition state.

A same-origin BFF is a later topology choice, not part of this design.

Private server functions do not exist yet. When they do, they resolve verified access on the request — they do not read identity claims ad hoc. Functions with no member or household data stay explicitly public.

### API: household principal

Interactive household API requests require a **household principal**: signed-in member id and active household id from verified identity claims. Missing signed-in member or missing active household is rejected. Invalid authorized party is rejected.

Routes pass the principal's active household id into query and service helpers as `orgId`. Persistence still uses the org-scoped query contract in ADR 0003. Authenticated document responses and sensitive API data send `Cache-Control: private, no-store`. Sign-in return paths must be normalized local paths; absolute and protocol-relative values are rejected, including paths that normalize to protocol-relative.

## Considered options

| Option                                                   | Rejected because                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Replace the identity provider with a DIY session         | Sessions, MFA, OAuth, and provider rate-limiting are not the product                                 |
| Same-origin BFF for all browser → API calls              | Optional later topology; not required to make identity transitions deterministic                     |
| Put the bearer on the access snapshot                    | Serializing credentials into route context outlives the request and can authorize the wrong identity |
| Identity in query keys plus a cache wipe                 | Keys do not stop a mismatched bearer from writing the previous household's data under the new name   |
| Unbounded module-global token fallback                   | Survives household and member switches                                                               |
| Treat layout route guards as authorization               | Redirects are UX; the API plus ADR 0003 remain the data boundary                                     |
| Root server-resolved access snapshot on every navigation | Duplicates Clerk client state and re-runs access server functions on hover preloads                  |
| Private-access middleware before any private fn          | Speculative. Add the convention when the first private server function exists                        |

## Consequences

- New household queries use topic keys. Encoding signed-in member or active household in a key is a bug.
- Interactive API routes authorize from the household principal. They do not take household identity from the request body or path as authority.
- Query/service helpers keep `orgId` as the persistence parameter name (ADR 0003). Domain-facing names stay signed-in member, active household, access state, access working set, and household principal.
- Identity-provider widget chrome may wait for the identity client to load; that is presentation, not a second access model.
- Working-set cleanups are registered in `working-set-cleanup.ts` (imported from `AccessProvider`), not via import side effects in feature modules.
- Route loaders prefetch household data with native `ensureQueryData()` only when router context reports ready active-household access; otherwise queries wait on `useHouseholdQuery` readiness.
