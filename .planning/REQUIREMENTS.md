# ploutizo — Planning Requirements

> Synthesized from `REQUIREMENTS.md` (source of truth), `ploutizo-project-overview.md`, research findings, and product decisions made during initialization.
> Source of truth for feature requirements: `REQUIREMENTS.md` in repo root.
> This file adds: implementation notes, research-derived constraints, and verification criteria for planning use.

---

## Product Decisions (locked during initialization)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Budget rollover accumulation cap | Cap at 1× base limit | Prevents confusingly large effective limits after extended underspending |
| TFSA withdrawal room restoration | Disclaimer only in v1 | "Withdrawals restore room the following January" — no manual adjustment field |
| Negative settlement balance display | Show as green credit — "John is owed $X" | Consistent, no threshold suppression |

---

## Infrastructure Requirements (research-derived — not in REQUIREMENTS.md)

### Clerk Native Orgs (CRITICAL — must be in Phase 1)
- All users access the app at `ploutizo.app` — no subdomain routing; satellite domains are a paid add-on and are not used
- Active org is carried in the Clerk JWT and accessed via `getAuth(c).orgId`; org name and metadata fetched via `useOrganization()` on the frontend
- Org switching handled by `<OrganizationSwitcher />` calling `setActive({ organization })` — no domain navigation
- `authorizedParties: ['https://ploutizo.app']` set in `clerkMiddleware()` for cross-origin defense
- Invitations managed entirely by Clerk via `<OrganizationProfile />` — no local invitation table
- Clerk dev-to-prod is a hard cutover — user data cannot be migrated between instances; use production instance from the start or accept data loss on switch
- Cloudflare needs only `ploutizo.app` and `api.ploutizo.app` — no wildcard record

### Database Driver
- Use `postgres.js` with direct Neon connection URL — NOT `neon-http` (no transaction support) and NOT PgBouncer pooler (breaks prepared statements)
- The persistent Node.js Hono server on Railway is not serverless — `postgres.js` is correct; `neon-serverless` WebSocket driver is unnecessary
- Run `db:migrate` as Railway pre-deploy command (not `db:push` in production)

### Tailwind v4 (audit before building any components)
- `border` defaults to `currentColor` (was `gray-200`) — always specify explicit border colors in shadcn components
- `ring` is now 1px (was 3px blue) — specify ring colors explicitly
- Shadow/blur/rounded scale names changed — audit during UI package setup phase
- `!important` modifier is now postfix (`flex!` not `!flex`)

### Clerk `orgId` guard
- `getAuth(c).orgId` is `undefined` (structurally absent), not `null`, when no active org is set
- `tenantGuard()` must check `!orgId` (falsy), not `orgId === null`

---

## Feature Requirements with Implementation Notes

### 1. Households & Users

**Requirements:** See `REQUIREMENTS.md §1` for full spec.

**Implementation notes:**
- Clerk JWT v2 uses compact claim names (`o.id` not `org_id`) — abstracted by `getAuth(c)` middleware, do not read raw JWT claims
- Org creation webhook must call `seedOrg(orgId)` which invokes both `seedOrgCategories(orgId)` and `seedOrgMerchantRules(orgId)`, and inserts a row into the local `orgs` table (app-specific settings anchor)
- Org name and metadata displayed via `useOrganization()` (`organization.name`, `organization.id`, `organization.imageUrl`) — no ploutizo API call needed for org display info
- Member `birth_year` is private to that member — never include in org-scoped queries visible to other members

**Verification:**
- [ ] User can create household, invite member via Clerk's invitation flow, member can accept and see shared data
- [ ] Org creation triggers seed scripts; default categories and merchant rules are present
- [ ] Switching households via `<OrganizationSwitcher />` updates `orgId` in the Clerk session; subsequent queries are scoped to new org

---

### 2. Accounts

**Requirements:** See `REQUIREMENTS.md §2`.

**Implementation notes:**
- "Each person pays their own" flag excludes account from settlement calculations — query-time filter on settlement balance computation
- Account ownership is many-to-many via `account_members` join table

**Verification:**
- [ ] Account CRUD with all types
- [ ] Shared account with "each person pays their own" excluded from settlement balance queries
- [ ] Personal account (single owner) included in settlement calculations

---

### 3. Categories & Tags

**Requirements:** See `REQUIREMENTS.md §3`.

**Implementation notes:**
- Categories seeded at org creation via `seedOrgCategories(orgId)` — never store as nullable `org_id` rows
- Icon field accepts Lucide icon name string or emoji character — no validation against Lucide icon list (client renders what it gets)
- Archive-only deletion (no hard delete if referenced by transactions or budgets)

**Verification:**
- [ ] Default category list present after org creation
- [ ] Category with referenced transactions cannot be hard-deleted
- [ ] Tags: select-or-create-inline flow, archived tags preserved on existing transactions

---

### 4. Transactions

