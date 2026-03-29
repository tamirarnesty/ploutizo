---
phase: quick-260329-ivf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md
  - .planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md
autonomous: true
requirements:
  - "Update 01-02 Task 1 to copy old-artifacts/enums.ts verbatim instead of creating stubs"
  - "Update 01-05 Task 1 to copy old-artifacts/auth.ts and old-artifacts/classification.ts verbatim instead of deriving from scratch"

must_haves:
  truths:
    - "01-02 Task 1 action instructs executor to copy old-artifacts/enums.ts verbatim"
    - "01-02 Task 1 read_first block includes old-artifacts/enums.ts"
    - "01-02 Task 1 acceptance_criteria verifies all 11 enum exports"
    - "01-05 Task 1 action instructs executor to copy old-artifacts/auth.ts and old-artifacts/classification.ts verbatim"
    - "01-05 Task 1 read_first block includes both old-artifacts source files"
    - "01-05 Task 1 acceptance_criteria verifies key exports from both files"
  artifacts:
    - path: ".planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md"
      provides: "Updated plan with enums verbatim copy instruction"
      contains: "old-artifacts/enums.ts"
    - path: ".planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md"
      provides: "Updated plan with auth + classification verbatim copy instruction"
      contains: "old-artifacts/auth.ts"
  key_links:
    - from: "01-02-PLAN.md Task 1 action"
      to: "old-artifacts/enums.ts"
      via: "verbatim copy instruction"
      pattern: "old-artifacts/enums"
    - from: "01-05-PLAN.md Task 1 action"
      to: "old-artifacts/auth.ts and old-artifacts/classification.ts"
      via: "verbatim copy instruction"
      pattern: "old-artifacts/auth"
---

<objective>
Update two Phase 1 PLAN.md files so their schema-creation tasks reference `old-artifacts/` as the source of truth rather than deriving schema from scratch or from minimal stubs.

Purpose: The old-artifacts files contain production-ready, authoritative Drizzle schema definitions. Executors should copy them verbatim rather than re-derive them, preventing schema drift.
Output: Updated 01-02-PLAN.md (Task 1 enums) and 01-05-PLAN.md (Task 1 auth + classification).
</objective>

<execution_context>
@/Users/tarnesty/Developer/personal/ploutizo/.claude/get-shit-done/workflows/execute-plan.md
@/Users/tarnesty/Developer/personal/ploutizo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md
@.planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md
@old-artifacts/enums.ts
@old-artifacts/auth.ts
@old-artifacts/classification.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update 01-02-PLAN.md Task 1 — enums verbatim copy from old-artifacts</name>
  <files>.planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md</files>
  <action>
    Read the current 01-02-PLAN.md in full first.

    In **Task 1** ("Create @ploutizo/db package with postgres.js Drizzle client"), make these targeted edits:

    **1. Update `<read_first>` block** — add `old-artifacts/enums.ts` to the list:

    Replace:
    ```
    <read_first>
      - packages/ui/package.json (reference for package.json structure)
      - .planning/phases/01-foundation-auth-infrastructure/01-01-SUMMARY.md
    </read_first>
    ```

    With:
    ```
    <read_first>
      - packages/ui/package.json (reference for package.json structure)
      - .planning/phases/01-foundation-auth-infrastructure/01-01-SUMMARY.md
      - old-artifacts/enums.ts (source of truth — copy verbatim)
    </read_first>
    ```

    **2. Replace the inline enums stub in `<action>`** — find the section that begins with:

    ```
    **packages/db/src/schema/enums.ts** — create minimal stubs (full schema in Phase 2+):
    ```

    Replace that entire `enums.ts` block (from `**packages/db/src/schema/enums.ts**` through the closing triple-backtick) with:

    ```
    **packages/db/src/schema/enums.ts** — copy `old-artifacts/enums.ts` verbatim.
    Do NOT write this file from memory. Read `old-artifacts/enums.ts` first, then write its exact contents to `packages/db/src/schema/enums.ts`.
    The file defines all 11 shared enums: `memberRoleEnum`, `transactionTypeEnum`, `incomeTypeEnum`, `accountTypeEnum`, `recurringFrequencyEnum`, `recurringStatusEnum`, `merchantMatchTypeEnum`, `budgetPeriodTypeEnum`, `investmentTypeEnum`, `notificationTypeEnum`, `invitationStatusEnum`.
    All 11 are copied now (even those used by later phases) because enums create no DB tables and later schema files will need them when implemented.
    ```

    **3. Update `<acceptance_criteria>`** — replace the enums line:

    Find:
    ```
    - `packages/db/src/schema/enums.ts` contains `pgEnum`
    ```

    Replace with:
    ```
    - `packages/db/src/schema/enums.ts` contains all 11 enums: `memberRoleEnum`, `transactionTypeEnum`, `incomeTypeEnum`, `accountTypeEnum`, `recurringFrequencyEnum`, `recurringStatusEnum`, `merchantMatchTypeEnum`, `budgetPeriodTypeEnum`, `investmentTypeEnum`, `notificationTypeEnum`, `invitationStatusEnum`
    - `packages/db/src/schema/enums.ts` content matches `old-artifacts/enums.ts` (verbatim copy — no stub values)
    ```

    Do NOT modify Task 2, the frontmatter, objective, verification, success_criteria, or output sections.
  </action>
  <verify>
    <automated>grep -n "old-artifacts/enums.ts" /Users/tarnesty/Developer/personal/ploutizo/.planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md</automated>
  </verify>
  <done>
    - `old-artifacts/enums.ts` appears in Task 1 read_first
    - Task 1 action instructs verbatim copy, not from-scratch stub creation
    - Acceptance criteria verifies all 11 enum names
  </done>
