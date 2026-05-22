---
status: resolved
trigger: '/gsd-debug — dashboard shows no credit cards / 0 cards while Accounts lists 2 credit cards; settlement pane wrong'
created: 2026-05-10T00:00:00Z
updated: 2026-05-10T00:00:00Z
---

## Current Focus

hypothesis: RESOLVED
test: API unit tests + `pnpm turbo typecheck --filter=web`; manual dashboard with registered CCs and no qualifying tx
expecting: n/a
next_action: none — archive complete

## Symptoms

expected: Dashboard Card Balances + settlement summary reflect registered credit card accounts and sensible $0 / empty copy
actual: Dashboard showed 0 cards, empty grid, “across 0 cards” despite two active Credit Card accounts on Accounts
errors: None surfaced in UI — data omission
reproduction: Household with credit_card accounts and no (or only non-settlement) activity on those cards

## Eliminated

- hypothesis: Dashboard filter `account.type === 'credit_card'` mismatches DB enum
  evidence: `packages/db`/validators use `credit_card`; same string as Accounts
  timestamp: 2026-05-10

- hypothesis: Dashboard reads wrong endpoint vs Accounts
  evidence: Dashboard uses `GET /api/settlements` only for card rows, not `GET /api/accounts`
  timestamp: 2026-05-10

## Evidence

- timestamp: 2026-05-10
  checked: `apps/api/src/lib/queries/settlements.ts` — `fetchSettlementBalances`
  found: Query starts `FROM accounts INNER JOIN transactions` — accounts with no expense/refund/settlement rows never appear

- timestamp: 2026-05-10
  checked: `apps/api/src/services/settlements.ts` — `getSettlementBalances`
  found: D-08 skipped any account where every member balance was 0 — compounded empty response for inactive cards

## Resolution

root_cause: (1) Settlement balance SQL only returned accounts that already had qualifying transactions (inner join). (2) Service layer omitted all-zero balances (D-08), so even partial noise would hide zero-net cards. (3) Settlement sidebar counted only cards with non-zero per-member splits (“across 0 cards”) and did not use registered account list.

fix: (1) **API query** — For `credit_card` accounts, emit every (account × org member) pair with balances from aggregates or 0; append non–credit-card rows from the original aggregate. (2) **API service** — Keep all-zero **credit_card** accounts; continue omitting all-zero for other account types. (3) **Tests** — Adjust D-08 fixture to `chequing`; add credit-card all-zero inclusion case. (4) **Web** — `SettlementSummaryPane`: `useGetAccounts` for CC count; short subtitles; muted `$0.00`; no CC → “Add a card” + `-`.

verification: `pnpm test`, `pnpm turbo typecheck --filter=api`, `pnpm turbo typecheck --filter=web`

files_changed:

- apps/api/src/lib/queries/settlements.ts
- apps/api/src/services/settlements.ts
- apps/api/src/**tests**/settlements.service.test.ts
- apps/web/src/components/dashboard/SettlementSummaryPane.tsx
