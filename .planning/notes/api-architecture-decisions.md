---
title: API Architecture Decisions
date: 2026-04-14
context: Exploration session on API code structure and organization before Phase 03.4+ adds more routes
---

## Layering

**routes → services → queries** is the target pattern. `transactions` already follows it. All other routes (`accounts`, `categories`, `tags`, `merchant-rules`, `households`) have raw Drizzle queries inline and need service extraction.

## Validation lives at the route layer

Request validation (Zod) belongs at the route — not in services. Routes are the system boundary where untrusted external input enters. Services receive already-typed, validated data and should never need to know about HTTP error shapes (400/422). Using Hono's `zValidator` middleware makes this declarative.

## Services receive typed data, not raw context

Services should accept typed arguments, not Hono context objects. This keeps them portable (testable without HTTP context, callable from jobs or other services).

## orgId from context, not getAuth

`tenantGuard` already verifies `orgId`. It should `c.set('orgId', orgId)` so handlers read `c.get('orgId')` — removes repeated `getAuth(c)` calls from every handler.

## Typed domain errors + app.onError()

Services throw typed error classes (`NotFoundError`, `DomainError`). A single `app.onError()` in `index.ts` maps them to HTTP responses. Eliminates per-route try/catch and the `badRequest` helper.

## Webhook handler decomposition

- **Svix signature verification** → dedicated `webhookAuth` middleware (same pattern as `tenantGuard`)
- **Event handlers** → `services/webhooks.ts`, one function per event type (`handleOrgCreated`, `handleUserCreated`, etc.)
- **Clerk `WebhookEvent` type** from `@clerk/backend` — discriminated union; narrowing on `event.type` gives correctly-typed `event.data`, eliminates all manual `as { ... }` casts

## Hono built-ins to adopt

- `zValidator('json', schema)` — replaces manual `safeParse(await c.req.json())` + error response (used in 5+ handlers)
- `zValidator('query', schema)` — replaces manual query param coercion in `GET /transactions`
- `app.onError()` — centralized error mapping; replaces per-route catch blocks
