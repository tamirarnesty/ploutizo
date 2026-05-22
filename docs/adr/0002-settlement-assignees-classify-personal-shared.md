---
status: accepted
---

# Settlement assignees classify personal vs shared balances

Card balances split into personal (single-assignee activity) and shared (multi-assignee activity) per card. Settlement payments use the same rule: a settlement with one assignee reduces that member’s personal balance; a settlement with two or more assignees reduces shared balance, with the payment amount split equally across the listed members (largest-remainder on cents).

`POST /api/settlements` accepts `assignees: [{ memberId }]` only (amounts computed server-side in v1). `payerMemberId` is removed. For multi-member settlements, the server rejects assignee sets that do not match the card’s derived shared participants.

`GET /api/settlements` returns per member `personalBalanceCents`, per account `sharedBalanceCents` and `sharedParticipantIds`, and `totalBalanceCents`. The former per-member `balanceCents` (personal + shared combined) is removed.

This mirrors expense/refund classification and avoids a second attribution model on write.

## Considered options

| Option | Rejected because |
|--------|------------------|
| Keep summing per-assignee rows for display (status quo) | Multi-assignee expenses look like each member “owns” part of the card; shared obligation is invisible and totals mix personal + shared on one member line. |
| `payToward: member \| 'shared'` on POST; server picks assignees | Extra API vocabulary parallel to transactions; `assignees[]` length already classifies the payment the same way as expenses. |
| Client sends `assignees` with `amountCents` per member (client-driven split) | v1 only needs equal shared splits; client could submit wrong splits; server LRM keeps write path authoritative. Deferred editable splits to a later API extension. |
| Shared settle split by **account owners** | Most credit cards are single-owner with shared expenses; one assignee would reduce personal only and leave shared balance wrong. |
| Shared settle split by **all household members** | Includes members never on shared activity for that card. |
| **Chosen:** `assignees: [{ memberId }]`; server LRM for 2+; set must equal derived **shared participants** (union of members on shared qualifying txs on that card, current members only) | Aligns POST with transaction model; enforces shared pool correctly on single-owner cards. |

## Consequences

- Implementers must classify balances in the query layer by **assignee count per transaction**, not by summing assignee rows into a single member balance.
- `apps/api` cannot import `apps/web/src/lib/lrm.ts`; extract LRM to a shared package for POST settlements.
- UI and validators change in the same release as the API (breaking GET/POST); see `.planning/specs/settlement-balances-redesign.md`.
