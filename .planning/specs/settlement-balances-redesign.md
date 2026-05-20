<!-- generated-by: gsd-doc-writer -->

# Settlement balances + dashboard UI redesign

**Status:** Implementation-ready  
**Sources:** `CONTEXT.md`, ADR-0002 (authoritative), ADR-0001 (related / future)  
**Touches:** `apps/api/src/lib/queries/settlements.ts`, `apps/api/src/services/settlements.ts`, `packages/types`, `packages/validators`, dashboard card-balances + settle + settlement pane

---

## 1. Summary

### Problem

Settlement balances today aggregate **per assignee row** on qualifying transactions (`fetchSettlementAggregateRows` joins `transaction_assignees` and sums split amounts). That conflates personal and shared activity: a multi-assignee expense appears as partial amounts on each member, and `GET /api/settlements` exposes a single `balanceCents` per member that mixes both kinds. `POST /api/settlements` takes `payerMemberId` and always writes a single assignee, so shared settlements are impossible. The UI labels the settle target “Settling for”, omits a **Shared** settle path, filters the action menu to non-zero members only, and rolls up sidebar/pane totals from the combined member balance.

### Goal

Align ledger math, API, and dashboard UI with the domain in `CONTEXT.md` and ADR-0002:

- **Card balance** = sum of all members’ **personal** balances + **shared** balance (per card).
- Classify qualifying activity by **assignee count** (1 → personal, 2+ → shared).
- **GET** returns `personalBalanceCents`, `sharedBalanceCents`, `sharedParticipantIds`; drop combined `balanceCents`.
- **POST** accepts `assignees: [{ memberId }]`; server applies LRM for 2+ assignees; drop `payerMemberId`.
- Card Balances grid (**layout B**), Settlement pane, and Settle flow match display/persistence rules in `CONTEXT.md`.

### Non-goals

| Item | Notes |
|------|--------|
| Person-to-person settlement pane | Mockup exploration only; no net-between-members UI |
| Period-filtered card/settlement balances | Dashboard date picker stays analytics-only; balances are **All time** |
| Editable shared split (v2) | Equal LRM split only; no custom %/amounts on shared settle |
| ADR-0001 transaction allowlist matrix | Hardening follow-up; not part of this slice |
| Dashboard KPI / period charts | Unchanged |

---

## 2. Domain model

### Balances (per credit card)

| Term | Definition | Scope |
|------|------------|--------|
| **Card balance** | Amount owed to issuer (signed cents: + owed, − credit) | One per card |
| **Personal balance** | Member’s share from **personal transactions** only | One per (card, member) |
| **Shared balance** | Household share from **shared transactions** only | One per card |

**Card balance identity (invariant):**

```
totalBalanceCents = Σ members.personalBalanceCents + sharedBalanceCents
```

Hold after every qualifying expense, refund, and settlement. Overpayments may drive personal or shared negative (credit).

### Classification (expenses, refunds, settlements)

| Assignee count on transaction | Type | Balance effect |
|------------------------------|------|----------------|
| 1 | Personal transaction | Full signed effect → that member’s **personal** balance |
| 2+ | Shared transaction | Full signed effect → card **shared** balance only (assignee split amounts are bookkeeping; balance view does not allocate shared per member) |

**Account ownership** (`account_members` / `owners`) does **not** affect this classification.

### Qualifying transaction types

Only on **credit_card** accounts (settlement scope unchanged):

- `expense` → increases obligation (+)
- `refund` → decreases obligation (−)
- `settlement` → decreases obligation (−)

`income`, `transfer`, `contribution` never affect settlement balances. (ADR-0001 will enforce at write time later.)

### Settlement write classification (mirror expenses/refunds)

| POST `assignees` length | Reduces |
|-------------------------|---------|
| 1 | That member’s **personal** balance on the card |
| 2+ | **Shared** balance; amount split with **LRM** across listed members (server-side; use shared util in `packages/` — **do not** import `apps/web/src/lib/lrm.ts` from API) |

For 2+ assignees: assignee **set** must equal `sharedParticipantIds` for that card (same members, any order). Reject otherwise.

### Shared participants (per card)

Member ids who appear on **at least one shared transaction** on that card, where:

- Same scope as balance query (all non-deleted qualifying txs on card, org-scoped, non-archived account)
- Member must be a **current** household `org_members` row
- **Union** of assignee ids across all shared qualifying txs on that card (deduped) — not “every shared tx must include the same set of members”

Used for: shared settle validation, action menu “Shared” row, Pay toward Shared option.

### Signed amounts (display + math)

- **Owed:** positive cents  
- **Credit (overpaid):** negative cents, `text-success` in UI  
- Never use `Math.abs` for balance **meaning**; abs only where a positive payment input is collected

