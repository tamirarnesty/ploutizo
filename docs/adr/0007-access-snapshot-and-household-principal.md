---
status: accepted
---

# Access snapshot and household principal

The identity provider remains the authority for sessions and credentials. Ploutizo does not mint its own login. What we own is **access state**: a serializable snapshot of signed-out / signed-in member / active household, plus a verified **household principal** on interactive household API requests. Route checks only steer UX from that snapshot. Hard authorization stays at the API, with household data still persistence-scoped in queries ([ADR 0003](./0003-org-scoped-queries.md)).

## Decision

### Identity authority

The identity provider owns sessions, credentials, MFA, OAuth, and provider rate limiting. Web and API map verified identity claims into domain language. They do not replace the provider with a DIY session store.

### Web: one access snapshot

Resolve **access state** once per request in the root route and put only serializable facts in route context: signed out; signed-in member with no household; signed-in member with an active household. Snapshots never contain bearer material.

Navigation policies (`guest`, `signed-in`, `active-household`) are pure functions of access state. Layouts and routes apply those policies as redirects. That is UX, not data authorization.

### Identity transitions

When the signed-in member or active household changes: cancel in-flight work, bump the mutation epoch, clear session-scoped cache, drop any transition credential, and re-resolve the route snapshot.

After the identity client has loaded, descendant data work resumes only when that client's access state and the route snapshot agree. Query keys are not a third compared object: they are built from the access used after that gate. While the identity client is still loading, work continues so server-rendered and first-paint work are not blanked.

A bounded post-login transition credential may exist only to cover the interval before the identity client can mint a token. It is bound to signed-in member and active household, allowed while client identity is still unknown (catchup after login), and cleared when the identity client returns a token, on explicit sign-out, or on identity mismatch. A same-origin BFF is a later topology choice, not part of this design.

### Cache keys and server functions

Household data keys include signed-in member and active household. Import draft and prepared-import keys follow the same rule.

Private server functions obtain verified access through reusable private-access middleware. Functions with no member or household data stay explicitly public. The middleware exists as that convention even before a private server function exists; the next private function must use it rather than reading identity claims ad hoc.

### API: household principal

Interactive household API requests require a **household principal**: signed-in member id and active household id from verified identity claims. Missing signed-in member or missing active household is rejected. Invalid authorized party is rejected.

Routes pass the principal's active household id into query and service helpers as `orgId`. Persistence still uses the org-scoped query contract in ADR 0003. Authenticated document responses and sensitive API data send `Cache-Control: private, no-store`. Sign-in return paths must be normalized local paths; absolute and protocol-relative values are rejected.

## Considered options

| Option                                              | Rejected because                                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Replace the identity provider with a DIY session    | Sessions, MFA, OAuth, and provider rate-limiting are not the product                                                         |
| Same-origin BFF for all browser → API calls         | Optional later topology; not required to make identity transitions deterministic                                             |
| Put the bearer on the access snapshot               | Serializing credentials into route context outlives the request and can authorize the wrong identity                         |
| Unbounded module-global token fallback              | Survives household and member switches                                                                                       |
| Treat layout route guards as authorization          | Redirects are UX; the API plus ADR 0003 remain the data boundary                                                             |
| Blank the tree until the identity client has loaded | Drops server-rendered / hydration work that already ran against a server-resolved snapshot                                   |
| Compare query-key identity as a third resume input  | Keys are derived from the access used after the identity-client / route gate; a third comparison would duplicate that access |

## Consequences

- New household queries include signed-in member and active household in the cache key. A key that omits either is a bug.
- New private server functions use private-access middleware. Feature code does not read identity claims directly.
- New interactive API routes authorize from the household principal. They do not take household identity from the request body or path as authority.
- Query/service helpers keep `orgId` as the persistence parameter name (ADR 0003). Domain-facing names stay signed-in member, active household, access state, and household principal.
- Identity-provider widget chrome may wait for the identity client to load; that is presentation, not a second access model.
