# Architecture Research

**Project:** ploutizo — multi-tenant personal finance tracker
**Researched:** 2026-03-24
**Confidence:** HIGH (topics 1–4, 7 verified against official docs), MEDIUM (topics 5–6 from patterns + reasoning)

---

## 1. Multi-Tenant Security: Postgres RLS vs Application-Level WHERE Clauses

### Background

Drizzle ORM has had first-class Postgres RLS support since mid-2024. It exposes `pgTable.withRLS()`, `pgRole()`, and `pgPolicy()` APIs, with a `crudPolicy()` helper for Neon specifically. Neon supports Postgres RLS natively (it is standard Postgres 16). Clerk's JWT contains `org_id` as a first-class claim accessible at `authObject.orgId`.

### Option A: Postgres Row Level Security (RLS)

**How it would work for ploutizo:**
- Enable RLS on every tenant-scoped table
- Create a Neon DB role corresponding to the authenticated user role
- Pass Clerk's `orgId` into the database session via `SET LOCAL jwt.claims.org_id = $orgId` before each query
- Write `USING` policies that check `org_id = current_setting('jwt.claims.org_id')::text`
- Drizzle's Neon integration (`crudPolicy` from `drizzle-orm/neon`) simplifies this

**Benefits:**
- Defense in depth — a missing WHERE clause in application code cannot leak cross-tenant data
- Security enforced at the DB layer regardless of which application code path ran
- Auditable: policies are declarative and live in migrations

**Drawbacks for ploutizo:**
- Requires `SET LOCAL` before every query in every request handler — this adds complexity to the Hono middleware chain
- Neon's HTTP driver (recommended for serverless) does not support session-level variables natively; you need websocket connections or per-query workarounds to pass claims
- Drizzle's RLS migration support requires careful `entities.roles` configuration in `drizzle.config.ts` to avoid conflicts with Neon's predefined roles
- Testing becomes harder — test fixtures must set session variables or bypass RLS via the superuser role
- `orgId` in Clerk is `undefined` when a user has no active org — RLS must handle this gracefully or risk locking out all rows
- Additional complexity with no concrete payoff: ploutizo is API-only access, the entire `apps/api` is the single client, and `DATABASE_URL` is not exposed outside the API

### Option B: Application-Level WHERE Clauses (RECOMMENDED)

**How it works for ploutizo:**
- `orgId` extracted from verified Clerk JWT in `clerkMiddleware()` at the Hono layer
- `tenantGuard()` middleware rejects the request immediately if `orgId` is `null` or `undefined`
- Every Drizzle query includes `.where(eq(table.orgId, orgId))` — enforced by code review and convention
- Non-nullable `org_id` column on every table provides an additional guard

**Benefits:**
- Simpler architecture — no session variable plumbing, no DB role switching
- Works with both Neon HTTP and websocket connections
- Straightforward to test — just pass `orgId` to query helpers
- TypeScript types make it easy to enforce: create wrapper functions that require `orgId` as a parameter

**Mitigation for the one weakness (a developer forgetting the WHERE clause):**
- Non-nullable `org_id` on all columns (schema constraint)
- A thin `withTenant(db, orgId)` wrapper pattern that builds the base query with `org_id` pre-filtered:

```typescript
// apps/api/src/lib/db.ts
const withTenant = (orgId: string) => ({
  transactions: () => db.select().from(transactions).where(eq(transactions.orgId, orgId)),
  accounts: () => db.select().from(accounts).where(eq(accounts.orgId, orgId)),
  // ...
})
```

- Consistent lint rule: flag any raw `db.select().from(transactions)` without `.where` containing `orgId`

### Verdict

**Use application-level WHERE clauses for ploutizo v1.**

RLS is the right choice when: the DB is shared with untrusted clients (mobile apps hitting Supabase directly, public APIs), or when you have many independent service teams who might bypass app-level guards. Neither applies here. ploutizo has exactly one DB client (the Hono API), `DATABASE_URL` is private to `apps/api`, and the `tenantGuard()` middleware is a hard invariant. RLS would add complexity (session variable plumbing, Neon driver constraints, migration role management) with no real security benefit in this architecture.