---

## 3. API changes

### 3.1 GET `/api/settlements` — response shape (breaking)

**Remove** from each member row: `balanceCents`.

**Add** per account:

| Field | Type | Description |
|-------|------|-------------|
| `sharedBalanceCents` | `number` | Shared bucket signed cents |
| `sharedParticipantIds` | `string[]` | Derived participants (sorted stable, e.g. `memberId` asc) |

**Change** each member row:

| Field | Type | Description |
|-------|------|-------------|
| `personalBalanceCents` | `number` | Personal bucket only |

`totalBalanceCents` remains card-level (must equal identity above).

**Example (one card, two members):**

```json
{
  "accounts": [
    {
      "account": { "id": "…", "name": "Amex", "type": "credit_card", "owners": [], "statementDueDay": 15, "institution": null, "lastFour": "1234" },
      "totalBalanceCents": 15000,
      "sharedBalanceCents": 5000,
      "sharedParticipantIds": ["member-a", "member-b"],
      "members": [
        { "member": { "id": "member-a", "name": "Tamir", "avatarUrl": null }, "personalBalanceCents": 10000 },
        { "member": { "id": "member-b", "name": "Emily", "avatarUrl": null }, "personalBalanceCents": 0 }
      ],
      "dueDate": "2026-05-25",
      "status": "due_soon"
    }
  ]
}
```

**Query implementation notes** (`fetchSettlementBalances` / aggregates):

1. Load qualifying transactions per card with assignee count (or join assignees grouped by `transactionId`).
2. **Personal txs:** attribute full signed amount to the sole assignee’s `personalBalanceCents`.
3. **Shared txs:** attribute full signed amount once to `sharedBalanceCents` (do not distribute to members in aggregation).
4. **Settlements:** classify by assignee count on the settlement transaction row (after POST writes 1 or N assignees).
5. Credit cards: still emit every household member with `personalBalanceCents: 0` when no personal activity; always include card row even if all zeros.

Non–credit-card accounts: keep existing omit-all-zero behavior unless product says otherwise (unchanged).

### 3.2 POST `/api/settlements` — request shape (breaking)

**Remove:** `payerMemberId`

**Add:**

```json
{
  "accountId": "uuid",
  "counterpartAccountId": "uuid",
  "amountCents": 11000,
  "date": "2026-05-19",
  "notes": "optional",
  "assignees": [{ "memberId": "uuid" }]
}
```

| Rule | Behavior |
|------|----------|
| `assignees` | Required, min 1; each `memberId` UUID, unique, all in org |
| `amountCents` | Positive int (unchanged) |
| Length = 1 | Single assignee row, `amountCents` = transaction amount |
| Length ≥ 2 | `lrmSplit(amountCents, memberIds)` → assignee rows; reject if set ≠ `sharedParticipantIds` |
| Archived account / bad FK | Existing 400/404 semantics |

Server still sets `type: 'settlement'`, description `Settlement: {account.name}`, delegates to `createTransaction`.

### 3.3 Validation summary

| Check | Error |
|-------|-------|
| `assignees` empty | 400 |
| Duplicate `memberId` in `assignees` | 400 |
| Member not in org | 404 |
| Multi-assignee set ≠ shared participants | 400, clear message |
| `counterpartAccountId` === `accountId` | 400 (existing) |

---

## 4. UI: Card Balances grid

**Layout B** — column order (unchanged positions; rename + content change):

| # | Column | Notes |
|---|--------|--------|
| 1 | Card | Unchanged |
| 2 | Owner | `account.owners` only; “Shared” = multiple **account** owners, not balance semantics |
| 3 | Balance | `totalBalanceCents`, signed formatting |
| 4 | Due | Unchanged |
| 5 | Status | Unchanged |
| 6 | **Attribution** | Was “Split by member”; personal chips + **Shared** chip + segment bar |
| 7 | Action | Settle dropdown only |

### Section chrome

- Title: **Card Balances**
- Subtitle: **All time** (`text-muted-foreground` caption under title)
- **Remove** `CardBalancesHeaderLegend` from header (delete usage; file can remain until cleanup)

### Attribution column

**Slices (segment bar + chips):**

| Slice | Source | Shown when |
|-------|--------|------------|
| Member | `personalBalanceCents` | `!== 0` only |
| Shared | `sharedBalanceCents` | `!== 0` only |

- Order: members by stable `memberId` asc; **Shared last**
- Bar: one segment per non-zero slice; weights = `abs(balance)`; min width for non-zero
- Chips: name + **signed** currency (not abs-only); credit → success styling
- **Shared** chip/segment: neutral token (e.g. `bg-muted` / dedicated `--shared-attribution`), **not** member palette index, **not** `text-muted-foreground` as if disabled
- **3+ household members:** chips `flex-wrap`, no truncation of names/amounts