**Requirements:** See `REQUIREMENTS.md §4` for full field table and schema.

**Implementation notes (research-refined):**
- `amount` column: `integer` (unsigned cents). Max safe value ~$21M per transaction — sufficient.
- SUM aggregates across many transactions (net worth, settlement balance, budget spend) MUST cast to bigint: `sql\`SUM(${transactions.amount})::bigint\``
- `transaction_assignees.percentage` is a display cache only — balance computations use `amount` exclusively
- Split remainder (Largest Remainder Method): `floor(total / n)` per assignee, then distribute remaining cents to first N assignees by deterministic order (member ID ascending)
- `deleted_at` timestamp (not `is_deleted` boolean) — all active-data queries use partial index `WHERE deleted_at IS NULL`
- Import review deletions are never written to DB — only `deleted_at`-based soft delete for post-creation deletions
- Clerk JWT v2: `orgId` from `getAuth(c)` — never from request body or params
- Every Drizzle query on tenant-scoped tables includes `.where(eq(table.orgId, orgId))`

**Verification:**
- [ ] All 6 transaction types create with correct required fields (Zod validates, API returns 400 on violation)
- [ ] Splits sum correctly to transaction total including odd-cent remainder (Largest Remainder Method)
- [ ] Soft delete: deleted transactions excluded from all views and calculations
- [ ] Hard delete during import review: rows removed from session, never written to DB
- [ ] Transfer transactions excluded from budget and income calculations
- [ ] Refund reduces net category spend, does not appear in income view

---

### 5. Settlement

**Requirements:** See `REQUIREMENTS.md §5`.

**Implementation notes (research-refined):**
- Balance computed at query time (not materialized) — acceptable for v1 with proper indexes
- Required indexes: `(org_id, account_id)` on `transactions`, `(org_id, account_id)` on `transaction_assignees`
- Negative balance (member is overpaid / owed money): display as green credit "Name is owed $X" — no threshold suppression
- Cross-member net settlement line is display-only — settlements still recorded individually per account
- Settlement `settled_account_id` recorded for CSV deduplication across paired exports

**Verification:**
- [ ] Running balance updates immediately after new transaction or settlement
- [ ] "Each person pays their own" accounts excluded from settlement cards
- [ ] Net settlement line appears when two members have opposing balances; hidden when debt flows one direction
- [ ] Negative balance displayed as green credit
- [ ] Partial settlement: amount defaults to outstanding balance, user can override

---

### 6. Budgets

**Requirements:** See `REQUIREMENTS.md §6`.

**Implementation notes (research-refined):**
- Budget spend = SUM of expense transactions in category within period; cast to bigint
- Rollover cap: accumulated surplus cannot exceed 1× base limit. `effective_limit = base_limit + min(prior_surplus, base_limit)`
- Store `effective_limit_cents` alongside `base_limit_cents` per budget period — avoid recomputing rollover chain on every load
- Status thresholds: On Track < 80%, Caution 80–99%, Over ≥ 100% — derived at query time, not stored
- Mid-period budget creation: spend counted from period start regardless of when budget was created

**Verification:**
- [ ] Budget spend correctly sums expenses in category within period
- [ ] Rollover: surplus carries forward to next period capped at 1× base limit
- [ ] Overspend does not roll over
- [ ] Status thresholds produce correct colours
- [ ] Historical budget performance viewable by period

---

### 7. Savings & Investments

**Requirements:** See `REQUIREMENTS.md §7`.

**Implementation notes (research-refined):**
- TFSA room formula: `sum(TFSA_ANNUAL_LIMITS[year] for year in range(max(turn18Year, 2009), currentYear+1)) - tracked_contributions`
- TFSA_ANNUAL_LIMITS constant: define in `packages/types` as a readonly record. 2009–2025 limits known; **2026 limit NEEDS_VERIFICATION against CRA** before hardcoding.
- TFSA withdrawals: v1 shows disclaimer only ("Withdrawals restore room the following January") — no manual adjustment field
- FHSA room: $8,000/year from account open year; carry-forward = unused from prior year only, capped at $8,000 (does not compound). Lifetime cap $40,000. Formula: `min(8000 + carryforward_from_prior_year, 40000 - lifetime_contributed)`
- RRSP: manual user-set room only in v1; app tracks contributions against it
- `investment_account.open_year` required for FHSA room calculation
- Member `birth_year` required for TFSA; prompt user to set it when viewing TFSA account

**Needs verification before implementing:**
- [ ] TFSA 2026 annual limit (CRA announces ~October/November prior year)
- [ ] RRSP 2026 dollar cap (2025 cap was $32,490 — 2026 cap TBD)

**Verification:**
- [ ] TFSA room calculated correctly for member born in 1991 (max room case)
- [ ] TFSA room calculated correctly for member born in 2000 (turned 18 in 2018)
- [ ] FHSA carry-forward does not compound — capped at $8,000 from prior year only
- [ ] Over-contribution warning triggers immediately on contribution entry
- [ ] TFSA disclaimer shown; no manual withdrawal adjustment field

