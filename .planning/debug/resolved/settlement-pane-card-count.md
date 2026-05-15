---
status: resolved
trigger: Outstanding settlement balance on dashboard shows 2 cards for everybody; clarify card count vs balance conditions
created: 2026-05-14T03:24:00Z
updated: 2026-05-15T00:00:00Z
---

## Current Focus

hypothesis: RESOLVED
test: `pnpm turbo typecheck --filter=web`; manual dashboard settlement pane
expecting: n/a
next_action: none — archive complete

## Symptoms

expected: Card subtitle reflects each member's settlement exposure (cards with balance), not identical household card count for all members
actual: Every member shows the same "2 cards" while balance is $0.00
errors: None
reproduction: Dashboard Settlement pane with multiple members and two household credit cards, all member balances zero

## Eliminated

- hypothesis: Balance rollup uses wrong account type filter
  evidence: rollup skips non credit_card accounts
  timestamp: 2026-05-14

## Evidence

- timestamp: 2026-05-14
  checked: apps/web/src/components/dashboard/SettlementSummaryPane.tsx
  found: creditCardCount from useGetAccounts for all member subtitles after dashboard-credit-cards-not-showing fix

- timestamp: 2026-05-14
  checked: .planning/debug/resolved/dashboard-credit-cards-not-showing.md
  found: Fix (4) intentionally used household CC count so the pane did not read empty when settlement rows were all zero

## Resolution

root_cause: The pane used a single **household** credit-card count from `useGetAccounts()` for every member’s subtitle, while balances were **per-member** rollups from `useGetSettlements()`. With two registered cards and $0 owed, every row showed “2 cards” identically.

fix: **Per-member semantics** — count only credit-card accounts where that member’s `balanceCents !== 0`; subtitle as card scope or omitted when none. **Design** — compact `Card size="sm"` column layout; household net / gross / credits in header; first-name rows; color on amount (due / credit / clear); removed redundant “Household · Exposure” eyebrow and all-caps column labels; **loading** — same structural shell as loaded content (header stack + two skeleton rows matched to `body-sm` / caption / avatar scale) to reduce CLS.

verification: `pnpm turbo typecheck --filter=web`

files_changed:

- apps/web/src/components/dashboard/SettlementSummaryPane.tsx
- .planning/sketches/001-settlement-summary-pane/ (optional design exploration)
- .planning/sketches/MANIFEST.md / themes/default.css (sketch scaffolding)

## Notes

- Member roles (Primary/Joint) and per-card names are not in GET /api/settlements; deferred unless API extends.
- Follow-up: if CLS remains when some members have no subtitle line vs two-line skeleton, reserve a min-height caption slot per row.
