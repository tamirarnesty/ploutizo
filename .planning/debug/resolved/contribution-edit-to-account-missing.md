---
status: resolved
slug: contribution-edit-to-account-missing
trigger: "when editing a Contribution transaction, the edit form opens but is missing the \"To\" account being set, which is changing the description and causing the form to appear dirty"
created: 2026-04-22
updated: 2026-04-22
---

## Symptoms

- **expected:** Edit form pre-fills the "To" account (e.g. FHSA) from the saved Contribution transaction
- **actual:** "To" field shows "Select account" (empty); description locked template renders as "Contribution from Savings to …" instead of "Contribution from Savings to FHSA", so the form appears dirty immediately on open
- **errors:** None reported
- **timeline:** Unknown — may be a regression from recent transaction table redesign work on branch gsd/phase-03.4.1-transaction-table-redesign
- **reproduction:** Open edit form on any Contribution transaction that has a "To" account set

## Current Focus

hypothesis: Two bugs working together — the Zod schema excluded counterpartAccountId from contribution, so toApiPayload omitted it from the payload, and the server service explicitly nulled it for contribution on every update.
test: confirmed via code trace
expecting: counterpartAccountId stored and round-tripped correctly for contribution after fix
next_action: complete
reasoning_checkpoint: buildDefaultValues correctly reads transaction.counterpartAccountId ?? '' — pre-fill was empty because the value was never stored (nulled on save by server)
tdd_checkpoint:

## Evidence

- timestamp: 2026-04-22T00:00:00Z
  file: packages/validators/src/transactions.ts
  finding: contributionTransactionSchema did not include counterpartAccountId — the field was simply absent from the contribution Zod variant

- timestamp: 2026-04-22T00:00:00Z
  file: apps/api/src/services/transactions.ts:146
  finding: "if (!['transfer', 'settlement'].includes(data.type))" — contribution not in the list, so counterpartAccountId was set to null in the DB on every contribution save/update

- timestamp: 2026-04-22T00:00:00Z
  file: apps/web/src/components/transactions/hooks/useTransactionForm.ts:90-91
  finding: toApiPayload contribution case returned bare base object without counterpartAccountId — even if schema had allowed it, the client never sent it

## Eliminated

- buildDefaultValues: correctly reads `transaction.counterpartAccountId ?? ''` — the pre-fill logic was fine; the problem was upstream (value never persisted)
- API route validation gate: uses `'counterpartAccountId' in data` check — already correct once schema includes the field

## Resolution

root_cause: contributionTransactionSchema in the Zod validator excluded counterpartAccountId entirely. As a result, toApiPayload never sent it in the payload, and the server service's WR-01 null-coercion block explicitly set counterpartAccountId=null for any type not in ['transfer','settlement']. Every contribution save therefore wiped the "To" account from the DB, so the edit form always loaded with an empty field.
fix: (1) Added counterpartAccountId (optional uuid) to contributionTransactionSchema. (2) Added 'contribution' to the preserved-types list in services/transactions.ts:146. (3) Changed toApiPayload contribution case to spread counterpartAccountId alongside base.
verification: TypeScript typecheck shows no new errors introduced. Pre-existing errors in webhooks.ts and reui base components are unrelated.
files_changed:
  - packages/validators/src/transactions.ts
  - apps/api/src/services/transactions.ts
  - apps/web/src/components/transactions/hooks/useTransactionForm.ts
  - apps/api/src/routes/transactions.ts (comment update only)
