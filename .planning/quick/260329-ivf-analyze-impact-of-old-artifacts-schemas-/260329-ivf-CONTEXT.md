# Quick Task 260329-ivf: Analyze Impact of old-artifacts Schemas on Phase 1 Plans - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Task Boundary

Update Phase 1 plans (01-02 and 01-05) to reference `old-artifacts/` schema files as source of truth, rather than having the executor derive those schemas from scratch. The schemas in `old-artifacts/` are the authoritative, production-ready Drizzle schema definitions for all app entities.

**Plans affected:**
- `01-02-PLAN.md` — DB client & migrations (creates `packages/db/src/schema/enums.ts`)
- `01-05-PLAN.md` — Seed scripts (creates `packages/db/src/schema/auth.ts` and `packages/db/src/schema/classification.ts`)

</domain>

<decisions>
## Implementation Decisions

### Schema file scope for Phase 1
- Phase 1 brings across exactly 3 schema files: `enums.ts`, `auth.ts`, `classification.ts`
- `accounts.ts`, `transactions.ts`, `budgets.ts`, `imports.ts`, `recurring.ts`, `investments.ts`, `notifications.ts`, `relations.ts` are deferred to the phases that implement those features
- The `old-artifacts/index.ts` is NOT copied — Phase 1's `packages/db/src/schema/index.ts` exports only the 3 Phase 1 files

### enums.ts scope
- Copy `old-artifacts/enums.ts` **verbatim and in full** — all 11 enums — into `packages/db/src/schema/enums.ts`
- Rationale: enums create no DB tables (no migration cost), and later schemas will need them when implemented
- Plan 02, Task 2 action must be updated to reference `old-artifacts/enums.ts` as the file to copy

### auth.ts and classification.ts
- Copy `old-artifacts/auth.ts` → `packages/db/src/schema/auth.ts` verbatim
- Copy `old-artifacts/classification.ts` → `packages/db/src/schema/classification.ts` verbatim
- Plan 05, Task 1 action must be updated to reference old-artifacts files as source of truth instead of deriving from scratch

### How plans should reference old-artifacts
- Plan actions should explicitly state: "Copy `old-artifacts/{file}.ts` verbatim to `packages/db/src/schema/{file}.ts`"
- Acceptance criteria should include grep checks that verify the copied file contains key export names
- read_first blocks should include the old-artifacts source files so the executor reads them before copying

### Claude's Discretion
- Whether to note in a comment at top of each copied file that it originated from old-artifacts (likely not needed)
- Exact wording of seed function content in Plan 05 (no change — seed logic is not in old-artifacts)

</decisions>

<specifics>
## Specific Ideas

**old-artifacts file map (Phase 1 relevant):**
- `old-artifacts/enums.ts` → `packages/db/src/schema/enums.ts` (full copy — 11 enums)
- `old-artifacts/auth.ts` → `packages/db/src/schema/auth.ts` (full copy — users, orgs, orgMembers, invitations)
- `old-artifacts/classification.ts` → `packages/db/src/schema/classification.ts` (full copy — categories, tags, merchantRules, merchantRuleTags)

**Schema index for Phase 1 (`packages/db/src/schema/index.ts`):**
```ts
export * from "./enums"
export * from "./auth"
export * from "./classification"
```
(NOT the full old-artifacts/index.ts — deferred schema files are excluded)

**Key correctness checks:**
- `auth.ts` exports: `users`, `orgs`, `orgMembers`, `invitations`
- `classification.ts` exports: `categories`, `tags`, `merchantRules`, `merchantRuleTags`
- `enums.ts` exports: `memberRoleEnum`, `transactionTypeEnum`, `incomeTypeEnum`, `accountTypeEnum`, `recurringFrequencyEnum`, `recurringStatusEnum`, `merchantMatchTypeEnum`, `budgetPeriodTypeEnum`, `investmentTypeEnum`, `notificationTypeEnum`, `invitationStatusEnum`

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before updating plans.**

### Schema sources (authoritative)
- `old-artifacts/enums.ts` — full enums for all domains; copy verbatim to packages/db/src/schema/enums.ts
- `old-artifacts/auth.ts` — users, orgs, orgMembers, invitations; copy verbatim to packages/db/src/schema/auth.ts
- `old-artifacts/classification.ts` — categories, tags, merchantRules, merchantRuleTags; copy verbatim to packages/db/src/schema/classification.ts

### Plans to update
- `.planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md` — update Task 2 enums creation
- `.planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md` — update Task 1 schema creation

</canonical_refs>