### Footer

- Keep footer aligned under **Balance** column (colspan from sketch density rules)
- Total = sum of `totalBalanceCents` across visible credit card rows (same as today)

### Data wiring

- `CardBalancesBreakdownCell` consumes `personalBalanceCents` + `sharedBalanceCents` (not per-member combined)
- `buildMemberChartVisualSlots` applies only to **member** slices; shared uses fixed neutral class

---

## 5. UI: Settlement pane

### Main pane (`SettlementSummaryPane`)

- Title: **Settlement**
- Subtitle: **All time** (same caption treatment as Card Balances)

**Household rollup** (header area, when credit cards exist):

| Line | Value |
|------|--------|
| Per member | Sum of `personalBalanceCents` across all credit cards |
| Shared (household) | Sum of `sharedBalanceCents` across all credit cards |
| Card total | Sum of `totalBalanceCents` across credit cards |

Display signed formatting consistent with grid. When `hasHouseholdCreditCards`, always show the household **Shared** rollup line (value may be $0 or credit).

**Member list:** unchanged layout; **Balance** column = personal rollup only (not shared).

`useCreditCardMemberRollup` → rename/replace: aggregate `personalBalanceCents` only; add `sharedRollupCents` + `cardTotalCents` for header.

### Sidebar (`SidebarMembersSection` on `/dashboard`)

- Subline per member: sum of **personal** balances across cards only
- Do **not** include shared in sidebar totals

---

## 6. UI: Settle flow

### Entry: dropdown only

- **Settle** button opens `DropdownMenu` only — never opens dialog directly
- Dialog opens only after choosing a menu item

### Menu items

| Item | Opens dialog with |
|------|-------------------|
| Each household member | Pay toward = that member (personal) |
| **Shared** | Pay toward = Shared |

- List **all** members + Shared always (even if balance 0 or credit)
- Menu secondary text: **signed** balance for that target (personal or shared)
- Sort: optional stable `memberId`; Shared last (menu does not need “largest balance first” if it conflicts with CONTEXT — prefer stable id order)

Update `CardBalancesSettleClickHandler` to carry pay-toward target:

```ts
type PayTowardTarget =
  | { kind: 'member'; memberId: string }
  | { kind: 'shared' };
```

### Settle dialog

| UI label | Field / behavior |
|----------|------------------|
| **Pay toward** | Replaces “Settling for”; radio/choice list: every member + Shared |
| Row content | Name + signed balance (personal or shared) |
| Amount | Prefill: if target balance **> 0**, prefill that amount; if ≤ 0, prefill **0** (user enters payment) |
| Paid from | Default on open only (see below); user edits persist across Pay toward changes |
| Date / notes | Default today; notes optional |

**Field persistence** (when user changes Pay toward inside dialog):

| Field | On pay-toward change |
|-------|----------------------|
| Amount | Recompute from prefill rules only |
| Paid from | Keep user edits |
| Date | Keep user edits |
| Notes | Keep user edits |

**Paid-from defaults on open** (from action menu item):

| Pay toward | Default `counterpartAccountId` |
|------------|-------------------------------|
| Member | First non-archived `chequing` / `savings` / `prepaid_cash` account where that member is the sole owner (`owners.length === 1` and includes member); else first allowed account in list |
| Shared | First non-archived account with `owners.length >= 2`, prefer `type === 'chequing'`; else first allowed chequing/savings/prepaid |

**Submit:** map Pay toward → `assignees`:

- Member → `[{ memberId }]`
- Shared → `sharedParticipantIds.map(id => ({ memberId: id }))`

Rename form field `payerMemberId` → `payToward` (enum member id | `'shared'`) in `settleFormSchema` / `SettleFormValues`.

### Files to touch

- `CardBalancesActionCell.tsx` — Shared item; show all members; signed amounts
- `SettleDialog.tsx`, `SettlePayerField.tsx` → **Pay toward** copy; shared row
- `getSettleInitialValues.ts` — pay-toward target + prefill + paid-from defaults
- `SettleMemberRadioList.tsx` — include Shared pseudo-row with `sharedBalanceCents`
- `Dashboard.tsx` — pass `PayTowardTarget` instead of `initialPayerMemberId`

---

## 7. Display & formatting

| Surface | Rule |
|---------|------|
| Money | `formatCurrency` on signed cents where balance is shown |
| Credit | Negative cents → success text class |
| Shared attribution | Neutral color token; visually distinct from members |
| 3+ members | Wrap chips; bar segments for all non-zero slices |
| Pay toward list | No cap; all members + Shared |

