---
created: 2026-04-30T00:00:00Z
title: Request ID / Trace ID infrastructure for FE-BE correlation
area: api,observability
---

## Problem

No request ID concept exists across FE and BE. Client-side errors (render crashes, failed API calls) have no correlation to server-side logs. Makes future logging/observability work harder and limits debugging in production.

## Solution

Add a UUID-per-request ID concept:
- Hono middleware generates a UUID per request, attaches as `X-Request-Id` response header
- `apiFetch` in `apps/web/src/lib/queryClient.ts` reads and surfaces the ID on API errors
- Error boundary (added in 03.4.4) can optionally display the request ID when the error originated from an API call

This is a cross-cutting infrastructure concern — not scoped to any single feature. Should be its own phase, ideally as a prerequisite before any logging/observability phase.

## Surfaced during

Phase 03.4.4 discussion (2026-04-30)
