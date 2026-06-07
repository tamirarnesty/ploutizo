# PRD: Credit Card CSV Import

> Status: **ready-for-agent** — aligned via domain research and grill session (June 2026).
> Domain glossary: `CONTEXT.md`. Linear Team Document: https://linear.app/ploutizo/document/prd-credit-card-csv-import-0b18896ad463
> Project: Phase 4 — CSV Import

## Problem Statement

Household members track credit card activity in Ploutizo by manually entering **expenses**, **refunds**, and **settlements** (bill payments). Credit card issuers export statement data as CSV files, but each issuer uses a different format, sign conventions, and date encoding. Without import, users must re-type every statement row, which is slow, error-prone, and makes it hard to keep **card balances**, **personal balances**, **shared balances**, and future budget spend accurate.

Users also need confidence that re-importing overlapping statement periods will not create duplicates, that **bill payment rows** align with existing **settlements** even when dates differ, and that imported rows preserve bank provenance (`raw_description`, **external id**) while still fitting Ploutizo's transaction model.

## Solution

Deliver a **credit card CSV import** feature scoped to **settlement-scoped accounts** (non-archived credit cards). Users choose a target card, upload a statement CSV, review normalized rows with duplicate/match highlighting, resolve classification, and confirm once. Confirmed rows become normal Ploutizo transactions (`expense`, `refund`, `settlement`) with full attribution. Skipped, invalid, and unprocessed rows remain in durable **import history** and **row-level provenance** after the temporary source file expires.

The feature supports known Canadian credit card export formats (TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine) plus a downloadable **Ploutizo normalized import format**. Import is available to all household members under the Transactions area, with server-side drafts, account-scoped duplicate detection, and batch undo.

## User Stories