Extract shared formatting helper if duplicated (grid chips, menu, dialog) — single `formatSignedBalanceCents(cents)` returning `{ text, tone }`.

---

## 8. Migration / breaking changes

### Types (`packages/types`)

- `SettlementMemberRow.balanceCents` → `personalBalanceCents`
- `SettlementAccountRow`: add `sharedBalanceCents`, `sharedParticipantIds`

### Validators (`packages/validators/src/settlements.ts`)

- `createSettlementSchema`: `assignees` array; remove `payerMemberId`

### API consumers (update in same PR)

| Location | Change |
|----------|--------|
| `apps/api/src/lib/queries/settlements.ts` | New aggregation |
| `apps/api/src/services/settlements.ts` | Shape GET; POST LRM + validation |
| `apps/api/src/__tests__/settlements.*.test.ts` | Fixtures |
| `apps/web/src/lib/data-access/settlements/*` | Types flow from validators/types |
| `apps/web/src/components/dashboard/**` | All balance field reads |
| `apps/web/src/components/SidebarMembersSection.tsx` | Personal-only rollup |
| `packages/types` consumers in tests/stories | Grep `balanceCents` on settlement types |

### Compatibility

- **No** API versioning; breaking change coordinated with web deploy
- Mobile/other clients: none known

---

## 9. Implementation checklist

Ordered for minimal rework:

1. **API query** — Rewrite `fetchSettlementAggregateRows` / `fetchSettlementBalances` for personal vs shared classification; compute `sharedParticipantIds` per card.
2. **API GET service** — Map rows to new `SettlementAccountRow` shape; verify identity in tests.
3. **Shared LRM util** — Extract `lrmSplit` to a package consumed by API + web (e.g. `packages/utils` or duplicate in API with shared tests); no `apps/api` → `apps/web` import.
4. **API POST service** — `assignees` + LRM + shared participant validation; remove `payerMemberId`.
5. **Validators** — `createSettlementSchema` update.
6. **Types** — `packages/types` settlement interfaces.
7. **API tests** — `settlements.service.test.ts`, `settlements.route.test.ts` (personal-only, shared-only, mixed, overpay, invalid shared set).
8. **Web data layer** — `useCreateSettlement` payload; ensure `counterpartAccountId` still sent.
9. **Rollup hook** — `useCreditCardMemberRollup` personal + shared + card total; `SettlementPaneHeader.tsx`.
10. **Card Balances grid** — Attribution column header rename in `buildCardBalancesColumns.tsx`; All time label; remove header legend; `CardBalancesBreakdownSegmentBar.tsx`, `CardBalancesBreakdownMemberChips.tsx`, `CardBalancesBreakdownCell.tsx`; footer unchanged logic on `totalBalanceCents`.
11. **Action cell + handler types** — `types.ts` (`PayTowardTarget`); menu Shared + all members; `CardBalancesActionCell.tsx`.
12. **Settle dialog** — `SettleDialog.tsx`, `SettlePayerField.tsx`, `SettleMemberRadioList.tsx`, `settleFormSchema.ts`, `getSettleInitialValues.ts`; Pay toward, persistence, POST mapping.
13. **Settlement pane + sidebar** — `SettlementSummaryPane.tsx`, `SettlementPaneHeader.tsx`, `SettlementMemberListRow.tsx`; `SidebarMembersSection.tsx` personal-only.
14. **Web tests** — `CardBalancesActionCell.test.tsx`, `getSettleInitialValues.test.ts`, `settleFormSchema.test.ts`, `packages/validators/src/__tests__/settlements.test.ts`, breakdown/legend tests.
15. **Manual UAT** — 2-member and 3+ member households; shared expense → shared settle; personal settle; overpay credit; change pay toward mid-dialog.

---

## 10. Out of scope / follow-ups

| Follow-up | Reference |
|-----------|-----------|
| Account-type × transaction-type allowlist | ADR-0001 — matrix TBD in validators |
| Dashboard period charts / stat cards | Period picker stays separate from settlements |
| Person-to-person settlement summary | Future pane; not this redesign |
| Custom shared split ratios on settle | v2 |
| `GET /api/settlements` for non–credit-card account types | Behavior unchanged; revisit if product expands |
| Forward `counterpartAccountId` persistence audit | Already in schema; verify E2E if separate bug |

---

## Related reference

- **ADR-0001:** Defensive transaction allowlists — prevents invalid types on credit cards; complements qualifying-type set but does not change attribution rules.
- **Sketch skill:** `.cursor/skills/sketch-findings-ploutizo/` — grid density and dropdown settle entry still apply; recipient-first / direct modal entry **superseded** by Pay toward + dropdown-only.