**Sources:**
- Drizzle RLS docs: https://orm.drizzle.team/docs/rls (HIGH confidence)
- Clerk Auth object: https://clerk.com/docs/references/backend/types/auth-object (HIGH confidence)

---

## 2. Finance Transaction Data Modeling: Single Table vs Type-Specific Tables

### The Design Decision

ploutizo has already settled on a single flexible `transactions` table with nullable type-specific columns. This section validates that decision and documents its implications.

### Single Table Design (CHOSEN)

```
transactions
  id, org_id, type, date, amount,
  description, raw_description,
  account_id,            -- expense, refund, income, settlement, contribution
  category_id,           -- expense, refund
  from_account_id,       -- transfer only
  to_account_id,         -- transfer only
  settled_account_id,    -- settlement only
  refund_of_id,          -- refund (self-referential FK)
  income_type,           -- income only
  income_source,         -- income only
  ...shared fields...
```

**Arguments for single table:**
- Import flow maps to one table — no routing logic deciding which table to write to
- Dashboard queries summing totals across types become simple `WHERE type IN (...)` filters
- Budget spend: `WHERE type IN ('expense', 'refund') AND category_id = $cat` — works naturally
- Settlement balance: `WHERE type IN ('expense', 'refund', 'settlement')` — single query
- Drizzle type safety: a `type` enum column plus Zod discriminated unions enforce shape without DB-level partitioning
- No JOIN overhead for queries that need all transaction types (dashboard, net worth)

**Arguments for type-specific tables:**
- Nullable columns are a code smell — schema doesn't enforce required fields per type
- DB constraints can't express "income_type is required when type = 'income'"
- Risk of writing income without income_type (no DB error, only application error)

**Why single table is right for ploutizo:**
- Type-specific field requirements ARE enforced — at the Zod validator and Hono API layers. This is appropriate because the type constraints involve conditional logic (e.g. "category required for expense but not income") that Postgres CHECK constraints express awkwardly and cannot reference join conditions
- 6 transaction types is not complex enough to justify the JOIN overhead of type-specific tables
- Real-world finance apps (YNAB, Firefly III, Actual Budget) all use single-table designs for similar reasons — query simplicity for aggregation outweighs schema normalization benefits
- The nullable columns risk is managed by the application layer being the only way to write data

**What this means in practice:**
- Keep Zod discriminated union schemas (`TransactionSchema = ExpenseSchema | IncomeSchema | ...`) in `@ploutizo/validators`
- API route handlers validate the incoming body against the specific type's schema before inserting
- SELECT queries are simple; INSERT logic enforces correctness via Zod

### Verdict

Single flexible transactions table is the correct choice. Enforce type-specific field requirements in Zod, not Postgres constraints. This is consistent with established patterns in personal finance applications.

---

## 3. Money Storage: Integer Cents with Drizzle + Postgres

### Integer Type Limits

Postgres `integer` (int4): max value is **2,147,483,647**, which equals **$21,474,836.47** in cent storage.

For ploutizo:
- Individual transactions: no realistic household transaction exceeds $21M — `integer` is safe
- `transaction_assignees.amount` (split amount): always a fraction of the transaction, also safe
- **Budget amounts**: budget limits are usually under $10,000/month — `integer` safe
- **Contribution room tracking** (TFSA/RRSP/FHSA): TFSA lifetime room can reach ~$95,000 for someone born in 1990 = 9,500,000 cents. Well within `integer` range
- **Settlement balances (aggregated)**: SUM of `amount` across all transactions. If a household has 100,000 transactions averaging $100 each, the raw sum is $10,000,000 = 1,000,000,000 cents — still within `integer` max
- **Net worth**: SUM of account balances. A household with $500,000 in assets = 50,000,000,000 cents — **this OVERFLOWS `integer`**

### Critical Finding: Use `bigint` for Aggregated Money Values

- Storing individual transaction amounts: `integer` is safe (max ~$21M per transaction)
- Computing SUM aggregations over many transactions: result can overflow `integer`
- Drizzle's `integer` maps to JavaScript `number` — no issue for individual values
- Drizzle's `bigint` maps to either `bigint` (native) or `number` (mode: 'number' for values up to 2^53)

