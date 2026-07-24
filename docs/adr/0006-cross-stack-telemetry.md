---
status: accepted
---

# Cross-stack telemetry

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
