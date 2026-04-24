---
created: "2026-04-21T00:00:00.000Z"
title: Migrate @hono/clerk-auth to @clerk/hono
area: api
files:
  - apps/api/src/index.ts
  - apps/api/src/middleware/tenantGuard.ts
  - apps/api/src/routes/households.ts
  - apps/api/src/__tests__/tenantGuard.test.ts
  - apps/api/src/__tests__/accounts.test.ts
  - apps/api/src/__tests__/categories.test.ts
  - apps/api/src/__tests__/transactions.test.ts
  - apps/api/src/__tests__/tags.test.ts
  - apps/api/src/__tests__/households.test.ts
  - apps/api/src/__tests__/merchant-rules.test.ts
---

## Problem

`@hono/clerk-auth` is deprecated and will be removed in the next major release. Runtime emits:

```
Clerk - DEPRECATION WARNING: "@hono/clerk-auth" is deprecated and will be removed in the next major release.
Use `@clerk/hono` instead.
```

10 files in `apps/api/src/` import from `@hono/clerk-auth`. The replacement package is `@clerk/hono` and exports the same `clerkMiddleware` and `getAuth` API surface.

## Solution

1. Add `@clerk/hono` to `apps/api/package.json` dependencies
2. Remove `@hono/clerk-auth` from dependencies
3. Global find-replace: `from "@hono/clerk-auth"` → `from "@clerk/hono"` across all 10 files
4. Run `pnpm install` and `pnpm --filter api typecheck` to confirm no API surface breakage
5. Verify `getAuth` and `clerkMiddleware` still work as expected (same export names per Clerk docs)
