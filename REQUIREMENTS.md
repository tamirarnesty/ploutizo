# ploutizo — Features & Requirements

Personal finance tracker for households. Tracks expenses, income, savings
contributions, and budgets across household members with shared expense
settlement.

> **Status:** living document — update as decisions are made  
> **Last updated:** 2026-03 (assignees, transaction schema model, category icons, tags UX, import delete, merchant rule seeding)

---

## Table of Contents

1. [Households & Users](#1-households--users)
2. [Accounts](#2-accounts)
3. [Categories & Tags](#3-categories--tags)
4. [Transactions](#4-transactions)
5. [Settlement](#5-settlement)
6. [Budgets](#6-budgets)
7. [Savings & Investments](#7-savings--investments)
8. [CSV Import](#8-csv-import)
9. [Merchant Rules](#9-merchant-rules)
10. [Net Worth](#10-net-worth)
11. [Notifications & Alerts](#11-notifications--alerts)
12. [Future / Backlog](#12-future--backlog)

---

## 1. Households & Users

### Households
- Every user belongs to one or more households
- A solo user always has exactly one household (themselves)
- Each household has a unique subdomain: `{subdomain}.ploutizo.app`
- Each household has a **display name** (e.g. "Arnesty Family") shown in the sidebar switcher, household list, and header — separate from the subdomain slug
- Every member of a household sees all data within that household — no per-member visibility restrictions

### Subdomain
- User picks a subdomain slug on household creation
- A random, fun slug is auto-generated as the default suggestion (e.g. `golden-newt`, `lucky-pike`) — user can accept or override before confirming
- Subdomain is **immutable** after creation — display a clear warning at creation time
- Subdomain rules:
  - Lowercase alphanumeric + hyphens only
  - 3–32 characters
  - Must be unique across all households
- Reserved subdomains (blocked from user selection): `api`, `admin`, `app`, `www`, `mail`, `static`, `assets`, `health`, `auth`, `dashboard`, `support`, `help`, `docs`, and others as needed
- Validation is server-side on creation — return a clear error if subdomain is taken or reserved

### Switching Households
- A user with multiple households can switch via:
  - A household switcher in the app sidebar (settings section)
  - Navigating directly to a different subdomain URL
- Switching subdomain URL switches household context automatically
- A user who navigates to a household they are not a member of sees a 403 / "not a member" page

### Invitations

#### Flow
1. An existing household member enters an email address to invite someone
2. The app creates an invitation record tied to the household with a unique token
3. An in-app notification is shown to the inviter confirming the invitation was sent
4. The invited user receives an email with an invitation link containing the token (email delivery via transactional email service — Resend or equivalent)
5. Clicking the link:
   - If the user has no account: taken to sign-up flow, then automatically accepted into the household on completion
   - If the user has an existing account: taken to a confirmation screen ("You've been invited to join X household — Accept / Decline")
   - If the user is already a member of that household: show a message, no action needed
6. On acceptance, the user is added to the household and redirected to `{subdomain}.ploutizo.app`
7. On decline, the invitation is marked declined and no further action is taken

#### Invitation Record Fields
- Household FK
- Invitee email
- Invited by (member FK)
- Token (unique, non-guessable)
- Status — `pending` | `accepted` | `declined` | `expired`
- Created at
- Expires at (created at + 7 days)

#### Rules
- An invitation is invalid (treated as expired) if accessed after 7 days
- Only one pending invitation per email per household at a time — re-inviting the same email replaces the previous pending invitation
- Expired invitations require the member to re-invite — no automatic resend
- Invitations are visible to all household members in household settings (pending + recently accepted)

### Member Roles
- All members are admins — no role distinction in v1
- Role field exists in the data model for future use but is not enforced

---

## 2. Accounts

### Account Types
| Type | Examples | Notes |
|---|---|---|
| Chequing | TD Chequing, RBC Everyday | Primary debit account |
| Savings | HISA, EQ Bank | Non-investment savings |
| Credit Card | Amex Gold, CIBC MC, RBC Visa | Liability account |
| Prepaid / Cash | Cash wallet, prepaid card | |
| E-Transfer | Interac e-transfer source | Linked to a chequing account |
| Investment | TFSA, RRSP, FHSA, RESP, non-reg | See §6 for contribution tracking |
| Other | Any user-defined type | |

### Account Membership
- Each account has one or more household members as owners
- A member can have zero or more accounts
- Accounts can be personal (one owner) or shared (multiple owners)
- Shared accounts where each person pays their own transactions (e.g. a joint card with individual billing) are excluded from settlement calculations — flagged at the account level

### Account Fields
- Name (user-defined, e.g. "RBC Visa")
- Type (from list above)
- Currency (default CAD; multi-currency is future scope)
- Owner(s) — one or more household members
- Institution (optional, e.g. "TD Bank")
- Last four digits (optional, for identification)
- Active / archived status

---

## 3. Categories & Tags

### Categories

#### Definition
Categories classify expense transactions for budgeting, reporting, and merchant rule matching. They are the same list used across transactions, budgets, and merchant rules — there is no separate budget category concept. Income, transfers, settlements, and contributions do not use categories.

#### Scope
- Categories are **household-scoped** — shared among all members
- Default categories are inserted via a seed script (`seedOrgCategories(orgId)` in `packages/db/seeds/`) called at org creation. Every category row has a non-nullable `org_id` from the start — there are no global seed rows in the DB.
- Default seed list (Lucide icons):

| Category | Lucide Icon |
|---|---|
| Housing | `Home` |
| Groceries | `ShoppingCart` |
| Dining Out | `UtensilsCrossed` |
| Transport | `Car` |
| Health | `HeartPulse` |
| Entertainment | `Tv` |
| Utilities | `Zap` |
| Subscriptions | `Repeat` |
| Personal Care | `Smile` |
| Shopping | `ShoppingBag` |
| Other | `Package` |

- Users can add, rename, reorder, and archive categories
- Archived categories are hidden from creation UI but preserved on existing transactions
- Categories cannot be deleted if any transactions or budgets reference them — archive only

#### Category Fields
- Name (string, unique per household)
- Icon — stored as a Lucide icon name string (e.g. `"ShoppingCart"`). Emoji support may be added in future — the field accepts either a Lucide icon name or an emoji character. Lucide icons are shown in the editing UI; emoji fallback rendered as-is.
- Colour (optional hex — used in budget progress bars and charts)
- Sort order (user-defined)
- Active / archived status

---

### Tags

#### Definition
Tags are reusable household-scoped labels more granular and custom than categories. They can be applied to any transaction type and can span categories — e.g. a transaction in "Dining Out" could be tagged `office-expense`, or a "Shopping" transaction tagged `birthday-gift`.

#### Scope
- Tags are **household-scoped** — shared among all members
- No seed list — tags are entirely user-defined
- Tags can be assigned in merchant rules (applied automatically on match)

#### Tag Fields
- Name (string, unique per household, e.g. `vacation`, `office-expense`, `birthday-gift`)
- Colour (optional — for visual distinction in transaction lists)

#### Tag Behaviour
- A transaction can have zero or more tags
- Tag input follows the same "select from dropdown or create new" flow as categories — type to search existing tags, select to apply, or create new inline if no match found
- Tags cannot be deleted if any transactions reference them — archive only
- Archived tags are hidden from the tag picker but preserved on existing transactions

---

## 4. Transactions

### Transaction Types
- **Expense** — money going out (purchases, bills, fees). Counted in budget spend. Reduces account balance.
- **Refund** — money coming back in as a reversal of a previous expense. Reduces net spend in the originating category. Increases account balance. Supports splits identically to expenses. Optional `refund_of` FK to the original transaction — if linked, original split is pre-filled as default. Does not appear in income view.
- **Income** — money coming in from an external source (paycheques, freelance, cash). Not counted in budget spend. Uses income type + source instead of category (see Income below).
- **Transfer** — money moving between two household accounts. Has `from_account` and `to_account`. Excluded from all budget, expense, and income calculations. Cannot be split. No category required.
- **Settlement** — a bill payment recording a member's share repayment on a shared account (see §5). No category required.
- **Savings Contribution** — deposit to an investment account (see §7). No category required.

### Income
Income transactions use a different classification to expenses — type + source instead of category.

**Income Type** (tagged badge, maps to payment method):
- Direct Deposit
- E-Transfer
- Cash
- Cheque
- Other

**Income Source** (freeform string — who the money came from):
- e.g. Employer, Client, Insurance, Online Retail, Personal Sale
- Not a structured list — user enters freely

**Income summary** groups totals by income type (e.g. Direct Deposit, E-Transfer / Cash).

Refunds are **not income** — they are their own transaction type that reduces net category spend. See Transaction Types above.

### Required Fields
Every transaction must have all of the following before it can be saved:

| Field | expense | refund | income | transfer | settlement | contribution |
|---|---|---|---|---|---|---|
| Date | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Amount | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Name / Description | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assignee(s) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Category | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Income Type | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Income Source | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Account / Method | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| From Account | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| To Account | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

### Optional Fields
- **Notes** — freeform text, e.g. "emergency tire replacement"
- **Tags** — household-scoped reusable tags, multi-value per transaction (see §3). More granular and custom than categories — e.g. `office-expense`, `vacation`, `birthday-gift`. Tags can also be assigned in merchant rules.
- **Original description** — preserved from CSV import; shown alongside edited name
- **Refund of** — optional FK to the original expense transaction being reversed. If linked, original transaction's split is pre-filled as the default split on the refund. Not required — a refund is valid without a linked original.
- **Split details** — if more than one assignee (see below)
- **Recurring template reference** — nullable FK to a `recurring_templates` record if this transaction was generated by or used to create a recurring template (see Recurring Transactions below)
- **Import source** — reference to the CSV import batch it came from

### Splits
- A transaction with one assignee is assigned 100% to that member
- Splits are always divided evenly across the number of assignees by default
  - 1 assignee → 100%
  - 2 assignees → 50/50
  - 3 assignees → 33.33/33.33/33.34, etc.
- Adding or removing an assignee **resets the split to even** across the new assignee count
- After assignees are set, the split can be customised per transaction:
  - By **percentage** (must sum to 100%)
  - By **dollar amount** (must sum to transaction total)
  - Mixed not supported — one mode per transaction
- Split is stored per-assignee as both amount and percentage for display flexibility

### Auto-assignment Rules
- If the household has only one member, every transaction is assigned to them automatically
- If there are 2+ members, transactions are not auto-assigned unless a merchant rule specifies an assignee (see §9)
- Assignee is required before import can be finalised (see §8)

### Transaction Schema Model
The `transactions` table uses a **single flexible schema** with nullable type-specific columns. Type-specific field requirements are enforced at the application layer (Zod validators + API) — not as DB constraints. This keeps queries and the import flow simple while maintaining correctness in code.

#### Money convention — cents as integers
All monetary values across the entire application are stored as **unsigned integer cents** (e.g. `$234.80` → `23480`). Direction is implied by transaction `type`, never by sign.

- **DB:** `integer` columns for all money — never `numeric`, never `float`
- **API:** sends and receives cents as integers — no formatting at the API layer
- **Validators:** `z.number().int().nonnegative()` on all money fields
- **CSV import:** raw decimal string → `Math.round(parseFloat(value) * 100)` → integer cents
- **Frontend:** format at the display layer only via a shared `formatCurrency(cents: number): string` utility — never format in business logic
- `percentage` in `transaction_assignees` is the one exception — stored as `numeric(5,2)` (e.g. `33.33`) since it's a ratio, not a money value

```
transactions
  id, org_id, type, date, amount (integer cents, unsigned),
  description, raw_description,
  account_id,            -- nullable; used by: expense, refund, income, settlement, contribution
  category_id,           -- nullable; used by: expense, refund
  from_account_id,       -- nullable; used by: transfer
  to_account_id,         -- nullable; used by: transfer
  settled_account_id,    -- nullable; used by: settlement
  refund_of_id,          -- nullable; used by: refund (self-referential FK)
  recurring_template_id, -- nullable
  import_batch_id,       -- nullable
  income_type,           -- nullable enum; used by: income
  income_source,         -- nullable string; used by: income
  notes,
  external_id,
  is_duplicate,
  deleted_at,            -- soft delete
  created_at, updated_at
```

Splits live in a separate `transaction_assignees` join table:
```
transaction_assignees
  id, transaction_id, member_id (→ org_members),
  amount (integer cents, unsigned),
  percentage (numeric 5,2 — e.g. 33.33)
```

### Schema naming notes
- The tenancy unit table is `orgs` (user-facing term: "household") — consistent with the `org_id` convention used on every table
- Members are stored in `org_members`
- `users.external_id` stores the auth provider's user ID — named provider-agnostically

### Editing
- Any field on a transaction can be edited after creation
- Original imported values (description, amount, date) are preserved and shown on the edit view
- A transaction can be marked as a duplicate and excluded from all calculations — does not delete the record
- **During import review:** a transaction row can be deleted entirely — it is not written to the database at all
- **After import / creation:** deleted transactions are soft-deleted (`deleted_at` timestamp set) — hidden from all views and calculations but preserved in the database

### Payment Methods
Supported methods (used when no linked account):
- Credit card
- Debit card
- E-transfer (Interac)
- Cash
- Cheque
- Direct deposit
- Other (user-defined label)

### Recurring Transactions

#### Concept
Any transaction can be made recurring by associating it with a recurring template. The template defines the schedule; each generated transaction is an independent copy that can be edited without affecting the template or future instances.

#### Recurring Template Fields
- **Name / Description** — inherited from originating transaction; editable on template
- **Amount** — inherited; editable on template
- **Category** — inherited; editable on template
- **Account** — inherited; editable on template
- **Assignee(s) / Split** — inherited; editable on template
- **Frequency** — one of: `daily`, `weekly`, `bi-weekly`, `monthly`, `yearly`
- **Start date** — date of the first occurrence
- **End date** — optional; if absent the template recurs indefinitely
- **Status** — `active` | `stopped`

#### Generation
- Recurring transactions are generated on the next applicable date when the user loads the app (fetch-based, not a scheduled background job in v1)
- Each generated instance inherits all fields from the template at generation time
- Generated instances are normal transactions — fully editable after generation
- Editing a generated instance does not affect the template or any other instance
- <!-- TODO: v2 — decide if templates should support "edit all future" -->

#### Stopping
- Setting status to `stopped` prevents any new instances from being generated
- Existing generated instances are untouched
- A stopped template can be reactivated

#### UI Entry Points
- "Make recurring" action on any existing transaction → creates a template pre-filled from that transaction
- "Add recurring" from a dedicated recurring templates view
- Recurring templates list shows all active/stopped templates with next generation date

---

## 5. Settlement

### Concept
Settlement answers: "for each account with shared transactions, what does each member owe right now?"

- A settlement is a **bill payment** — a member paying their share of a shared account's balance
- Settlements are per-account: each account with shared transactions is settled independently
- Settlements are calculated as a **running real-time balance** — always reflects current state, not a period snapshot
- A settlement is recorded as a **transaction of type `settlement`** — it reduces the running balance on that account immediately
- Each settlement has one payer and one destination (account being settled, or member being paid back)
- No multi-recipient or multi-account settlements in a single transaction

### Example
- Tamir's TD Visa: total balance $340 → Tamir owes $300 (his share), Emily owes $40 (her share)
- Emily's RBC Visa: total balance $200 → Emily owes $200 (her card, her bill), Tamir owes $0
- Emily's e-transfer account: Tamir owes Emily $50 for shared expenses Emily paid out of pocket
- Each of these is settled as an individual bill payment transaction

### Balance Calculation (per account)
For each shared account:
1. Sum all expense transactions on that account
2. For each member, sum their split share across all transactions on that account
3. Each member's outstanding balance = their total split share − their recorded settlements against that account
4. Balance is always real-time — every new transaction and settlement updates it immediately

### Cross-Member Net Settlement Display
When two members have opposing balances across different accounts (A owes B on one account, B owes A on another):
- Show each gross balance individually (one card per account)
- Show a **net settlement line** below when both directions are non-zero: "After netting: Emily → Tamir $90"
- Net line is display-only — settlements are still recorded individually per account
- Net line is hidden when debt flows only one direction between a pair

### Settlement Card (per account)
- Header: account name + total balance (e.g. "TD Visa — $340")
- Per-member rows: "Tamir — $300", "Emily — $40"
- "Settle" CTA per member row → opens settlement transaction form

### Shared Account Exclusion
- Accounts flagged as "each person pays their own" are excluded from shared settlement
- Each member's transactions on that account are their own responsibility
- These accounts still appear in net worth and transaction history

### Recording a Settlement
- Triggered from "Settle" CTA on an account's settlement card
- Creates a transaction of type `settlement` with fields:
  - Payer (member settling)
  - Account being settled (the shared account)
  - Source account or method (where the payment came from — chequing, e-transfer, cash, or "other")
  - Amount (defaults to member's current outstanding balance; can be overridden for partial settlement)
  - Date
  - Optional note
- Source account is recorded to support deduplication when the same payment appears in two CSV exports (e.g. Emily's settlement of Tamir's TD appears as an outgoing e-transfer in Emily's chequing export and an incoming payment in Tamir's TD export — second import is flagged as duplicate)

---

## 6. Budgets

### Budget Structure
- Budgets are **household-wide** (v1 — per-member budgets are future scope)
- Each budget is tied to one **category** from the household's category list (§3)
- Budget spend is calculated from all expense transactions in that category within the period — same category list used by transactions and merchant rules, no separate concept
- Multiple budgets per category are not allowed within the same active period

### Budget Status Thresholds
Derived automatically from spend vs limit:

| Status | Condition | Colour |
|---|---|---|
| On Track | < 80% used | Blue |
| Caution | 80–99% used | Amber / Yellow |
| Over | ≥ 100% used | Red |

### Budget Periods
- Default period: **monthly** (calendar month)
- Custom periods supported: weekly, bi-weekly, yearly, or user-defined date range
- Period start/end dates are user-defined for custom periods

### Rollover
- Off by default
- When enabled: unspent budget surplus from the previous period carries forward and adds to the next period's limit
- Overspend does not roll over (surplus only)

### Budget Fields
- Category (FK to household categories)
- Amount (limit)
- Period type
- Rollover on/off
- Active / paused status

### Budget Dashboard
- Summary row: total budget, spent so far, remaining, over-budget category count
- Per-category table rows: progress bar, budget amount, spent, remaining, status badge
- Progress bar colour matches status threshold
- Over-budget rows highlighted with red tint
- Historical budget performance viewable by period

---

## 7. Savings & Investments

### Supported Account Types
| Account | Type | Contribution Limit Logic |
|---|---|---|
| TFSA | Tax-Free Savings | Fixed annual CRA limit × years since age 18; calculated automatically |
| RRSP | Registered Retirement Savings | 18% of prior year earned income; v1 uses manual user-set room |
| FHSA | First Home Savings | $8,000/year, $40,000 lifetime; calculated automatically |
| RESP | Registered Education Savings | No tracked limit in v1 |
| Non-registered | General investment | No limit |
| Other | User-defined | No limit |

### Contribution Tracking
- Tracks **contributions made**, not live portfolio balance
- Each contribution is a transaction of type Savings Contribution
- Fields: date, amount, account, member, optional note

### Contribution Room
- TFSA room: requires member's birth year (stored as private profile field)
  - Room = sum of annual CRA limits from the year member turned 18 to present, minus all tracked contributions
  - CRA annual limits are hardcoded per year (updated manually when CRA announces)
- RRSP room: v1 — user manually sets their available room; app tracks contributions against it
- FHSA room: $8,000/year accumulates automatically; $40,000 lifetime cap; tracks from account open date
- Remaining room displayed per account with a progress indicator
- Over-contribution flagged as a warning

### Birth Year
- Stored on the member's profile
- Used only for TFSA room calculation
- Treated as private — not visible to other household members

---

## 8. CSV Import

### Supported Formats
- App recognizes and auto-detects specific Canadian bank CSV formats:
  - TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, EQ Bank
  - Each bank has a dedicated internal normalizer function that maps its format to the ploutizo normalized format
  - New bank formats are added one at a time as dedicated normalizer functions
  - Detection is based on column headers and file structure
- Normalized ploutizo CSV format is also accepted directly
- Manual column mapping is deferred to a future version

### Normalized ploutizo CSV Format

Single signed `amount` column — negative = expense/outgoing, positive = income/incoming. Bank-specific debit/credit column pairs are normalized internally by the import parser before reaching this format.

#### Column Spec

| Column | Required | Format | Notes |
|---|---|---|---|
| `date` | ✅ | `YYYY-MM-DD` | Transaction date |
| `amount` | ✅ | Signed decimal | e.g. `-234.80`, `+2500.00`. Negative = expense, positive = income |
| `description` | ✅ | String | Raw or cleaned merchant name |
| `type` | ✅ | `expense` \| `refund` \| `income` \| `transfer` \| `settlement` \| `contribution` | Transaction type |
| `account` | ✅ | String | Case-insensitive exact match against existing household account names. On mismatch: falls back to empty and requires user resolution during import review — see account resolution below |
| `currency` | ❌ | ISO 4217 code | Defaults to `CAD` |
| `assignee` | ❌ | String | Member display name or email. Required before import finalises — can be set during review if absent |
| `category` | ❌ | String | Case-insensitive match against household categories. Unmatched values create a new category or prompt resolution |
| `settled_account` | ❌ | String | For `type=settlement` only — the account being settled against (e.g. `TD Visa`). Used for deduplication across paired CSV exports |
| `tags` | ❌ | Pipe-separated string | e.g. `vacation-2025\|work` |
| `notes` | ❌ | String | Freeform |
| `external_id` | ❌ | String | Bank-assigned transaction reference ID if available. Primary duplicate detection signal when present. Surfaced in transaction context menu ("more options") — not shown by default |

#### Account Resolution on Import

When an `account` value does not match any existing household account:

- The cell falls back to empty and is flagged for resolution (blocks import finalisation)
- The cell renders as a dropdown populated with all existing household accounts
- The final option in the dropdown is **"+ Create new account"**
- Selecting "Create new account" opens an inline dialog to define the new account (name, type, owner(s), institution, last four digits)
- On confirm, the account is created immediately and:
  - Assigned to the current transaction row
  - Silently added to all other unresolved account dropdowns in the same import session without requiring a page refresh
- User can also select an existing account from the dropdown to remap the imported value
```csv
date,amount,description,type,account,assignee,category,tags,notes,external_id
2026-03-08,-234.80,Loblaws #1234 Toronto ON,expense,Amex Gold,Tamir,Groceries,,,TXN-8821
2026-03-06,-15.99,Netflix.com,expense,CIBC MC,Tamir,Subscriptions,,,TXN-8819
2026-03-05,-120.00,PHYSTRP HLTH CTRE,expense,TD Visa,Emily,Health,,physiotherapy,TXN-8818
2026-03-01,2500.00,Payroll deposit,income,TD Chequing,Tamir,Income,,,TXN-8800
2026-03-01,-300.00,TD Visa payment,settlement,TD Chequing,Tamir,,,,TXN-8801
```

### Import Flow
1. User selects import type: Expenses, Income, or Savings
2. User uploads CSV (drag-and-drop or file picker)
3. App auto-detects bank format and maps to normalized format
4. App displays import preview table with all detected transactions
5. Each row shows: date, description (raw + cleaned if merchant rule matched), amount, account, category, purchaser, status
6. User reviews and resolves all flagged rows before import can complete
7. User confirms — selected transactions are imported

### Row Statuses
| Status | Meaning |
|---|---|
| New | Clean, ready to import |
| Duplicate | Matches an already-imported transaction — flagged, unchecked by default |
| Review | Missing required field (category, purchaser, or other) — must be resolved |

### Duplicate Detection
- Matched on: date + amount + description (fuzzy) within the same account
- Duplicate rows are visually distinct (strikethrough description, amber highlight)
- User must resolve each duplicate: accept as new, mark as duplicate (skip), or modify
- "Skip duplicates" toggle skips all detected duplicates automatically

### Editing on Import
- Description can be edited inline — original raw value preserved and shown ("was: NETFLIX.COM 866-579-7172")
- Category, assignee, account, tags all editable per row during import
- Merchant rule matches are applied automatically — user can override per row
- Assignee required before import can be finalised; can be set per row or via bulk select
- A row can be **deleted during review** — it is removed from the import session and never written to the database

### Bulk Actions
- Select all / deselect all
- Bulk-assign category to selected rows
- Bulk-assign assignee to selected rows
- Skip all duplicates toggle

### Post-Import
- Import batch is saved as a reference (source, date, row count, account)
- Individual transactions retain a link to their import batch
- Transactions remain fully editable after import

### AI Auto-fill (Future — v2)
- Suggest category, merchant name, and purchaser during import using pattern recognition
- Goal: identify and create merchant rules from import patterns
- Not required for v1 — keep noted for roadmap

---

## 9. Merchant Rules

### Purpose
Auto-categorise and rename transactions based on merchant name patterns. Applied during import and on manual transaction creation.

### Scope
- Rules are **household-scoped** — shared among all members
- Default seed rules and default categories are defined in seed scripts in `packages/db/seeds/` — not hardcoded in application code and not stored as nullable `org_id` rows in the DB
- On org creation, `seedOrgCategories(orgId)` and `seedOrgMerchantRules(orgId)` are called to insert fresh rows with the new `org_id` directly — every org's data is fully tenant-scoped from the start
- `merchant_rules.org_id` is non-nullable — there are no global seed rows in the DB
- Users can add, edit, and delete rules (including those seeded at creation)
- New entries added to seed scripts do not automatically propagate to existing households

### Rule Fields
- **Pattern** — the string to match against the raw transaction description
- **Match type** — one of:
  - Exact match
  - Contains (substring)
  - Starts with
  - Ends with
  - Regex
- **Rename to** — cleaned merchant name to display (optional — if blank, original description is kept)
- **Category** — category to assign (optional)
- **Assignee** — household member to assign (optional — e.g. "Neo Coffee Bar" → always Tamir)
- **Tags** — one or more tags to auto-apply (optional — e.g. "Neo Coffee Bar" → tag `office-expense`)
- **Priority** — order in which rules are evaluated when multiple match; first match wins

### Rule Application
- Applied in priority order — first matching rule wins
- Applied automatically on CSV import preview
- Applied on manual transaction creation if description matches
- User can override any auto-applied rule on a per-transaction basis without affecting the rule itself

---

## 10. Net Worth

### Concept
A point-in-time snapshot of the household's financial position derived from existing account and transaction data.

### Calculation
```
Net Worth = Assets − Liabilities

Assets:
  + Chequing / savings account balances (derived from transactions)
  + Investment account balances (derived from contributions — not live market value)
  + Cash account balances

Liabilities:
  - Credit card balances (derived from transactions)
  - Other liability accounts
```

### Display
- Total household net worth
- Breakdown by asset type and account
- Per-member breakdown (accounts owned by each member)
- Historical trend chart (monthly snapshots)
- Note: investment values reflect contribution totals only — not market performance

---

## 11. Notifications & Alerts

All notifications are **in-app only** in v1 — no email or push. Displayed as a notification feed / bell icon. Fetch-based (polling or on page load) — no websockets in v1.

### Budget Alerts
- Approaching limit — threshold at 80% of budget used (configurable in future)
- Limit exceeded

### Contribution Alerts
- TFSA / FHSA over-contribution warning (triggered immediately on entry)
- Annual contribution room refresh reminder — shown in-app each January

### Settlement Reminders
- Shown when a member's outstanding balance on any shared account exceeds a configurable threshold
- Threshold precedence: **member setting > household setting > global default ($50)**
- Member threshold is set in the member's profile settings
- Household threshold is set in household settings
- Reminder persists until balance is settled or drops below threshold
- Triggered on page load / dashboard view — not scheduled

### Recurring Transaction Reminders (Future — v2)
- Reminder when an expected recurring transaction has not appeared by its due date

---

## 12. Future / Backlog

Items noted but explicitly out of scope for v1:

| Item | Notes |
|---|---|
| Recurring — "edit all future" | Template edit propagation to future instances deferred to v2 || Recurring transaction reminders | Alert when expected recurring hasn't appeared by due date — v2 |
| Per-member budgets | v1 is household-wide only |
| Multi-currency | v1 is CAD only |
| Receipt scanning | Explicitly excluded |
| Live investment balance | Track contributions only in v1; live balance via brokerage API is future |
| AI auto-fill on import | Suggest category, name, purchaser; identify merchant rule patterns |
| Manual CSV column mapping | Bank-specific normalizers only in v1; custom mapping UI deferred |
| Mobile app | Web only for v1 |
| Public API | Not in scope |
| Per-member household visibility | All members see everything in v1 |
| Fiscal year budgets | Calendar year / custom periods only in v1 |
| Net worth market value | Contributions only; no brokerage integration |
