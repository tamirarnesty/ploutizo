---
title: Transaction Schema v2 — Design Decisions
date: 2026-04-19
context: Exploration session covering schema simplification, form redesign, and table layout
---

## Schema Delta

### Dropped columns
| Column | Reason |
|--------|--------|
| `merchant` | Absorbed into `description`; no semantic difference in practice |
| `income_source` | Absorbed into `description` (e.g. "PagerDuty", "E-Transfer from Alicia M.") |
| `to_account_id` | Replaced by `counterpart_account_id` |
| `settled_account_id` | Replaced by `counterpart_account_id` |
| `investment_type` | Dropped; contribution uses `category_id` or `description` |

### Added columns
| Column | Type | Notes |
|--------|------|-------|
| `counterpart_account_id` | FK nullable | Transfer: destination account; Settlement: funding source ("Paid from") |
| `raw_description` | text nullable | Bank/import-provided memo shown as sub-line in table; null for manually entered rows |
| `notes` | text nullable | Free-form notes, separate from description; shown at bottom of form |

### Unchanged columns
`id`, `org_id`, `type`, `date`, `amount` (unsigned cents), `description`, `account_id`, `category_id`, `refund_of_id`, `income_type`, `deleted_at`, `created_at`, `updated_at`

### Deferred to CSV Import phase
`import_batch_id`, `external_id`, `is_duplicate`, `recurring_template_id` — reserved for future phases; do not add now.

---

## column semantics by type

| Type | `account_id` | `counterpart_account_id` | `category_id` | `income_type` |
|------|-------------|--------------------------|---------------|---------------|
| expense | credit card / bank account | — | ✓ | — |
| refund | same account as original expense | — | ✓ | — |
| income | receiving account | — | — | ✓ (direct_deposit, e_transfer, cash, cheque, other) |
| transfer | source (From) account | destination (To) account | — | — |
| settlement | account being settled | funding source (optional) | — | — |
| contribution | investment account (e.g. TFSA) | — | — | — |

---

## Form UI Decisions

### Description field
- Required on all 6 types
- Transfer, settlement, contribution, and linked refund get auto-filled descriptions derived from their key fields (e.g. "Transfer · RBC Chequing → EQ Bank HISA")
- Auto-filled descriptions render as locked (lock icon + "Unlock" affordance inline via InputGroup)
- Unlocking is UI-only state — no schema flag; once unlocked the field is a normal text input
- Once saved, descriptions never auto-update when referenced entities are renamed

### Assignee / Split section
- Each org member shown as a shadcn Toggle button
- Clicking toggles a member on/off; split recalculates to equal shares automatically (1 = 100%, 2 = 50%, 3 = 33.33%, etc.)
- "Customize split" expander available below for manual percentage overrides (LRM applies)
- Transfer type: no assignee section

### Per-type field layout
| Type | Account fields | Category/type field | Assignees |
|------|---------------|---------------------|-----------|
| expense | Single account selector | Category | ✓ |
| income | Single account selector | Income type dropdown | ✓ |
| refund | Single account selector (+ original txn search at top) | Category | ✓ (pre-filled from original) |
| transfer | From → To (3-col row with arrow) | — | — |
| settlement | "Settling account" + "Paid from (optional)" | — | ✓ |
| contribution | Single account (shows member name: "TFSA — Emily") | — | ✓ |

### Settlement "Paid from" field
Includes both tracked accounts and untracked options (Cash, E-Transfer, Cheque, Other) with a visual separator between them.

### Field grouping
Fields are visually grouped: type/date/amount at top, account/category in the middle, assignees below that, notes + tags always at the bottom side by side.

---

## Table Layout Decisions

### Columns
`Date` | `Description` | `Type` | `Category` | `Account` | `Amount` | `Who`

### Date
- Rows grouped by date with a sticky section label (e.g. "MARCH 8"); date not repeated per row

### Description column
- Primary user description in full weight
- `raw_description` rendered as a muted sub-line when non-null (bank memo / import source)
- Refund rows show a sub-line linking to the original transaction (e.g. "↩ Mar 2 · $38.49"); clicking opens original in a drawer

### Type column
- Color-coded text badge on every row for all 6 types
- expense: red; income: green; refund: amber; settlement: purple; transfer: muted; contribution: teal

### Category column
- Shows category (with color dot) for expense and refund
- Em dash (`—`) for all other types

### Account column
- Single column
- Renders `A → B` for transfer (From → To) and settlement (Settling → Paid from) when counterpart is populated
- Shows single account name for all other types

### Amount column
- Signed and color-coded by type: expense = red negative, income/refund = green positive, transfer/settlement/contribution = unsigned neutral (no color)

### Internal rows
- Transfer, settlement, contribution rendered at reduced opacity to de-emphasize them visually

### Filter bar
- Type shortcuts: All types | Expenses | Income | Refunds | **Internal** (selects transfer + settlement + contribution together)
- Also: date filter, assignee filter, account filter, category filter, search