### Recommendations

1. **Store individual amounts as `integer`** — no realistic single transaction or budget amount approaches $21M
2. **All SUM aggregations should use `bigint` at the query level** — wrap settlement and net worth SUM queries in SQL casting: `sql<number>\`SUM(${table.amount})::bigint\``
3. **Frontend formatting**: `formatCurrency(cents: number): string` is safe as JavaScript `number` handles integers precisely up to 2^53 (~$90 trillion in cents). No bigint conversions needed in the display layer
4. **Drizzle column definition**: use `integer('amount').notNull()` for all money columns in the schema
5. **Zod validation**: `z.number().int().nonnegative()` on all money fields in `@ploutizo/validators`
6. **CSV import parsing**: `Math.round(parseFloat(raw) * 100)` is correct — but validate that the result is an integer and non-negative before accepting

### The `percentage` Exception

`transaction_assignees.percentage` is correctly stored as `numeric(5,2)` (e.g. `33.33`). This is a ratio, not a money value. Drizzle: `numeric('percentage', { precision: 5, scale: 2 })`.

### Overflow Risk Summary

| Use | Max Realistic Value (cents) | integer Safe? |
|-----|---------------------------|----------------|
| Single transaction amount | ~$50,000 = 5,000,000 | YES |
| Budget limit | ~$10,000 = 1,000,000 | YES |
| Investment contribution | ~$95,000 = 9,500,000 | YES |
| SUM of transactions (per account) | $500,000 = 50,000,000 | YES |
| Net worth (household total) | $1,000,000+ = 100,000,000+ | YES (under $21M) |
| Net worth edge case (asset-rich household) | $500,000+ = 50,000,000,000 | NO — use bigint cast |

**Sources:**
- PostgreSQL numeric types: https://www.postgresql.org/docs/current/datatype-numeric.html (HIGH confidence)
- Drizzle column types: https://orm.drizzle.team/docs/column-types/pg (HIGH confidence)

---

## 4. Split Transaction Modeling and Remainder Handling

### The Problem

Splitting $100 among 3 people evenly: 100/3 = 33.33333... cents cannot be represented as an integer. The split must sum exactly to the transaction total.

### Canonical Approach: Largest Remainder Method

The standard technique for splitting integers that must sum to a total:

```typescript
const splitEvenly = (totalCents: number, count: number): number[] => {
  const base = Math.floor(totalCents / count)       // floor division
  const remainder = totalCents % count               // how many get +1 cent
  return Array.from({ length: count }, (_, i) =>
    i < remainder ? base + 1 : base
  )
}

// Example: $10.00 = 1000 cents among 3
// base = 333, remainder = 1
// Result: [334, 333, 333] — sums to 1000
```

The extra cent(s) go to the first N assignees (by insertion order or alphabetically — choose a deterministic rule).

### Percentage Storage

`transaction_assignees.percentage` stores `numeric(5,2)` — this is for DISPLAY only. The `amount` column is the authoritative split. When computing balances, always use `amount`, never recompute from `percentage`.

**Why this matters:** 33.33 + 33.33 + 33.34 = 100.00% is fine for display, but if you recompute amounts from percentages you reintroduce floating-point errors. Percentage is a cached display field.

### Custom Split Validation

When users set custom splits:
- **By percentage**: percentages must sum to exactly 100.00. Accept minor floating-point tolerance: `Math.abs(sum - 100) < 0.01`. Then compute amounts using the same largest-remainder method with the user's percentages.
- **By dollar amount**: amounts must sum exactly to the transaction total (cent-precise). Validate server-side in the Zod schema.

### Schema Implications

```
transaction_assignees
  id             -- uuid
  transaction_id -- FK to transactions
  member_id      -- FK to org_members
  amount         -- integer cents (AUTHORITATIVE)
  percentage     -- numeric(5,2) (DISPLAY ONLY)
```

Constraint to add: enforce `SUM(amount) = transactions.amount` at the application layer (in the Zod schema that validates the full transaction + assignees as a unit), not as a Postgres constraint (too complex with triggers).

