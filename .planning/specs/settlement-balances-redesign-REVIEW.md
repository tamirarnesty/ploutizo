# Review: settlement-balances-redesign.md

**Reviewed:** 2026-05-19  
**Spec:** `.planning/specs/settlement-balances-redesign.md`  
**Authority:** `CONTEXT.md`, `docs/adr/0002-settlement-assignees-classify-personal-shared.md`

## Verdict: **PASS WITH NOTES**

The spec is internally coherent, matches CONTEXT and ADR-0002 on attribution rules and API shapes, and correctly diagnoses current code. It is implementation-ready after addressing a few gaps (Settlement pane “All time”, shared LRM placement, paid-from default algorithm) and one spec path inaccuracy (server cannot import `apps/web` LRM).

---

## Aligned

- **Assignee-count classification** (1 → personal, 2+ → shared; account ownership excluded) matches `CONTEXT.md` and ADR-0002.
- **GET breaking shape:** `personalBalanceCents`, `sharedBalanceCents`, `sharedParticipantIds`; remove `balanceCents` — matches ADR-0002 and grill decisions.
- **POST breaking shape:** `assignees: [{ memberId }]` only; drop `payerMemberId`; multi-assignee set must equal `sharedParticipantIds`; server LRM for 2+ — matches ADR-0002 and grill decisions.
- **Card balance identity** `totalBalanceCents = Σ personal + shared` — matches CONTEXT invariant.
- **Problem statement** accurately describes today’s per-assignee aggregation in `fetchSettlementAggregateRows` (sums `transactionAssignees.amountCents` per member, conflating shared splits).
- **Non-goals:** no period-filtered settlement balances; no person-to-person pane; ADR-0001 deferred — consistent with CONTEXT and ADR-0001.
- **Grid:** omit $0 chips, signed amounts + credit styling, Shared last, neutral shared styling, rename column to Attribution, remove header legend — matches CONTEXT display rules.
- **Settle:** dropdown-only entry, Pay toward label, list all members + Shared, prefill amount only when balance > 0, field persistence (amount only on pay-toward change) — matches CONTEXT; current `SettleDialog` partially implements persistence but uses wrong prefill (`Math.abs`).
- **Settlement pane direction:** personal-only member list + household rollup of personal / shared / card total (not member-to-member net) — matches grill decision; replaces today’s `net owed` header in `SettlementPaneHeader.tsx`.
- **Sidebar:** personal-only rollup — matches CONTEXT.
- **File touch list** for API core (`settlements.ts` query + service, validators, types) is correct.

---

## Gaps (missing from spec but required)

1. **Settlement pane “All time” label** — `CONTEXT.md` requires **All time** under both Card Balances and **Settlement** section titles. Spec §4 adds subtitle for Card Balances only; §5 omits `SettlementSummaryPane` / `SettlementPaneHeader` subtitle. Add explicit UI task.
2. **Server-side LRM location** — Spec §3.2 / §81 references `apps/web/src/lib/lrm.ts` for server behavior. API cannot depend on `apps/web`. Checklist should add: extract `lrmSplit` to a shared package (e.g. `packages/utils` or `packages/validators`) or duplicate in `apps/api` with shared tests.
3. **Paid-from default for Shared** — Spec §299 states multi-owner household account for Pay toward Shared. No existing helper; `getSettleInitialValues.ts` only picks `firstSourceId` from chequing/savings/prepaid. Specify selection rule (e.g. account with 2+ `owners`, prefer chequing) or point to existing account-selection utility.
4. **Implementation file list incomplete** — Add to checklist:
   - `apps/web/src/components/dashboard/useCreditCardMemberRollup.ts`
   - `apps/web/src/components/dashboard/SettlementPaneHeader.tsx`
   - `apps/web/src/components/dashboard/card-balances/buildCardBalancesColumns.tsx` (header “Split by member” → “Attribution”)
   - `apps/web/src/components/dashboard/card-balances/CardBalancesBreakdownSegmentBar.tsx`
   - `apps/web/src/components/dashboard/card-balances/CardBalancesBreakdownMemberChips.tsx`
   - `apps/web/src/components/dashboard/card-balances/types.ts` (`PayTowardTarget`, handler signature)
   - `apps/web/src/components/dashboard/settleFormSchema.ts`
   - `apps/web/src/components/dashboard/settle-dialog/SettleMemberRadioList.tsx`
   - `packages/validators/src/__tests__/settlements.test.ts`
5. **`sharedParticipantIds` query definition** — Spec §86–91 is clear in prose; add one sentence that participants are the **union** of member ids on shared qualifying txs (deduped), not “every member on every shared tx must include all participants” (avoid implementer misreading as clique detection).
6. **Settlement pane shared line when zero** — Spec §252 allows two behaviors (“show even when zero” vs “prefer show when any card has shared activity”). Pick one default to match CONTEXT (CONTEXT does not require hiding; recommend always show Shared line when `hasHouseholdCreditCards`).

---

## Conflicts (spec vs CONTEXT or ADRs)

| Item | Severity | Notes |
|------|----------|--------|
| ADR-0002 `status: proposed` | Low | Spec cites ADR as authoritative; acceptable for implementation planning but accept ADR before merge if your process requires `accepted`. |
| Settlement header “net owed” | None | Spec intentionally replaces current `useCreditCardMemberRollup` net-owed model; not a CONTEXT contradiction. |
| Sketch skill “recipient-first modal” | Low | `.cursor/skills/sketch-findings-ploutizo/` still describes recipient-first + direct modal patterns; spec correctly supersedes with Pay toward + dropdown-only. Update skill when implementing to avoid agent drift. |

