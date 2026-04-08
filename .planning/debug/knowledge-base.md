# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## clerk-signin-no-signup-option — Clerk SignIn component suppresses sign-up link when CLERK_SIGN_UP_URL equals sign-in URL
- **Date:** 2026-03-31
- **Error patterns:** clerk, SignIn, sign-up, sign-up link missing, CLERK_SIGN_UP_URL, circular, no signup, sign-in route
- **Root cause:** Two compounding issues — (1) CLERK_SIGN_UP_URL was set to /sign-in (same as the sign-in URL), causing Clerk to suppress the "Sign up" link in the <SignIn /> component to avoid a circular UI. (2) No sign-up.$.tsx route existed, so even if the env var were corrected, the sign-up URL would 404.
- **Fix:** (1) Created apps/web/src/routes/sign-up.$.tsx with a <SignUp /> component. (2) Changed CLERK_SIGN_UP_URL from /sign-in to /sign-up in apps/web/.env.example. (3) Updated __root.tsx auth guard isAuthRoute check to also allow /sign-up/* through without triggering the redirect.
- **Files changed:** apps/web/src/routes/sign-up.$.tsx, apps/web/.env.example, apps/web/src/routes/__root.tsx

---

## tanstack-form-zod-v4-validator-types — Passing Zod v4 schema directly to form-level validators causes `setErrorMap` type errors
- **Date:** 2026-04-03
- **Error patterns:** `as any`, `setErrorMap`, `zodValidator`, `validators onSubmit`, `StandardSchemaV1Issue`, `Record<string, StandardSchemaV1Issue[]>`, TanStack Form, zod schema validator
- **Root cause:** When a Zod schema is passed directly as a form-level validator (`validators: { onSubmit: Schema }`), TanStack Form's `UnwrapFormValidateOrFn` resolves its error type to `Record<string, StandardSchemaV1Issue[]>`. This makes `form.setErrorMap({ onSubmit: "string" })` a TS type error because a plain string isn't assignable to that type. The agent had silenced this with `as any`.
- **Fix:** Replace `validators: { onSubmit: Schema as any }` with a custom validator function that calls `Schema.safeParse()` and returns a `string` — this gives `UnwrapFormValidateOrFn` a `string | undefined` error type, making `setErrorMap({ onSubmit: "string" })` valid. Also applies to field-level validators where the schema input type doesn't exactly match the field's TypeScript type (e.g. `ZodOptional<ZodString>` on a `string` field).
- **Files changed:** AccountForm.tsx, CategoryForm.tsx, RuleForm.tsx, HouseholdSettingsForm.tsx
---

## tailwind-font-classes-incorrect — Arbitrary CSS variable syntax used instead of semantic Tailwind v4 font utility classes
- **Date:** 2026-04-03
- **Error patterns:** font-[--font-heading], font-heading, arbitrary value syntax, CSS custom property, Tailwind v4, --font-heading, font utility
- **Root cause:** During phase 02.1 refactor, font utility classes were written using arbitrary CSS variable syntax `font-[--font-heading]` instead of the semantic Tailwind v4 utility `font-heading`. In Tailwind v4, CSS custom properties defined in `:root` (like `--font-heading`) auto-generate corresponding utility classes (like `font-heading`), so the arbitrary syntax is both unnecessary and incorrect.
- **Fix:** Replace all occurrences of `font-[--font-heading]` with `font-heading` across affected source files.
- **Files changed:** apps/web/src/components/onboarding/Onboarding.tsx, apps/web/src/components/dashboard/Dashboard.tsx, apps/web/src/components/settings/CategoriesSettings.tsx, apps/web/src/components/settings/HouseholdSettings.tsx, apps/web/src/components/accounts/Accounts.tsx
---

## db-connection-refused-local-api — ESM import hoisting causes dotenv to run after postgres.js client initializes, silently connecting to localhost:5432
- **Date:** 2026-04-03
- **Error patterns:** ECONNREFUSED, DrizzleQueryError, AggregateError, internalConnectMultiple, afterConnectMultiple, DATABASE_URL, postgres.js, localhost, 5432
- **Root cause:** In `apps/api/src/index.ts`, `dotenv.config()` was called as top-level code after static import declarations. In ESM, all static imports are hoisted and fully evaluated before any top-level code runs. The import chain `index.ts → routes → @ploutizo/db → client.ts` called `postgres(process.env.DATABASE_URL!)` before dotenv had populated `process.env`. `DATABASE_URL` was `undefined`; `postgres.js` `parseUrl(undefined)` returns an empty object, causing `parseOptions()` to fall back to `host='localhost'`, `port=5432`. Nothing listens on localhost:5432 → ECONNREFUSED.
- **Fix:** Remove the dotenv block from `apps/api/src/index.ts` entirely. Change the `dev` script in `apps/api/package.json` from `tsx watch src/index.ts` to `node --env-file=.env --import tsx --watch src/index.ts`. Node's `--env-file` loads the `.env` before any module evaluation, solving the hoisting problem. Remove `dotenv` from `dependencies`.
- **Files changed:** apps/api/src/index.ts, apps/api/package.json
---

## eslint-import-order-agent-violations — PostToolUse hook missing ESLint fix; agents leave import/order violations in generated files
- **Date:** 2026-04-03
- **Error patterns:** import/order, eslint, @ploutizo/validators, type import, should occur after, sort-imports, PostToolUse hook, lint:fix
- **Root cause:** The .claude/settings.local.json PostToolUse hook only ran Prettier (pnpm format) after Write/Edit calls. No ESLint --fix hook existed. The @tanstack/eslint-config enforces import/order as an error via eslint-plugin-import-x, but without a hook to trigger eslint --fix, violations accumulated silently. No lint:fix scripts existed in package.json files.
- **Fix:** (1) Added "lint:fix": "eslint --fix" to apps/web and packages/ui package.json. (2) Created .claude/hooks/gsd-lint-fix.js — reads file_path from stdin JSON, detects package root, runs eslint --fix from that directory for .ts/.tsx files, always exits 0. (3) Registered hook in settings.local.json PostToolUse block alongside Prettier hook. (4) Fixed all existing import/order violations across 8 source files.
- **Files changed:** apps/web/package.json, packages/ui/package.json, .claude/hooks/gsd-lint-fix.js, .claude/settings.local.json, AccountSheet.tsx, AccountForm.tsx, CategoryDialog.tsx, CategoryForm.tsx, RuleDialog.tsx, RuleForm.tsx, HouseholdSettingsForm.tsx, vite.config.ts
---

## lint-format-errors-and-missing-module — Missing ui/ shim files cause TypeScript module-not-found errors in reui vendor components
- **Date:** 2026-04-08
- **Error patterns:** module not found, @ploutizo/components/ui/popover, @ploutizo/components/ui/button, reui, data-grid, react-hooks/exhaustive-deps, no-unnecessary-condition, import/no-duplicates
- **Root cause:** packages/ui/src/components/ui/ was missing re-export shim files for button, input, popover, scroll-area, separator, skeleton, dropdown-menu, and select. The @ploutizo/components/ui/* tsconfig path alias resolves to src/components/ui/*, but only checkbox.ts and spinner.ts existed. Additionally, ESLint v10 errors on inline react-hooks/exhaustive-deps disable comments in reui vendor files because the plugin wasn't registered, and strict @typescript-eslint rules were applied to third-party vendor code.
- **Fix:** Created 8 missing shim files in packages/ui/src/components/ui/. Added a reui-specific ESLint overrides block in eslint.config.ts disabling strict rules for src/components/reui/**. Removed inline react-hooks/exhaustive-deps disable comments from 3 reui files. Fixed minor lint errors in field.tsx, AccountForm.tsx, and route.tsx.
- **Files changed:** packages/ui/src/components/ui/button.ts, packages/ui/src/components/ui/input.ts, packages/ui/src/components/ui/popover.ts, packages/ui/src/components/ui/scroll-area.ts, packages/ui/src/components/ui/separator.ts, packages/ui/src/components/ui/skeleton.ts, packages/ui/src/components/ui/dropdown-menu.ts, packages/ui/src/components/ui/select.ts, packages/ui/eslint.config.ts, packages/ui/src/components/reui/data-grid/data-grid.tsx, packages/ui/src/components/reui/data-grid/data-grid-table.tsx, packages/ui/src/components/reui/data-grid/data-grid-column-header.tsx, packages/ui/src/components/field.tsx, apps/web/src/components/accounts/AccountForm.tsx, apps/web/src/routes/_layout.settings/route.tsx
---

## create-account-fk-violation — accounts insert fails with FK violation because orgs row was never seeded by webhook
- **Date:** 2026-04-03
- **Error patterns:** DrizzleQueryError, foreign key constraint, accounts_org_id_orgs_id_fk, insert into accounts, org_id, orgs, FK violation, webhook, organization.created
- **Root cause:** The orgs row for the active Clerk org was never inserted into the local database. The only path that creates an orgs row is the organization.created Clerk webhook (webhooks.ts). If that webhook fails to deliver — misconfigured CLERK_WEBHOOK_SECRET, network failure, or org created before the app was deployed — no orgs row exists, and every subsequent insert into accounts (or any table with FK to orgs.id) throws the FK constraint violation.
- **Fix:** Added an upsert guard in tenantGuard.ts: before calling next(), runs db.insert(orgs).values({ id: orgId }).onConflictDoNothing() guarded by a process-lifetime seenOrgs Set to skip the DB round-trip after the first successful upsert per org. The webhook remains the authoritative creation path; this is an idempotent safety net.
- **Files changed:** apps/api/src/middleware/tenantGuard.ts, apps/api/src/__tests__/tenantGuard.test.ts
---