### Remainder Assignment Rule

Deterministic rule for ploutizo: **first assignee by member insertion order gets the extra cent(s)**. This avoids any bias while being predictable. Document this in a comment in the split utility function.

---

## 5. Settlement Balance Computation: Query-Time vs Materialized

### The Computation

For each shared account, each member's balance = SUM of their split amounts across all expense/refund transactions on that account, minus SUM of their settlement transactions against that account.

```sql
SELECT
  ta.member_id,
  SUM(CASE WHEN t.type IN ('expense', 'refund') THEN ta.amount ELSE 0 END)
  - SUM(CASE WHEN t.type = 'settlement' THEN t.amount ELSE 0 END) AS outstanding_balance
FROM transaction_assignees ta
JOIN transactions t ON t.id = ta.transaction_id
WHERE t.org_id = $orgId
  AND t.account_id = $accountId
  AND t.deleted_at IS NULL
GROUP BY ta.member_id
```

### Scale Analysis

Ploutizo's context: a typical active household generates 50–200 transactions/month. At 100k transactions (an 8+ year household at 1,000/month), this query scans and aggregates 100k rows.

**Performance reality:**
- With a composite index on `(org_id, account_id, deleted_at)` on transactions and a matching index on `transaction_assignees(transaction_id)`, this query runs in milliseconds for 100k rows on Postgres 16
- Neon runs on Postgres 16 with standard index support
- The query is a simple aggregate — no complex joins or window functions

### Options

**Option A: Compute at query time (RECOMMENDED for v1)**
- Always reflects current state — no stale reads
- Simple — no refresh logic, no cache invalidation
- For 100k transactions with proper indexes, query time is well under 100ms
- No materialized view maintenance complexity

**Option B: Materialized balance columns**
- Cache `current_balance` on each `account_members` row
- Update via trigger or application code on every transaction insert/update/delete
- **Problem**: triggers are complex to maintain, especially for soft deletes; application-code updates are error-prone (what if an import batch fails halfway through?)
- Not worth it until query time is measurably slow at scale

**Option C: Postgres materialized view**
- Define a `settlement_balances` materialized view
- Refresh on transaction changes
- Drizzle supports `db.refreshMaterializedView(view)` (see official docs)
- **Problem**: Neon's HTTP driver doesn't support the `REFRESH MATERIALIZED VIEW CONCURRENTLY` lock-free refresh without websockets. Non-concurrent refresh locks the view during refresh

### Index Strategy for Query-Time Computation

These indexes make the query-time approach fast:

```typescript
// In transactions table definition
index('txn_org_account_idx').on(transactions.orgId, transactions.accountId),
index('txn_org_type_idx').on(transactions.orgId, transactions.type),

// In transaction_assignees table definition
index('ta_txn_member_idx').on(transactionAssignees.transactionId, transactionAssignees.memberId),
```

### Verdict

**Compute settlement balances at query time with proper indexes for v1.** Revisit materialization if profiling shows slow queries at real scale — but 100k transactions is not the threshold for concern. The query is a straight aggregate with indexed columns.

---

## 6. CSV Import Deduplication

### Two-Signal Strategy

Deduplication uses two independent signals — apply both, flag a row as duplicate if either matches:

**Signal 1: `external_id` exact match (highest priority)**
- When the bank CSV includes a transaction reference ID, store it in `transactions.external_id`
- On import: `SELECT id FROM transactions WHERE org_id = $orgId AND account_id = $accountId AND external_id = $externalId`
- If found → definitive duplicate, flag immediately
- No fuzzy matching needed when `external_id` is present

**Signal 2: Date + amount + description fuzzy match (fallback)**
- Apply only when `external_id` is absent or doesn't match
- Exact match on `date` and `amount` (integer, no ambiguity)
- Fuzzy match on `description` using normalized Levenshtein distance

### Levenshtein Distance for Transaction Description Matching

**The algorithm:** Levenshtein distance counts the minimum character edits (insert, delete, substitute) between two strings. Normalized distance = `levenshtein(a, b) / max(len(a), len(b))`.