---

### 8. CSV Import

**Requirements:** See `REQUIREMENTS.md §8`.

**Implementation notes (research-derived — HIGH ATTENTION REQUIRED):**
- **Bank CSV formats are LOW confidence** — column names derived from training data. Real export files must be collected and used as test fixtures before writing normalizers.
- **Amex CA sign is INVERTED**: positive value = expense, negative value = refund. Every other bank: negative = expense. This must be documented in the Amex normalizer code.
- **Date formats differ by bank**:
  - CIBC, EQ Bank: `YYYY-MM-DD` (ISO)
  - All other Canadian banks: `MM/DD/YYYY`
  - Normalizers must use bank-specific date parsers, not a shared date parser
- Duplicate detection algorithm: `external_id` exact match (primary); then `date + amount` exact match + Levenshtein distance < 0.2 on pre-normalized description (pre-filter by date+amount before Levenshtein for performance)
- Normalizer functions are pure functions — each bank gets its own normalizer; fixture-based unit tests per bank
- Account resolution: unmatched account → dropdown; "Create new account" inline; propagates to all unresolved rows in session without page refresh

**Verification:**
- [ ] Amex CA: positive amount correctly parsed as expense (inverted sign)
- [ ] CIBC/EQ Bank: ISO date parsed correctly; all others MM/DD/YYYY
- [ ] Duplicate detection: exact `external_id` match flagged; fuzzy date+amount+description match flagged
- [ ] Duplicate rows unchecked by default; "Skip all duplicates" toggle works
- [ ] Account resolution: unmatched account → dropdown; inline create; propagates to other unresolved rows
- [ ] Rows deleted during review are never written to DB
- [ ] Import batch saved with source, date, row count, account reference

---

### 9. Merchant Rules

**Requirements:** See `REQUIREMENTS.md §9`.

**Implementation notes:**
- Seeded at org creation via `seedOrgMerchantRules(orgId)` — no nullable `org_id` rows
- Priority ordering: first match wins; stored as integer sort order; user can reorder
- Regex match type: validate regex at save time; catch invalid patterns before storing

**Verification:**
- [ ] Default rules present after org creation
- [ ] Rules applied in priority order; first match wins
- [ ] User can add, edit, delete, and reorder rules
- [ ] Merchant rule applied on import preview; user can override per row

---

### 10. Net Worth

**Requirements:** See `REQUIREMENTS.md §10`.

**Implementation notes:**
- All balance SUM queries must cast to bigint
- Investment balance = contribution totals only (no market value in v1)
- Monthly snapshot: computed and stored at month-end (or lazily on first view of historical period)

**Verification:**
- [ ] Net worth = assets (chequing + savings + cash + investments) - liabilities (credit cards)
- [ ] Per-member and household breakdowns correct
- [ ] Investment values reflect contributions only — label makes this clear in UI

---

### 11. Notifications

**Requirements:** See `REQUIREMENTS.md §11`.

**Implementation notes:**
- Fetch-based on page load — no websockets
- Settlement reminder: member threshold > household threshold > $50 default
- Over-contribution warning: triggered immediately on contribution entry (same request/mutation response)

**Verification:**
- [ ] Budget caution (80%) and over-budget notifications appear in feed
- [ ] TFSA/FHSA over-contribution warning triggers on entry
- [ ] Settlement reminder appears when balance exceeds threshold
- [ ] Threshold precedence: member > household > global

---

## Out of Scope (v1)

| Item | Status |
|------|--------|
| Recurring transactions — generation logic | Schema reserved; fetch-based generation deferred to v2 |
| AI auto-fill on import | v2 |
| Manual CSV column mapping | v2 |
| Per-member budgets | v2 |
| Multi-currency | v2 — CAD only |
| Live investment balance | v2 — contributions only |
| Receipt scanning | Explicitly excluded |
| Mobile app | Web only |
| Public API | Not in scope |
| Per-member visibility restrictions | All members see everything |
| Net worth market value | Contributions only |
| TFSA withdrawal manual adjustment | Disclaimer only in v1 |

---

## Open Items (needs external validation)

- [ ] **TFSA 2026 annual limit** — CRA announces ~Oct/Nov 2025. Hardcode once confirmed. The `TFSA_ANNUAL_LIMITS` constant lives in `packages/types`.
- [ ] **RRSP 2026 dollar cap** — confirm against CRA before shipping §7
- [ ] **Bank CSV column names** — LOW confidence on exact column names for TD, RBC credit card exports. Collect real export files per bank before writing normalizers.
- [ ] **Neon connection limits** — verify current plan tier limits before launching to avoid connection exhaustion on Railway

---
*Last updated: 2026-03-24 — initialized from REQUIREMENTS.md + research synthesis*