1. As a household member, I want to import a credit card statement CSV, so that I do not have to manually re-enter every card transaction.
2. As a household member, I want to choose which credit card account an import file applies to before uploading, so that rows are attributed to the correct card.
3. As a household member, I want only non-archived credit card accounts to appear as import targets, so that I cannot accidentally import into chequing, savings, or archived cards.
4. As a household member with no credit cards, I want an empty state that directs me to create a credit card account, so that I can start importing once an account exists.
5. As a household member, I want the app to auto-detect which known credit card CSV format I uploaded, so that I do not have to manually map columns.
6. As a household member, I want upload to fail clearly when the file is corrupt, unrecognized, too large, or contains no data rows, so that I know the file itself cannot be processed.
7. As a household member, I want individual bad CSV lines to not fail the entire file, so that one malformed row does not block importing the rest of the statement.
8. As a household member, I want invalid rows shown in review with a reason, so that I understand what could not be parsed.
9. As a household member, I want a warning when the detected bank format may not match my selected account institution, so that I can catch wrong-account uploads without being blocked.
10. As a household member, I want to download an example CSV and format guide from the Import page, so that I can prepare files when my bank format is not directly supported.
11. As a household member, I want bill payment rows classified as **settlements**, so that card paydown activity affects **card balance** correctly.
12. As a household member, I want new bill payment settlements to require **Pay toward** selection, so that personal vs shared obligation is explicit.
13. As a household member, I want bill payment rows that match an existing settlement to be auto-suggested and skipped by default, so that I do not duplicate card payments.
14. As a household member, I want merchant refunds classified as **refunds**, so that net category spend is correct.
15. As a household member, I want purchases classified as **expenses**, so that card activity updates budgets and spend views correctly.
16. As a household member, I want merchant rules applied during import preview, so that descriptions and categories are pre-filled consistently.
17. As a household member, I want to override merchant rule suggestions during review without changing the underlying rule, so that one-off exceptions stay local to the import.
18. As a household member, I want imported expense and refund rows to default assignees from the card's account ownership, so that personal vs shared classification matches how the card is set up.
19. As a household member, I want to change assignees per row during review, so that I can correct attribution before confirm.
20. As a household member, I want category required for expenses before confirm, so that spend classification is always present for dashboards and budgets.
21. As a household member, I want linked refunds to inherit category and assignees from the original expense, so that refund classification matches the purchase.
22. As a household member, I want unlinked refunds to require an explicit category, so that orphan refunds still affect spend correctly.
23. As a household member, I want refund rows auto-suggested for linking to a same-card expense when confidence is high, so that common returns are faster to process.
24. As a household member, I want to confirm or override suggested refund links, so that bad links are never applied silently.
25. As a household member, I want settlement rows to show **Bill Payment** as their category in the transaction list, so that paydown rows are readable at a glance.
26. As a household member, I want settlement categories excluded from spend/budget calculations by transaction type, so that bill payments do not inflate expense totals.
27. As a household member, I want duplicate rows detected against existing transactions on the same card, so that re-importing statement periods is safe.
28. As a household member, I want **external id** used as the primary duplicate key when the bank provides one, so that duplicate detection is reliable across re-imports.
29. As a household member, I want fuzzy duplicate detection to use the raw bank description, so that cleaned names do not cause false matches.
30. As a household member, I want near-amount matches flagged for review, so that small rounding differences are visible without auto-skipping valid new rows.
31. As a household member, I want matched duplicate rows skipped by default, so that confirm does not create redundant transactions.
32. As a household member, I want to see why a row matched an existing transaction and what differs, so that I can trust skip recommendations.
33. As a household member, I want a "Skip all duplicates" control, so that I can quickly deselect all duplicate rows in a large batch.
34. As a household member, I want bulk category assignment on selected rows, so that I can classify many similar expenses efficiently.
35. As a household member, I want bulk assignee assignment on selected rows, so that I can fix attribution across many rows at once.
36. As a household member, I want select all / deselect all controls, so that I can manage large imports quickly.
37. As a household member, I want rows marked **needs review** to block confirm while selected, so that uncertain rows are not silently committed.
38. As a household member, I want only **resolved** selected rows to be confirmable, so that incomplete classification cannot create bad ledger data.
39. As a household member, I want to edit description, category, assignee, tags, and notes per row during review, so that I can fix rows before they become transactions.
40. As a household member, I want tags and notes optional at confirm, so that I can refine them later if needed.
41. As a household member, I want `raw_description` preserved on created transactions, so that I can always see the original bank memo alongside edited descriptions.
42. As a household member, I want an import draft to persist server-side if I navigate away, so that large reviews are not lost.
43. As a household member, I want only one active import draft per credit card account, so that overlapping imports for the same card do not create duplicate risk.
44. As a household member, I want to continue or discard an existing draft before starting a new import for the same card, so that the workflow is explicit.
45. As a household member, I want blocked drafts for archived cards visible but not actionable except discard, so that I understand why I cannot continue them.
46. As a household member, I want confirm to fully complete a draft in one step, so that imports do not remain in a partial limbo state.
47. As a household member, I want skipped and unprocessed rows recorded in import history, so that I can see what the CSV contained even if it was not imported.
48. As a household member, I want to use skipped row details to prefill a manual transaction later, so that I can handle edge cases without re-uploading the file.
49. As a household member, I want completed import history retained permanently, so that I have an audit trail after the CSV file expires.
50. As a household member, I want raw source row data available in a row details / source data view, so that I can audit what the bank file contained without cluttering the main table.
51. As a household member, I want the uploaded CSV retained temporarily after import, so that I can validate results shortly after confirm.
52. As a household member, I want temporary file retention controlled by deployment configuration, so that storage policy is a conscious ops decision.
53. As a household member, I want longer retention for in-progress drafts than completed imports, so that I have time to finish a large review.
54. As a household member, I want to undo a completed import batch, so that I can reverse a bad confirm without manually deleting many transactions.
55. As a household member, I want undo to soft-delete only transactions created by that batch and report skipped already-deleted rows, so that the operation is safe and transparent.
56. As a household member, I want import history to show created, skipped, duplicate, invalid, and unresolved counts, so that I understand batch outcomes.
57. As a household member, I want to stay on Import History after confirm with a success summary, so that I can verify the batch immediately.
58. As a household member, I want Import available as a Transactions submenu item, so that import is easy to find without displacing the main Transactions view.
59. As a household member, I want a main Import page showing all active drafts and recent import history, so that I can resume work or review recent activity quickly.
60. As a household member, I want a dedicated Import History page grouped by account and filterable, so that I can audit past imports by card.
61. As a household member, I want any household member to import for any household credit card, so that shared financial admin is not restricted by role.
62. As a household member, I want Amex statement amounts interpreted with the correct sign convention, so that positive amounts become expenses as expected for Canadian Amex exports.
63. As a household member, I want CIBC ISO dates and other issuers' MM/DD/YYYY dates parsed correctly, so that transaction dates are accurate.
64. As a household member, I want re-importing the same statement period to match prior imports by external id or fuzzy rules, so that I do not accumulate duplicate ledger rows.
65. As a household member, I want settlement duplicate matching to tolerate wider date differences than expenses/refunds, so that statement payment dates can match manually entered settlements.