**Recommended thresholds based on transaction description patterns:**
- `normalized_distance < 0.2` → likely duplicate (same merchant, minor formatting difference)
  - "NETFLIX.COM 866-579-7172" vs "NETFLIX.COM" → distance 14/24 = 0.58 — NOT a match (different enough)
  - "LOBLAWS #1234 TORONTO ON" vs "LOBLAWS #1235 TORONTO ON" → 1/24 = 0.04 — match
- `normalized_distance < 0.3` → possible duplicate (flag for review, user decides)

**Pre-processing required before comparison:**
1. Uppercase both strings
2. Strip trailing/leading whitespace
3. Normalize multiple spaces to single space
4. Strip common noise suffixes: phone numbers (regex `\d{3}-\d{3}-\d{4}`), branch numbers, postal codes

**Performance note:** Running Levenshtein against all transactions in the account is O(n) — for 10,000 transactions, this is fast in JavaScript. For 100k+, pre-filter by exact date + amount first, then run Levenshtein only on that subset (typically 0–5 rows).

### Deduplication Algorithm

```typescript
const isDuplicate = async (
  candidate: { date: Date; amount: number; description: string; externalId?: string },
  accountId: string,
  orgId: string
): Promise<boolean> => {
  // Signal 1: exact external_id match
  if (candidate.externalId) {
    const exactMatch = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.orgId, orgId),
        eq(transactions.accountId, accountId),
        eq(transactions.externalId, candidate.externalId),
        isNull(transactions.deletedAt)
      ))
      .limit(1)
    if (exactMatch.length > 0) return true
  }

  // Signal 2: date + amount exact, description fuzzy
  const candidates = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.orgId, orgId),
      eq(transactions.accountId, accountId),
      eq(transactions.date, candidate.date),
      eq(transactions.amount, candidate.amount),
      isNull(transactions.deletedAt)
    ))

  return candidates.some(existing =>
    normalizedLevenshtein(normalize(existing.description), normalize(candidate.description)) < 0.2
  )
}
```

### Settlement Deduplication Special Case

Settlements can appear in two CSVs (the payer's chequing export and the payee's credit card export). The `settled_account_id` field on settlement transactions supports this: when importing a payment that matches a recorded settlement's amount + date + source account, flag it as duplicate.

### `external_id` Indexing

```typescript
// Index for fast exact-match lookup on import
index('txn_external_id_idx').on(transactions.externalId)
// Or partial index for non-null only:
// CREATE INDEX txn_external_id_idx ON transactions (external_id) WHERE external_id IS NOT NULL
```

---

## 7. Soft Delete Pattern: `deleted_at` Timestamp vs `is_deleted` Boolean

### Comparison

| Criterion | `deleted_at` TIMESTAMP | `is_deleted` BOOLEAN |
|-----------|----------------------|----------------------|
| When was it deleted? | YES — full audit trail | NO |
| Can you query recent deletes? | YES — `WHERE deleted_at > now() - interval '7 days'` | NO |
| Time-to-live / auto-purge | Easy — compare to threshold | Needs separate column |
| Drizzle filter syntax | `.where(isNull(t.deletedAt))` | `.where(eq(t.isDeleted, false))` |
| Index friendliness | Partial index on `(col) WHERE deleted_at IS NULL` covers 99%+ of rows | Same, slightly simpler |
| DB storage | 8 bytes per row | 1 byte per row |
| NULL meaning | Not deleted | N/A (always true/false) |

### Verdict: Use `deleted_at` Timestamp

**Reasons:**
1. Audit trail: "when was this transaction deleted?" is a reasonable support query
2. Time-windowed recovery: "show transactions deleted in the last 30 days" is useful for undo
3. Future hard-delete job: `WHERE deleted_at < now() - interval '90 days'` — trivial with timestamp, needs another column with boolean
4. Industry standard for soft delete in Postgres applications

### Drizzle Pattern

**Schema definition:**
```typescript
export const transactions = pgTable('transactions', {
  // ...
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  // Partial index — only indexes non-deleted rows (the 99%+ case)
  index('txn_active_org_date_idx')
    .on(table.orgId, table.date)
    .where(sql`${table.deletedAt} IS NULL`),
])
```

