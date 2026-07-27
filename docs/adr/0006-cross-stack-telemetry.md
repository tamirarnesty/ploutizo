---
status: accepted
---

# Cross-stack telemetry

Ploutizo has no coherent logging, error reporting, or request tracing across web and API. Failures are difficult to connect to a household member's journey, the UI action that initiated them, or the API work that followed — and the application handles household-finance data, so observability must remain useful without exporting financial values, import contents, credentials, raw request data, arbitrary entity IDs, or user-entered text.

## Decision

Introduce a shared, vendor-neutral package `@ploutizo/telemetry` that owns:

- the public caller contract (`TelemetryClient`)
- a small typed operation/event catalog with operation-scoped attribute schemas (compile-time privacy contract)
- flat primitive attributes only (single-level keys → string | number | boolean | null)
- UUIDv4 correlation helpers via `createCorrelationId` / parse-resolve (telemetry-only — never authorization)
- local console/no-op adapters and test fakes

Runtime-specific delivery remains outside the package and is **not** forced through a shared singleton:

| Runtime | Adapter responsibility                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Web     | PostHog identity, product events, structured browser logs, exception steps/capture, session replay, and client operations |
| API     | request-scoped OTel spans and logs, structured wide request outcomes, server exception capture, and response correlation  |

Web and API composition roots map prepared records to their respective SDKs. They use official SDK types directly; callers never import PostHog or OpenTelemetry. PostHog is the only planned vendor, but its adapter wiring lands with the web/API integrations rather than as a speculative bridge in the shared package.

Callers choose a stable, typed `operation` and `surface`, then attach **only** attributes allowed for that operation's schema. Privacy is enforced by TypeScript schemas and by callers omitting sensitive fields — not by a runtime key-bag firewall in `@ploutizo/telemetry`.

## Safety rules

Attribute schemas permit safe diagnostic primitives only (HTTP status, route templates, retry counts, machine error codes, etc.). Callers must never add financial values, entity identifiers, import contents, credentials, raw request data, or user-entered text.

Optional `attributes` objects are single-level only: keys map to `string | number | boolean | null`. Nested objects and arrays are out of scope for this package.

The package trusts correctly typed callers. It does not maintain a runtime blocklist or recursive sanitizer for bypassed types. Diagnostic `message` values may be lightly trimmed for length; sensitive content must not be placed there by callers.

PostHog ingest filters and privacy-first Session Replay masking remain product-level defenses at application wiring time — not substitutes for typed attributes and caller discipline.

Correlation IDs (`X-Request-Id`, `X-Operation-Id`, PostHog session/distinct headers) are observability-only and must never influence auth or tenancy. The API is authoritative for request IDs. IDs are created with `crypto.randomUUID()`.

## Observability signals (follow-up wiring)

- **Web:** PostHog product analytics, structured logs, Error Tracking, and privacy-first Session Replay.
- **API:** OpenTelemetry traces and logs exported to PostHog, plus server-side error reporting.
- **Wide request records:** one safe, richly attributed completion log per API request; extra logs only when they add distinct diagnostic value.

Normal browser logs use PostHog's structured logger. Explicit log capture is reserved for cases that need direct trace/span correlation. Console autocapture is not enabled.

## Correlation

| Identifier                         | Authority          | Scope                                                                            |
| ---------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| PostHog distinct ID and session ID | PostHog web client | Links person, session replay, browser logs, and backend telemetry                |
| `operation_id`                     | Web telemetry      | UUIDv4 generated once per logical UI/query operation and retained across retries |
| `X-Request-Id`                     | API                | One validated or generated identifier per HTTP attempt; returned in the response |
| OTel trace and span IDs            | API OTel adapter   | Links server spans and logs                                                      |

The API integration accepts PostHog correlation headers and validated operation IDs for telemetry only. They never participate in authorization.

## Identity and privacy (follow-up wiring)

After authentication, web telemetry identifies the Clerk user in PostHog and associates the active household as a PostHog group. It resets on sign-out and updates group context on household changes.

Session Replay is privacy-first: mask all text, inputs, and element attributes; block financial tables, import review, upload, and finance-detail surfaces. Only explicitly approved non-financial UI may later be unmasked. PostHog's dedicated person/session correlation fields are the sole exception to the general prohibition on identifiers in telemetry attributes.

## Environments and delivery

| Deployment environment | PostHog project | Local output                 |
| ---------------------- | --------------- | ---------------------------- |
| `local`                | Development     | Structured console + PostHog |
| `preview`              | Development     | PostHog                      |
| `production`           | Production      | PostHog                      |

`APP_ENV` and `VITE_APP_ENV` explicitly identify the deployment environment; do not infer it from `NODE_ENV`. Preview deployments are distinct from production. Resource attributes include environment, service name, and release/version.

## Adapter behavior

Telemetry is non-blocking: initialization, emission, queues, and exporter failures cannot delay or alter user actions, route loading, API responses, or retry behavior. Application delivery adapters contain rejected asynchronous emission and use bounded queues/timeouts; the shared contract has no transport layer.

## Error escalation

Every API failure emits a trace/log outcome. Expected validation, not-found, authorization/tenant, and known domain-conflict outcomes do not create Error Tracking issues. Network failures, malformed responses, 5xx responses, and unknown API codes do; callers may explicitly escalate an otherwise expected failure. Reporting deduplicates an API error that later reaches a recovery boundary.

When `apiFetch` is wired, its existing request-error boundary carries the safe status, code, route, method, duration, and correlation metadata required for classification. Do not introduce a competing API-error class in the shared package. Duration and correlation IDs stay on the event record, not inside attribute bags.

## Database boundary

Do not enable Drizzle raw SQL logging or export bound query parameters. The initial API traces cover request and high-level service work; Neon's native tooling remains the SQL/query diagnosis source. Neon OTel metrics/log exports and driver-level database spans are deferred until they can be integrated without a second observability backend or unsafe query data.

## Consequences

- The telemetry prerequisite must land before PLO-51's route preload and section-recovery adoption.
- Later issues wire PostHog (browser) and OTel (API) at their application composition roots behind this contract.
- Tests assert emitted records via `createFakeTelemetryClient`, never vendor payload shapes.
- Catalog growth is intentional but demand-driven: add named operations/surfaces alongside real callers rather than pre-registering future capabilities.
- All caller-visible operations and events become durable analytics contracts, not ad hoc strings.
- PostHog Distributed Tracing is alpha, so the OTel exporter remains isolated behind the API adapter.
- Initial production captures all API root spans and completion logs, with rate limits and future tail sampling; errors and warnings are always retained.
- PLO-51 uses section recovery boundaries only for independently usable data regions and overlay content. Dialog and sheet shells retain their normal close/focus behavior.