</task>

<task type="auto">
  <name>Task 2: Update 01-05-PLAN.md Task 1 — auth + classification verbatim copy from old-artifacts</name>
  <files>.planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md</files>
  <action>
    Read the current 01-05-PLAN.md in full first.

    In **Task 1** ("Create schema stubs for categories and merchant rules"), make these targeted edits:

    **1. Update `<read_first>` block** — add both old-artifacts source files:

    Replace:
    ```
    <read_first>
      - packages/db/src/schema/enums.ts
      - packages/db/src/schema/index.ts
      - packages/db/src/client.ts
    </read_first>
    ```

    With:
    ```
    <read_first>
      - packages/db/src/schema/enums.ts
      - packages/db/src/schema/index.ts
      - packages/db/src/client.ts
      - old-artifacts/auth.ts (source of truth — copy verbatim)
      - old-artifacts/classification.ts (source of truth — copy verbatim)
    </read_first>
    ```

    **2. Replace the entire `<action>` body** with the following:

    ```
    The seeds in Task 2 insert into `categories` and `merchant_rules` tables. These must exist in the schema before seeds can be implemented. Use the old-artifacts files as the source of truth — do NOT derive schema from scratch.

    **packages/db/src/schema/auth.ts** — copy `old-artifacts/auth.ts` verbatim.
    Do NOT write this file from memory. Read `old-artifacts/auth.ts` first, then write its exact contents to `packages/db/src/schema/auth.ts`.
    The file defines: `users`, `orgs`, `orgMembers`, `invitations`.
    Key invariants already encoded in the file:
    - `externalId` (not `clerkId`) on users — auth-provider-agnostic
    - `orgId` is non-nullable on orgMembers and invitations
    - Indexes defined inline via the table's second argument
    Import path for enums: change `"./enums"` to `"./enums.js"` (ESM `.js` extension required in this workspace).

    **packages/db/src/schema/classification.ts** — copy `old-artifacts/classification.ts` verbatim.
    Do NOT write this file from memory. Read `old-artifacts/classification.ts` first, then write its exact contents to `packages/db/src/schema/classification.ts`.
    The file defines: `categories`, `tags`, `merchantRules`, `merchantRuleTags`.
    Key invariants already encoded in the file:
    - `orgId` is non-nullable on categories, tags, and merchantRules
    - `merchantRules` uses `merchantMatchTypeEnum` (a pgEnum from enums.ts) for the `matchType` column — NOT a plain text column
    - `merchantRules` uses `pattern` (not `matchValue`) and `renameTo` (not `renameDescription`)
    Import paths for enums and auth: change `"./enums"` to `"./enums.js"` and `"./auth"` to `"./auth.js"` (ESM `.js` extensions required).

    **packages/db/src/schema/index.ts** — update to export the three Phase 1 schema files:
    ```typescript
    // Schema barrel — Phase 1 exports only. Additional tables added per phase.
    export * from './enums.js'
    export * from './auth.js'
    export * from './classification.js'
    ```
    NOTE: Do NOT use the full old-artifacts/index.ts — it exports tables deferred to later phases.

    Run typecheck: `pnpm typecheck --filter @ploutizo/db`
    ```

    **3. Update `<acceptance_criteria>`** — replace the entire block with:

    ```
    - `packages/db/src/schema/auth.ts` exports `users`, `orgs`, `orgMembers`, `invitations`
    - `packages/db/src/schema/auth.ts` contains `externalId` (not `clerkId`)
    - `packages/db/src/schema/auth.ts` content matches `old-artifacts/auth.ts` (verbatim copy)
    - `packages/db/src/schema/classification.ts` exports `categories`, `tags`, `merchantRules`, `merchantRuleTags`
    - `packages/db/src/schema/classification.ts` `orgId` columns are `.notNull()` on categories, tags, and merchantRules
    - `packages/db/src/schema/classification.ts` uses `merchantMatchTypeEnum` for `matchType` (pgEnum, not plain text)
    - `packages/db/src/schema/classification.ts` content matches `old-artifacts/classification.ts` (verbatim copy)
    - `packages/db/src/schema/index.ts` exports from `enums.js`, `auth.js`, and `classification.js`
    - `packages/db/src/schema/index.ts` does NOT export tables deferred to later phases (accounts, transactions, etc.)
    - `pnpm typecheck --filter @ploutizo/db` exits 0
    ```

    **4. Update `<done>`** — replace with:

    ```
    Schema files copied verbatim from old-artifacts; auth.ts exports users/orgs/orgMembers/invitations; classification.ts exports categories/tags/merchantRules/merchantRuleTags with non-nullable orgId; index.ts exports all three Phase 1 files; typecheck passes
    ```

    Do NOT modify Task 2, the frontmatter, objective, interfaces block, verification, success_criteria, or output sections.

    IMPORTANT: The seed functions in Task 2 reference fields (`name`, `matchValue`, `renameDescription`, `isActive`) that differ from the real `merchantRules` schema (`pattern`, `renameTo` — no `isActive` or `name` columns). This is a pre-existing inconsistency in Task 2 that is NOT in scope for this quick task — do not fix Task 2's seed logic or field references.
  </action>
  <verify>
    <automated>grep -n "old-artifacts/auth.ts\|old-artifacts/classification.ts" /Users/tarnesty/Developer/personal/ploutizo/.planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md</automated>
  </verify>
  <done>
    - Both `old-artifacts/auth.ts` and `old-artifacts/classification.ts` appear in Task 1 read_first
    - Task 1 action instructs verbatim copy for both files with ESM import path fix noted
    - Acceptance criteria verifies exports: users/orgs/orgMembers/invitations from auth.ts; categories/tags/merchantRules/merchantRuleTags from classification.ts
    - `merchantMatchTypeEnum` usage noted in acceptance_criteria (not plain text)
  </done>