**Query pattern — always filter:**
```typescript
// ALWAYS include this in every transaction query
.where(isNull(transactions.deletedAt))
```

**Soft delete execution:**
```typescript
await db.update(transactions)
  .set({ deletedAt: new Date() })
  .where(and(
    eq(transactions.id, id),
    eq(transactions.orgId, orgId)  // tenant guard always present
  ))
```

### Partial Index Strategy

The most impactful index for queries that always exclude deleted rows is a **partial index** that only includes non-deleted rows:

```sql
CREATE INDEX txn_active_org_date_idx ON transactions (org_id, date)
WHERE deleted_at IS NULL;
```

This index is smaller than a full index (deleted rows excluded) and equally fast for the 99%+ of queries that filter `deleted_at IS NULL`.

Drizzle supports partial indexes via `.where(sql\`${table.deletedAt} IS NULL\`)` in the table definition's index array.

---

## Key Gotchas

- **`integer` max is ~$21M in cents** — safe for individual transaction amounts but NOT for SUM aggregations over large datasets. Always cast SUM results to bigint at the SQL level
- **`orgId` from Clerk is `undefined` when user has no active org** — `tenantGuard()` middleware must reject requests with null/undefined orgId before any DB query runs
- **Settlement percentages are display-only** — always use `transaction_assignees.amount` for balance computation, never recompute from `percentage` (floating-point re-introduction)
- **Levenshtein needs pre-normalization** — raw bank descriptions have phone numbers, branch codes, and trailing noise that inflate distance. Normalize before comparing
- **Neon HTTP driver cannot set session variables** — this is why RLS with JWT claims is impractical for ploutizo; you'd need the websocket driver which has higher latency per connection
- **Partial indexes on `deleted_at IS NULL`** are critical for performance — without them, every active-transaction query scans the full index including all historical deletes
- **`external_id` is not always present** — only some Canadian bank CSVs include a reference ID. The fuzzy fallback is the primary deduplication path for TD, RBC, and older formats
- **Rounding remainder goes to first assignee** — document this rule in code so it is not changed inadvertently, as changing it would shift 1 cent between members retroactively
- **Budget rollover only carries surplus** — overspend does not roll over. The rollover computation is: `MAX(0, previous_limit - previous_spend)` added to next period's limit

---

## Recommendations

- **Tenant isolation**: application-level WHERE clauses + `tenantGuard()` middleware + non-nullable `org_id` on every table. No Postgres RLS needed.
- **Transaction table**: single flexible table with nullable type-specific columns is correct. Enforce type constraints in Zod discriminated unions in `@ploutizo/validators`.
- **Money columns**: `integer` for all stored amounts. Cast SUM aggregations to `bigint` in SQL. Never use `numeric` or `float` for money.
- **Split remainders**: use largest-remainder method. First assignee by member insertion order receives extra cent(s). Store `amount` as authoritative; `percentage` is display cache.
- **Settlement balances**: compute at query time in v1. Add composite indexes `(org_id, account_id)` on transactions and `(transaction_id, member_id)` on assignees.
- **CSV deduplication**: `external_id` exact match first; fall back to date + amount exact + normalized Levenshtein < 0.2. Pre-normalize descriptions before comparison. Pre-filter by date + amount before running Levenshtein.
- **Soft delete**: `deleted_at TIMESTAMP WITH TIME ZONE`, not `is_deleted` boolean. Create partial indexes `WHERE deleted_at IS NULL` for all active-data indexes.
- **Indexes to create at schema time**:
  - `transactions (org_id, date) WHERE deleted_at IS NULL` — primary transaction list query
  - `transactions (org_id, account_id) WHERE deleted_at IS NULL` — settlement computation
  - `transactions (org_id, type) WHERE deleted_at IS NULL` — budget spend queries
  - `transactions (external_id) WHERE external_id IS NOT NULL` — import deduplication
  - `transaction_assignees (transaction_id, member_id)` — split lookups
  - `transaction_assignees (member_id)` — per-member balance queries