No material conflicts with CONTEXT or ADR-0002 on domain rules.

---

## Inaccuracies (spec vs codebase)

These are **current code** vs **spec target** — expected for a redesign spec, but implementers should not assume any of the following already exist.

| Spec assumption / claim | Actual code | Path |
|-------------------------|-------------|------|
| `personalBalanceCents`, `sharedBalanceCents`, `sharedParticipantIds` on GET | Only `balanceCents` per member | `packages/types/src/index.ts`, `apps/api/src/services/settlements.ts` |
| POST `assignees` | `payerMemberId` only | `packages/validators/src/settlements.ts`, `createSettlement` in `apps/api/src/services/settlements.ts` |
| Balances by assignee **count** on transaction | Sums per assignee **row** | `apps/api/src/lib/queries/settlements.ts` (`fetchSettlementAggregateRows`) |
| `totalBalanceCents` = personal + shared | `sum(member.balanceCents)` | `apps/api/src/services/settlements.ts` L78–80 |
| Settle menu: all members + Shared | Filters `balanceCents !== 0`; no Shared | `CardBalancesActionCell.tsx` L41–43, L76 |
| Signed balance in menu/chips | `formatCurrency(Math.abs(...))` | `CardBalancesActionCell.tsx` L98, `CardBalancesBreakdownMemberChips.tsx` L51 |
| Chips omit $0 | Renders all members in bar/chips | `CardBalancesBreakdownSegmentBar.tsx`, chips component |
| Pay toward / Shared in dialog | “Settling for”; members only | `SettlePayerField.tsx` L26, `SettleMemberRadioList.tsx` |
| Amount prefill if owed > 0 only | `Math.abs(balanceCents)` even for credit | `getSettleInitialValues.ts` L24, `SettleDialog.tsx` L139–141 |
| Dropdown-only settle | Menu exists; handler opens dialog with member (OK) but menu filters members | `Dashboard.tsx` L46–51, `CardBalancesActionCell.tsx` |
| Settlement pane: personal + shared + card total | `net owed` from combined member balances | `SettlementPaneHeader.tsx`, `useCreditCardMemberRollup.ts` |
| Sidebar includes shared | Sums `balanceCents` (combined) | `SidebarMembersSection.tsx` L76–82 |
| Header “All time” | `CardBalancesHeaderLegend` in header, no All time caption | `card-balances/CardBalancesGrid.tsx` L70 |
| Column “Attribution” | Header still “Split by member” | `buildCardBalancesColumns.tsx` L108 |
| Server `lrmSplit` | Not in API; only `apps/web/src/lib/lrm.ts` | `apps/web/src/lib/lrm.ts` |

**Spec path note:** §81 “`apps/web/src/lib/lrm.ts` pattern, server-side” is correct as a **pattern**, not as an import path for `apps/api`.

---

## Grill decisions capture

| Decision | In spec? |
|----------|----------|
| Assignee count only (not account ownership) | Yes §58–64 |
| GET: personal/shared/sharedParticipantIds; drop balanceCents | Yes §3.1 |
| POST: assignees only; drop payer; server LRM 2+ | Yes §3.2 (add shared LRM package task) |
| Multi-assignee must match sharedParticipantIds | Yes §83, §176, §188 |
| All-time balances; period picker not settlements | Yes §32; **partial** — Settlement title label missing |
| Grid: omit $0 chips; signed credit; member + Shared bar | Yes §213–226 |
| Pane: card total + personal per member + shared | Yes §244–256 |
| Settle: dropdown only; Pay toward; persistence | Yes §265–308 |
| Menu/dialog: all members + Shared | Yes §279, §335 |
| Prefill amount only when owed > 0 | Yes §297, §305 |

All grill decisions are captured; one UI detail (Settlement **All time**) needs a spec line.

---

## Recommended spec edits (prioritized)

1. **P0 — §5 Settlement pane:** Add subtitle **All time** under Settlement title (`SettlementSummaryPane` / header), same treatment as Card Balances §208–210.
2. **P0 — §3.2 / checklist step 3:** Replace “use `apps/web/src/lib/lrm.ts`” with “extract `lrmSplit` to shared package consumed by API + web” (or document copy + test parity in API).
3. **P1 — §6:** Document paid-from default algorithm for `kind: 'shared'` (multi-owner account selection).
4. **P1 — §9 checklist:** Expand web file list (see Gaps §4); add `buildCardBalancesColumns` header rename.
5. **P2 — §252:** Remove optional wording; state: show household Shared rollup line whenever `hasHouseholdCreditCards` (value may be $0).
6. **P2 — §86–91:** Clarify `sharedParticipantIds` = union of members on any shared qualifying transaction on that card.
7. **P3 — Related reference:** Note sketch skill superseded for settle entry (dropdown-only, Pay toward).

---

## Internal consistency (spec-only)

- **Minor:** §252 “optional: hide at exactly 0” vs §248 “prefer show” — resolve to single rule (recommend always show when cards exist).
- **Minor:** §281 menu sort allows stable `memberId` vs current “largest balance first”; spec defers to CONTEXT — consistent if implementer follows CONTEXT over sketch sort.
- **No contradictions** between §2 domain model and §3 API or §4–6 UI.
