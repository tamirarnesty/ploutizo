---
status: accepted
---

# Cross-stack telemetry

<<<<<<< Updated upstream
Ploutizo had no coherent logging, error reporting, or request tracing across web and API. Failures could not be connected to a household member’s journey without risking export of financial values, import contents, credentials, raw request data, arbitrary entity IDs, or user-entered text.

## Decision

Introduce a shared, vendor-neutral package `@ploutizo/telemetry` that owns:

- the public caller contract (`TelemetryClient`)
- a typed operation/event catalog (stable operation + surface for every record)
- bounded recursive attribute sanitization
- typed API-error representation and expected/unexpected classification
- UUIDv4 operation/request correlation helpers (telemetry-only — never authorization)
- local console and no-op adapters, plus test fakes

Runtime adapters are **not** forced through a shared singleton:

- **Web** uses an application-scoped adapter (PostHog in a later issue).
- **API** uses request-scoped adapters (OpenTelemetry → PostHog in a later issue).

Both implement the same contract. Callers never import PostHog or OpenTelemetry from product code.

## Safety rules

Free-form attributes are accepted only after sanitization that:

- redacts credentials, tokens, raw request/response payloads
- redacts financial values, entity identifiers, import contents, and user-entered text keys
- bounds depth, key count, string length, array length, and total serialized size

Correlation IDs (`X-Request-Id`, `X-Operation-Id`, PostHog session/distinct headers) are observability-only and must never influence auth or tenancy.

## Adapter behavior

Every adapter is non-blocking: initialization, emission, and flush failures must not delay or change user actions, route loaders, API responses, or retry policy. Unavailable sinks degrade to no-op.

## Consequences

- Later issues wire PostHog (browser) and OTel (API) behind this contract.
- Tests assert safe emitted records via `createFakeTelemetryClient`, never vendor payload shapes.
- Catalog growth is intentional: new capabilities add named operations/surfaces rather than free-form event strings.
=======
Ploutizo has no coherent logging, error reporting, or request tracing in local development or deployed environments. Failures and slow operations are therefore difficult to connect to the **household member** who encountered them, the UI action that initiated them, or the API work that followed. The application handles household-finance data, so observability must remain useful without exporting financial values, import contents, credentials, or arbitrary request data.

## Decision

### One vendor-neutral contract, two runtime adapters

`@ploutizo/telemetry` owns the shared caller contract, typed operation/event catalog, safe-attribute sanitizer, API error classification, correlation identifiers, and test fakes. It does not depend on an observability vendor.

Web and API adapters satisfy that contract but retain their distinct lifecycles:

| Runtime | Adapter responsibility                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Web     | PostHog identity, product events, structured browser logs, exception steps/capture, session replay, and client operations |
| API     | request-scoped OTel spans and logs, structured wide request outcomes, server exception capture, and response correlation  |

Callers choose a stable, typed `operation` and `surface`; they may add arbitrary details only through the sanitizer. The sanitizer rejects or redacts raw request bodies and headers, credentials, tokens, financial values, entity identifiers, import contents, and user-entered text. It bounds attribute depth and size.

### Observability signals

PostHog is the initial adapter:

- **Web:** PostHog product analytics, structured logs, Error Tracking, and privacy-first Session Replay.
- **API:** OpenTelemetry traces and logs exported to PostHog, plus server-side error reporting.
- **Wide request records:** one safe, richly attributed completion log per API request; extra logs only when they add distinct diagnostic value.

Normal browser logs use PostHog's structured logger. Explicit log capture is reserved for cases that need direct trace/span correlation. Console autocapture is not enabled.

### Correlation

| Identifier                         | Authority          | Scope                                                                            |
| ---------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| PostHog distinct ID and session ID | PostHog web client | Links person, session replay, browser logs, and backend telemetry                |
| `operation_id`                     | Web telemetry      | UUIDv4 generated once per logical UI/query operation and retained across retries |
| `X-Request-ID`                     | API                | One validated or generated identifier per HTTP attempt; returned in the response |
| OTel trace and span IDs            | API OTel adapter   | Links server spans and logs                                                      |

The API accepts PostHog correlation headers and validated operation IDs for telemetry only. They never participate in authorization. The server is authoritative for request IDs.

### Identity and privacy

After authentication, web telemetry identifies the Clerk user in PostHog and associates the active household as a PostHog group. It resets on sign-out and updates group context on household changes.

Session Replay is privacy-first: mask all text, inputs, and element attributes; block financial tables, import review, upload, and finance-detail surfaces. Only explicitly approved non-financial UI may later be unmasked. PostHog's dedicated person/session correlation fields are the sole exception to the general prohibition on identifiers in telemetry attributes.

### Environments and delivery

| Deployment environment | PostHog project | Local output                 |
| ---------------------- | --------------- | ---------------------------- |
| `local`                | Development     | Structured console + PostHog |
| `preview`              | Development     | PostHog                      |
| `production`           | Production      | PostHog                      |

`APP_ENV` and `VITE_APP_ENV` explicitly identify the deployment environment; do not infer it from `NODE_ENV`. Preview deployments are distinct from production. Resource attributes include environment, service name, and release/version.

Telemetry is non-blocking: initialization, capture, queues, and exporter failures cannot delay or alter user actions, route loading, API responses, or retry behavior. Adapters use bounded queues, timeouts, and local no-op/console fallback.

### Error escalation

Every API failure emits a trace/log outcome. Expected validation, not-found, authorization/tenant, and known domain-conflict outcomes do not create Error Tracking issues. Network failures, malformed responses, 5xx responses, and unknown API codes do; callers may explicitly escalate an otherwise expected failure. Reporting deduplicates an API error that later reaches a recovery boundary.

### Database boundary

Do not enable Drizzle raw SQL logging or export bound query parameters. The initial API traces cover request and high-level service work; Neon’s native tooling remains the SQL/query diagnosis source. Neon OTel metrics/log exports and driver-level database spans are deferred until they can be integrated without a second observability backend or unsafe query data.

## Consequences

- The telemetry prerequisite must land before PLO-51's route preload and section-recovery adoption.
- All caller-visible operations and events become durable analytics contracts, not ad hoc strings.
- PostHog Distributed Tracing is alpha, so the OTel exporter remains isolated behind the API adapter.
- Initial production captures all API root spans and completion logs, with rate limits and future tail sampling; errors and warnings are always retained.
- PLO-51 uses section recovery boundaries only for independently usable data regions and overlay content. Dialog and sheet shells retain their normal close/focus behavior.
>>>>>>> Stashed changes
