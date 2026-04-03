---
status: awaiting_human_verify
trigger: "outdated-dependencies-upgrade"
created: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — packages to upgrade identified. Zod v4 is API-compatible with all current usage patterns (tested in isolation). Key upgrades: zod ^3.25.76→^4.3.6, @tanstack/react-router/start/router-plugin ^1.132→^1.168, @types/node ^25.1.0→^25.5.2, vite ^7.2.4→^8.0.3, @vitejs/plugin-react ^5.1.1→^6.0.1, vitest ^4.1.2 already current, tsx ^4.19.4→^4.21.0, @hono/node-server already current, svix ^1.89.0→^1.90.0, @types/react ^19.2.10→^19.2.14, turbo ^2.8.17→^2.9.3, @turbo/gen ^2.8.1→^2.9.3, @tanstack/eslint-config ^0.3.0→^0.4.0, typescript 5.9.3→^6.0.2, tsup ^8.5.0→^8.5.1, dotenv ^17.3.1→^17.4.0, @clerk/ui ^1.2.4→^1.3.0 (ui), @clerk/tanstack-react-start ^1.0.7→^1.0.8, eslint ^9.39.2→^10.1.0, vite-tsconfig-paths ^5.1.4→^6.1.1, shadcn ^4.1.1/^4.1.2 already current
test: Update all package.json files then run pnpm install + typecheck
expecting: Clean install and typecheck pass
next_action: Update package.json files

## Symptoms

expected: All dependencies at latest stable versions with working code
actual: Multiple packages are outdated (e.g., zod ^3.25.76 in packages/ui/package.json) — should be upgraded to latest (zod v4)
errors: No runtime errors yet, but need to migrate code for breaking changes (e.g., zod v4 has breaking changes from v3)
reproduction: Check any package.json across the monorepo
started: Packages have drifted behind; not a regression

## Eliminated

- hypothesis: Zod v4 requires code migration for current usage patterns
  evidence: Tested all patterns used in packages/validators/src/index.ts against zod@4.3.6 — z.object, z.enum, z.string, z.boolean, z.array, z.number, .partial(), .extend(), .omit(), .refine(), .uuid() all work identically. No code changes needed.
  timestamp: 2026-04-03T00:00:00Z

## Evidence

- timestamp: 2026-04-03T00:00:00Z
  checked: All 7 package.json files (root, apps/api, apps/web, packages/ui, packages/types, packages/db, packages/validators)
  found: Zod used in packages/validators and packages/ui only. All zod API usage is compatible with v4.3.6.
  implication: Safe to upgrade zod to ^4.3.6 with no code changes required.

- timestamp: 2026-04-03T00:00:00Z
  checked: npm show for all installed packages
  found: Most packages are already at latest. Key updates needed: zod (3→4), @tanstack/react-router family (1.132→1.168), vite (7→8), @vitejs/plugin-react (5→6), typescript (5.9→6.0), eslint (9→10), vite-tsconfig-paths (5→6), @tanstack/eslint-config (0.3→0.4), turbo (2.8→2.9), various minor bumps
  implication: No single breaking change dominates; upgrades are mostly additive. TypeScript 6.0 and eslint 10 are the other two major version bumps.

## Resolution

root_cause: Dependencies drifted from latest stable versions. Key major-version upgrades required code fixes: (1) zod v3→v4: z.enum() no longer accepts `required_error` option (renamed to `error`), error code `invalid_enum_value` renamed to `invalid_value`, UUID validation stricter (sequential test UUIDs like 00000000-…-0001 now rejected); (2) TypeScript 6.0: `process` global requires explicit `types: ["node"]` in tsconfig, `baseUrl` deprecated (use `ignoreDeprecations: "6.0"` to silence), `res.json()` return type is now `unknown` in strict mode; (3) Vite 8, @vitejs/plugin-react 6, vite-tsconfig-paths 6: peer-compatible upgrades; (4) Pre-existing bugs surfaced: reui data-grid files had wrong import paths (`@ploutizo/components/ui/button` instead of `@ploutizo/components/button`), reui files missing `import type` for `verbatimModuleSyntax`, Clerk SignIn/SignUp removed `afterSignInUrl`/`afterSignUpUrl` props (replaced with `fallbackRedirectUrl`); (5) typescript-eslint peer constraint for TS<6.0 required pnpm override to 8.58.0.
fix: Updated all 7 package.json files to latest versions. Added pnpm override for typescript-eslint@^8.58.0. Fixed zod v4 breaking changes in validators/src/index.ts (required_error→error). Fixed TypeScript 6 tsconfig issues (types:["node"] in db+api, ignoreDeprecations:"6.0"+baseUrl in ui+web). Fixed pre-existing reui import path bugs (ui/button→button etc.). Fixed verbatimModuleSyntax type-only imports in reui/data-grid-table.tsx, data-grid.tsx, sortable.tsx. Fixed Clerk props in sign-in.$.tsx and sign-up.$.tsx. Updated test expectations for zod v4 error code changes and fixed invalid test UUIDs.
verification: pnpm typecheck — 6/6 packages pass (0 errors). pnpm test — all tests pass (35 validator tests, 26 api tests, 6 db tests).
files_changed:
  - package.json
  - apps/api/package.json
  - apps/api/tsconfig.json
  - apps/api/src/__tests__/accounts.test.ts
  - apps/api/src/__tests__/categories.test.ts
  - apps/api/src/__tests__/merchant-rules.test.ts
  - apps/api/src/__tests__/tags.test.ts
  - apps/api/src/routes/accounts.ts
  - apps/web/package.json
  - apps/web/tsconfig.json
  - apps/web/src/routes/sign-in.$.tsx
  - apps/web/src/routes/sign-up.$.tsx
  - packages/db/package.json
  - packages/db/tsconfig.json
  - packages/types/package.json
  - packages/ui/package.json
  - packages/ui/tsconfig.json
  - packages/ui/src/components/reui/data-grid/data-grid.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-table.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-column-filter.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-column-header.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-column-visibility.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-pagination.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-table-dnd.tsx
  - packages/ui/src/components/reui/data-grid/data-grid-table-dnd-rows.tsx
  - packages/ui/src/components/reui/sortable.tsx
  - packages/validators/package.json
  - packages/validators/src/index.ts
  - packages/validators/src/index.test.ts
  - pnpm-lock.yaml
