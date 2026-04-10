---
status: resolved
trigger: "Import statements in apps/api/src/ use .js file extensions and semicolons — inconsistent with project style"
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED — Two separate style issues in different packages
test: N/A — root cause confirmed through evidence gathering
expecting: N/A
next_action: Await human verification that style looks correct

## Symptoms

expected: Import statements in apps/api/src/ have no file extensions. Semicolons match existing codebase convention.
actual: apps/api/src/index.ts uses .js extensions in relative imports. packages/db/src/schema/auth.ts, classification.ts, enums.ts use double quotes.
errors: none — style issue, not a runtime error
reproduction: Open any file in apps/api/src/ and look at the import statements
started: Introduced during Phase 3.1 schema files (packages/db/src/schema/)

## Eliminated

- hypothesis: New Phase 3.1 schema files (accounts.ts, import-batches.ts, transactions.ts) have wrong .js extensions
  evidence: packages/db/src/ consistently uses .js extensions everywhere (client.ts, seeds/, schema/). This is the established convention for that package. Phase 3.1 files correctly follow this.
  timestamp: 2026-04-09T00:01:00Z

- hypothesis: validators/src/index.ts has style issues
  evidence: Uses single quotes and semicolons correctly. No relative imports, so .js extension question is moot.
  timestamp: 2026-04-09T00:01:00Z

- hypothesis: apps/api/src/routes/*.ts have .js extension issues
  evidence: Route files (accounts.ts, tenantGuard.ts, etc.) have no relative imports at all — only package imports. No issue there.
  timestamp: 2026-04-09T00:01:00Z

## Evidence

- timestamp: 2026-04-09T00:01:00Z
  checked: .prettierrc at project root
  found: singleQuote: true, semi: true — these are the authoritative style rules
  implication: All TS files should use single quotes and semicolons

- timestamp: 2026-04-09T00:01:00Z
  checked: apps/api/tsconfig.json
  found: moduleResolution: "bundler", allowImportingTsExtensions: true
  implication: .js extensions in relative imports are unnecessary (bundler mode resolves them); consistent with apps/web cleanup commit 9f3a48f

- timestamp: 2026-04-09T00:01:00Z
  checked: apps/api/src/index.ts
  found: Uses .js extensions in all 8 relative imports (tenantGuard.js, health.js, etc.); single quotes; semicolons
  implication: .js extensions are the only deviation — semicolons are correct. Need to strip .js from these 8 imports.

- timestamp: 2026-04-09T00:01:00Z
  checked: packages/db/src/schema/auth.ts, classification.ts, enums.ts
  found: All three use double quotes for all import strings
  implication: Inconsistent with Prettier singleQuote: true. Phase 3.1 new files correctly use single quotes.

- timestamp: 2026-04-09T00:01:00Z
  checked: packages/db/src/schema/accounts.ts, import-batches.ts, transactions.ts, index.ts
  found: Single quotes, .js extensions for relative imports — matches rest of packages/db/src/ convention
  implication: These Phase 3.1 files are correctly styled for their package. No changes needed.

## Resolution

root_cause: Two separate issues — (1) apps/api/src/index.ts has .js extensions in relative imports (unnecessary with bundler moduleResolution); (2) pre-existing packages/db/src/schema/auth.ts, classification.ts, and enums.ts use double quotes (inconsistent with Prettier singleQuote: true).
fix: (1) Strip .js from 8 relative imports in apps/api/src/index.ts; (2) Convert double quotes to single quotes in auth.ts, classification.ts, enums.ts.
verification: pnpm --filter @ploutizo/db typecheck passed (0 errors). pnpm --filter api typecheck passed (0 errors). pnpm --filter @ploutizo/validators test passed (53/53).
files_changed:
  - apps/api/src/index.ts
  - packages/db/src/schema/auth.ts
  - packages/db/src/schema/classification.ts
  - packages/db/src/schema/enums.ts