</task>

</tasks>

<verification>
After both tasks:
1. `grep "old-artifacts/enums.ts" .planning/phases/01-foundation-auth-infrastructure/01-02-PLAN.md` — must match (in read_first and action)
2. `grep "old-artifacts/auth.ts" .planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md` — must match
3. `grep "old-artifacts/classification.ts" .planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md` — must match
4. `grep "merchantMatchTypeEnum" .planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md` — must match (real enum, not plain text)
5. `grep "merchantRuleTags" .planning/phases/01-foundation-auth-infrastructure/01-05-PLAN.md` — must match (4th export from classification.ts)
</verification>

<success_criteria>
- 01-02-PLAN.md Task 1 directs executor to copy old-artifacts/enums.ts verbatim (all 11 enums)
- 01-05-PLAN.md Task 1 directs executor to copy old-artifacts/auth.ts and old-artifacts/classification.ts verbatim
- Both plans include old-artifacts source files in read_first blocks
- Acceptance criteria in both plans verify key export names from the real schema files
- ESM import path fix (.js extension) noted for copied files
- No other sections of either plan are modified
</success_criteria>

<output>
After completion, create `.planning/quick/260329-ivf-analyze-impact-of-old-artifacts-schemas-/260329-ivf-SUMMARY.md`
</output>
