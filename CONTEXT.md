# Ploutizo — Household finance

Ploutizo tracks household money across members, accounts, and transactions. Settlement views explain who owes each credit card and how much is personal vs shared.

## Language

### Settlement balances (credit cards)

**Card balance**:
The amount the household currently owes the card issuer on one credit card account (or credit held on that card). Signed: positive means owed to the issuer; negative means credit.
_Avoid_: Account balance, total owed, statement balance (unless speaking to the user about their issuer statement)

**Personal balance**:
One member’s attributed share on a card from single-assignee transactions only. Each member has their own personal balance per card.
_Avoid_: Member balance, individual balance, split amount

**Shared balance**:
The household’s attributed share on a card from multi-assignee transactions only. One shared balance per card, not per member.
_Avoid_: Shared pool, split total, household share

**Card balance identity**:
On every credit card, the sum of all members’ personal balances plus the shared balance always equals the card balance.

**Settlement**:
A transaction that records a payment toward a card balance (reducing what is owed). Distinct from the Settlement summary UI pane on the dashboard.
_Avoid_: Payoff, payment (unless speaking generically)

**Settlement assignees** (API):
The list of household members on a settlement transaction. One member means the payment reduces that member’s personal balance on the card; two or more means the payment reduces shared balance (amount split equally across listed members, cents allocated on the server). The client sends member ids only; the server computes assignee amounts. For multi-member settlements, the set must match shared participants on that card. `payerMemberId` is not used.
_Avoid_: Pay toward (dialog label only), payer alone as the sole API field

**Shared participant ids** (API):
Member ids returned per credit card for clients building a shared settlement (`assignees` length > 1). Derived from shared transactions on that card, scoped like balances, limited to current household members.

**Qualifying transaction** (settlement balances):
An expense, refund, or settlement on a credit card that updates card, personal, and shared balances. Income, transfer, and contribution never do.
_Avoid_: Balance transaction, settlement-eligible (verbose)

**Personal transaction**:
A qualifying transaction with exactly one assignee. Its full signed amount applies to that member’s personal balance only.
_Avoid_: Individual transaction, solo assignee

**Shared transaction**:
A qualifying transaction with two or more assignees. Its full signed amount applies to shared balance only (not split across members in the balance view).
_Avoid_: Split transaction, multi-assignee expense

**Account ownership**:
Whether an account is labeled personal or shared in household settings. Describes who uses the account; does not determine how individual transactions are classified for card balances.
_Avoid_: Using ownership interchangeably with shared transaction

**Assignee**:
A household member attributed to a transaction with a split amount. Every transaction must have one or more assignees so activity can always be attributed to members.
_Avoid_: Owner (use for account ownership), payer (use only when describing settlement payments)

### Balance effects (qualifying transactions)

Expenses **increase** obligation (positive). Refunds and settlements **decrease** obligation (negative).

For a **personal transaction**, the full signed effect applies to that assignee’s personal balance.

For a **shared transaction**, the full signed effect applies to shared balance only (assignee split amounts are bookkeeping; the balance view does not allocate shared obligation per member).

**Shared participants** (per card):
Household members who appear on at least one shared transaction on that card, using the same time scope as settlement balances, restricted to current household members. Used when recording Settle shared (equal split across participants). Not the same as account owners.
_Avoid_: Co-owners (use account ownership), payers

**Pay toward**:
In the settle dialog, which balance on the card a payment reduces: one member’s personal balance or the card’s shared balance.
_Avoid_: Settling for

**Display rules (settlement UI)**:
On the card balances grid, personal and shared chips are omitted when the balance is exactly zero; any owed or credit amount shows a chip. Owed balances show as positive amounts; credits show as negative amounts with success styling. The settle dialog Pay toward rows use the same signed formatting for consistency. For households with more than two members, attribution chips wrap without truncation; the segment bar includes one segment per non-zero slice. Pay toward always lists every household member plus Shared with no cap. Member ordering is stable (by `memberId` where roster order is not fixed); Shared is always last. The shared chip and bar segment use a neutral non-member color, not member palette slots and not muted/disabled styling.

**Settle entry point**:
The Card Balances Settle control opens a dropdown only; the settle dialog opens exclusively from choosing a menu item (a member or Shared). There is no direct dialog entry from the Settle button alone.

**Settle dialog field persistence**:
Opening from the action menu seeds pay toward, amount (positive owed only), paid-from default, and date. When the user changes pay toward inside the dialog, only the amount is recomputed from prefill rules; paid from, date, and notes keep any user edits. Paid-from defaults: the selected member’s personal chequing when paying toward a member; a multi-owner household account when paying toward Shared. In the settle dialog, every household member and Shared are always listed under Pay toward regardless of balance, because a settlement can be recorded even when nothing is owed (including increasing credit on personal or shared). The amount field prefills the outstanding owed balance only when that balance is positive; zero or credit prefills as zero and the user enters the payment amount.

**Dashboard period**:
The date range picker applies to summary analytics (income, expenses, spend by category, monthly spend, etc.), not to card balances or settlement balances. Card balances and settlement use all qualifying transactions to date and are labeled **All time** under the Card Balances and Settlement section titles.

## Example dialogue

**Dev:** Tamir’s personal balance on Amex is $100 and shared is $50 — what’s the card balance?  
**Expert:** $150 if Emily’s personal is $0. Personal plus shared always equals the card balance.

**Dev:** Tamir pays $110 on a card where he personally owes $100.  
**Expert:** His personal balance goes to −$10 credit. The card balance drops by $110. Shared is unchanged unless they use Settle shared.

**Dev:** Can shared balance be negative?  
**Expert:** Yes — overpaying the shared portion leaves shared in credit, same as personal.

**Dev:** What do we call the dialog section where you pick Tamir, Emily, or Shared?  
**Expert:** **Pay toward** — who or what this payment reduces on the card. Each row is name + balance only.
