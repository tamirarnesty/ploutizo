---
status: accepted
---

# Access snapshot and household principal

The identity provider remains the authority for sessions and credentials. Ploutizo does not mint its own login. What we own is **access state**: a serializable snapshot of signed-out / signed-in member / active household, plus a verified **household principal** on interactive household API requests. That snapshot owns three jobs: navigation **access policy**, the bearer we fetch as, and the **access working set**. Route checks only steer UX. Hard authorization stays at the API, with household data still persistence-scoped in queries ([ADR 0003](./0003-org-scoped-queries.md)).

## Decision

### Identity authority

The identity provider owns sessions, credentials, MFA, OAuth, and provider rate limiting. Web and API map verified identity claims into domain language. They do not replace the provider with a DIY session store.

### Web: one access snapshot

Resolve **access state** once per request in the root route and put only serializable facts in route context: signed out; signed-in member with no household; signed-in member with an active household. Snapshots never contain bearer material.

Navigation policies (`guest`, `signed-in`, `active-household`) are pure functions of access state. Layouts and routes apply those policies as redirects. That is UX, not data authorization.

### Access working set

The web app holds household data for the live access state only, on a singleton query cache. Changing signed-in member or active household is a hard cutoff: cancel in-flight work, discard the cache, drop import collections and paced maps, drop any transition bearer, and re-resolve the route snapshot.

Query keys name topics (`['accounts']`, `['import-draft', draftId]`). They do not include signed-in member or active household. Isolation is pause (mismatch window between identity provider and route snapshot) plus that cutoff — not a third identity encoded in keys.

After the identity client has loaded, descendant UI resumes only when that client's access state and the route snapshot agree. While the identity client is still loading, work continues so server-rendered and first-paint work are not blanked. After it has loaded, disagreement always ends the working set and invalidates; a loaded signed-out provider is the new access state, not a flash to ignore.

### Credentials

`getHouseholdBearer` is the only way the web app attaches a bearer to household fetches. A token is usable only when its claims match the live access state. Receiving any string from the identity client is not success. A bounded post-login transition bearer may cover the interval before the identity client can mint a matching token; it is bound to the same snapshot, used only when it matches, and must not be dropped by a mismatched client token. A same-origin BFF is a later topology choice, not part of this design.

Private server functions do not exist yet. When they do, they resolve verified access on the request — they do not read identity claims ad hoc. Functions with no member or household data stay explicitly public.

### API: household principal

Interactive household API requests require a **household principal**: signed-in member id and active household id from verified identity claims. Missing signed-in member or missing active household is rejected. Invalid authorized party is rejected.

Routes pass the principal's active household id into query and service helpers as `orgId`. Persistence still uses the org-scoped query contract in ADR 0003. Authenticated document responses and sensitive API data send `Cache-Control: private, no-store`. Sign-in return paths must be normalized local paths; absolute and protocol-relative values are rejected, including paths that normalize to protocol-relative.

## Considered options

| Option                                              | Rejected because                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Replace the identity provider with a DIY session    | Sessions, MFA, OAuth, and provider rate-limiting are not the product                                                         |
| Same-origin BFF for all browser → API calls         | Optional later topology; not required to make identity transitions deterministic                                             |
| Put the bearer on the access snapshot               | Serializing credentials into route context outlives the request and can authorize the wrong identity                         |
| QueryClient per identity                            | Pause plus cutoff on the singleton already discards the previous household; a second client is another cache to hydrate      |
| Identity in query keys plus a cache wipe            | Keys do not stop a mismatched bearer from writing the previous household's data under the new name                           |
| Unbounded module-global token fallback              | Survives household and member switches                                                                                       |
| Treat layout route guards as authorization          | Redirects are UX; the API plus ADR 0003 remain the data boundary                                                             |
| Blank the tree until the identity client has loaded | Drops server-rendered / hydration work that already ran against a server-resolved snapshot                                   |
| Private-access middleware before any private fn     | Speculative. Add the convention when the first private server function exists                                                |

## Consequences

- New household queries use topic keys. Encoding signed-in member or active household in a key is a bug.
- Interactive API routes authorize from the household principal. They do not take household identity from the request body or path as authority.
- Query/service helpers keep `orgId` as the persistence parameter name (ADR 0003). Domain-facing names stay signed-in member, active household, access state, access working set, and household principal.
- Identity-provider widget chrome may wait for the identity client to load; that is presentation, not a second access model.