## Implementation Decisions

### Scope and domain boundaries

- **Credit card only** in v1: no chequing, savings, investment, or multi-account-per-file imports.
- **Single-account import**: each upload is assigned to exactly one target credit card account before/during upload.
- **Import access**: any household member may import for any household credit card; no role restrictions.
- Imported rows become normal transactions using the existing transaction model and **TransactionForm** semantics.
- Spend and budget calculations remain governed by transaction type; **Bill Payment** category is for list readability on **settlement** rows only.

### Transaction classification

- Supported imported transaction kinds: `expense`, `refund`, `settlement` only.
- **Bill payment row** detection runs before merchant rules; merchant rules assign category/metadata but do not change transaction type.
- **Bill Payment** is a normal seeded category for all households; default bill-payment merchant rule may assign it.
- Category is required for `expense` and `refund` at confirm (validator + form alignment work required).
- **Linked refund** inherits category and assignees from original; **unlinked refund** requires explicit category.
- New **settlement** rows from bill payments require **Pay toward** unless matched to an existing settlement.
- **Import assignee default**: single card owner → personal transaction; multiple owners → shared transaction with equal split; merchant rule assignee overrides.

### Parsing and normalization layer

- Pure-function normalizers per supported format: TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine, plus Ploutizo normalized format.
- Format auto-detection from CSV contents; unrecognized format is a file-level failure.
- Amex CA sign inversion: positive = expense.
- CIBC dates `YYYY-MM-DD`; other supported formats `MM/DD/YYYY`.
- BOM stripping on all inputs.
- **Ploutizo normalized format** required columns: date, amount, description, type. Optional: external id, category, assignee hint, refund link hints, notes, tags.
- Invalid lines become **invalid import rows**; file succeeds if at least one row is processable or reviewable.

### Matching and duplicate resolution

- Run matching after upload/normalization; re-run when type, amount, date, account, refund link, or raw-description-relevant fields change.
- Duplicate scope: target credit card account only.
- Primary key: **external id** exact match when present.
- Secondary: same kind + same account + same amount + date rules + raw description similarity (Levenshtein < 0.2 after date+amount prefilter).
- Near-amount review threshold: <= $1.00 or <= 0.5% of amount, capped at $1.00.
- Expense/refund auto-resolve: same date; settlements: ±7 days when unique match.
- Matched rows are **skipped**, never mutate existing transactions.
- Only **resolved import row** selections may confirm.

### Draft, confirm, and history lifecycle

- Server-side drafts; **one active draft per credit card account**.
- Confirm closes draft fully — no partial draft state.
- Batch undo soft-deletes transactions with batch `import_batch_id`.
- Completed import history retained; schema soft-delete for future API only.

### File and provenance retention

- Temporary source file in S3-compatible object storage (R2 recommended).
- TTL env-configured with no in-app default; stamped per upload.
- Raw row provenance permanent; source data in row details panel.

### Schema and seed changes

- Extend `import_batches`; add `import_batch_rows`; add `external_id` on transactions.
- Seed **Bill Payment** category and default bill-payment merchant rule.
- Require category for expense/refund; allow category on settlement in validators/API.

### API and UI surfaces

- Draft CRUD, row patch, confirm, undo, format download.
- Import + Import History under Transactions; account-first flow; review stepper.

### Prerequisites

- Transaction validator updates must land with or before import finalize.
- Real credit card CSV fixtures required before locking normalizers.

## Testing Decisions

### Proposed test seams (highest first)

1. Credit card CSV normalizers package (pure functions + fixtures)
2. Import classification + matching module
3. Import batch service layer
4. Import API routes
5. Seed tests (Bill Payment category + merchant rule)
6. Import UI components

### Prior art

- `settlements.service.test.ts`, `transactions.test.ts`, `scope.test.ts`, `seeds.test.ts`, `SettleDialog.test.tsx`

## Out of Scope

Chequing/savings/investment import, multi-account files, manual column mapping, income/transfer/contribution CSV import, merchant rule creation from review, mutating matched transactions, batch re-processing skipped rows, role restrictions, in-app retention config, OFX/QFX, EQ Bank, UI delete of import history.

## Further Notes

- Design reference: `.planning/mockups/import.png`
- Roadmap phases: 5.1–5.4
- Env vars TBD: file TTLs, draft expiry, max size/rows, date windows, near-amount threshold
- Supersedes canceled issue PLO-38
