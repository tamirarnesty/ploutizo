# Ploutizo — Household finance

Ploutizo tracks household money across members, accounts, and transactions. Settlement explains how much the household and each member owe on each credit card — not how much members owe each other.

## Language

### Settlement domain

**Member ↔ card obligation**:
The primary settlement model. A household member (or the shared bucket on a card) owes an amount on a specific credit card account based on qualifying activity on that card. There is no member-to-member obligation in the domain; pairwise “who owes whom” is at most derived UI, never canonical truth.
_Avoid_: Member debt, pairwise balance, net settlement (as domain truth)

**Settlement-scoped account**:
A non-archived credit card account. Only these accounts participate in card balance, personal balance, shared balance, and settlement payments. Expenses and refunds on non-credit-card cashflow account types are cash outflows or inflows in the ledger only — they do not create or change settlement balances. **Archived** credit cards are omitted from **card balances view** and cannot receive new settlements; historical transactions remain in the ledger.
_Avoid_: Settleable account, balance account (too generic)

### Transaction routing (accounts)

**Archived account**:
An account that no longer accepts new activity after its archive date. Transactions dated on or before the archive date may remain valid history; transactions dated after the archive date must use an active account.
_Avoid_: Treating archive as deleting historical account activity

**Transaction account**:
The account referenced by `accountId` on a transaction; it is the account the row is recorded against before any optional counterpart account. Its role depends on transaction type: for a **Settlement** it is the **settlement-scoped account** being paid down, while for **Transfer** and **Contribution** it is the source side.
_Avoid_: Primary account, ledger activity account, account role

**Counterpart account**:
The account referenced by `counterpartAccountId` when a transaction has a second account. Its role depends on transaction type: for a **Transfer** it is the destination account, for a **Settlement** it is the funding account, and for a **Contribution** it is the investment destination.
_Avoid_: Secondary account, to account, settled account, using source or destination as a universal term

**Cashflow transaction account**:
The **transaction account** for expenses, refunds, and income. Expense and refund cashflow may be recorded on chequing, savings, prepaid cash, e-transfer, and credit card accounts; income may be recorded only on non-credit-card cashflow accounts. Investment accounts do not record cashflow transactions — money into investments is a **Contribution**.
_Avoid_: Investment expense, credit-card income, treating contribution as expense

**Transfer**:
An account-to-account move between non–credit-card accounts (e.g. chequing ↔ savings). Does not pay down a card and does not affect settlement balances. Card paydown is always **settlement**, not transfer.
_Avoid_: Card payment, chequing-to-card transfer (for paydown)

**Contribution**:
Money into an investment account only. Funding source is chequing or savings — not a credit card.
_Avoid_: Card-funded contribution, contribution to a chequing account

### Import language

**Import hub**:
The starting point for credit card import work. It helps a household member start a new import, resume or discard active drafts, and see recent import outcomes; it is not the place where a draft is fully reviewed.
_Avoid_: Import wizard, import review page

**Import draft**:
A durable in-progress import for one **settlement-scoped account**. A household member can resume or discard it before confirm; only one active import draft may exist for a credit card account at a time.
_Avoid_: Temporary upload, local preview, partial import

**Review import**:
The focused work of inspecting one **import draft** before final confirmation. During review, the user chooses which rows to include, corrects editable transaction fields, and resolves blocking row states.
_Avoid_: Processing import, inline draft preview

**Selected import row**:
An import draft row the user has explicitly chosen to include in the next confirm. Selected rows must be resolved before confirm; invalid or unresolved selected rows block the import from moving forward.
_Avoid_: Automatically included row, checked transaction

**Finalize import**:
The last confirmation checkpoint for an import draft. It commits selected resolved rows into normal transactions, records skipped and unprocessed outcomes, and closes the draft completely.
_Avoid_: Partial confirm, background import

**Bill payment row**:
A credit card statement import row that represents paying down the card issuer. In Ploutizo this is a **Settlement**, not a refund, income, or transfer. It reduces obligation on the card and may match an existing manually entered **Settlement** even when statement dates do not align exactly. The statement row proves the destination card was credited; the funding source is loose during import because card CSVs usually do not identify the paid-from account. A new bill payment row that does not match an existing settlement needs **Pay toward** before confirm.
_Avoid_: Treating a card bill payment as a merchant refund, income, or transfer

**Auto-resolved import match**:
An imported row that Ploutizo can align to exactly one existing same-kind transaction with high confidence. It is still surfaced for review before submit; auto-resolved means the app has a recommended match, not that the row bypasses user confirmation.
_Avoid_: Silent duplicate removal, hidden match

**Needs review import row**:
An imported row whose classification or match is uncertain enough that the user should inspect it before submit. Examples include non-exact date matches, multiple possible matches, near-amount matches, or ambiguous expense/refund/settlement classification.
_Avoid_: Import error (unless the row is invalid)

**Resolved import row**:
An imported row that is safe to include in confirm: classification is complete and any uncertainty has been accepted or corrected by the user, or the row is confidently matched to an existing transaction and will be skipped. Confirm is blocked while any selected row is unresolved.
_Avoid_: Confirmed row, imported row

**Invalid import row**:
A CSV line the app cannot parse into a candidate transaction. It does not fail the whole file; it appears in review/history as invalid with a reason, is excluded from selection by default, and never becomes a transaction.
_Avoid_: Failed import, rejected file

**Import file failure**:
The upload is rejected when the file cannot be processed at all: corrupt/unreadable CSV, unrecognized credit card format, over size/row limits, or no importable data rows. Row-level problems do not fail the file.
_Avoid_: Partial file rejection

**Temporary source file**:
The original uploaded credit card statement file retained briefly after import so the system can audit and validate the import. It is not long-term financial history; durable import history comes from row-level provenance and resulting transactions.
_Avoid_: Permanent statement archive, source of truth

**Bill Payment category**:
A normal seeded category used for **Settlement** transactions created or matched from imported **Bill payment rows**. It makes card paydown rows readable in transaction lists without making them spend; dashboard and budget spend remain governed by transaction type, not by category alone. Bill payment rows may receive this category through import processing or a default merchant rule rather than from the uploaded file.
_Avoid_: Treating bill payment category as expense spend

**Classified import row**:
An imported row that has enough domain meaning to become a Ploutizo transaction using the same transaction model as manual entry. Classification includes the required transaction kind and attribution choices; tags, notes, and user-polished description details are refinements that may be changed during review or later.
_Avoid_: Partially classified ledger entry

**Import assignee default**:
For imported expense and refund rows, assignees default from the target credit card’s account ownership: one owner → personal transaction; multiple owners → shared transaction with equal split. A merchant rule assignee overrides this default when it matches.
_Avoid_: Defaulting to the uploading member, defaulting to all household members

**Single-account import**:
An import file assigned to exactly one target credit card account before or during upload. Credit card statement exports are expected to represent one account; assigning the whole file to one card keeps duplicate detection, statement matching, and row classification coherent.
_Avoid_: Multi-account import, chequing/savings statement import

**Ploutizo normalized import format**:
A household-facing CSV template for credit card imports when a bank-specific export is unavailable. Required columns: date, amount, description, type (`expense` | `refund` | `settlement`). Optional columns include external id, category, assignee hint, refund link hints, notes, and tags. The Import page is the primary place to download the example file and format guide in v1.
_Avoid_: General-purpose ledger migration format

**Import history**:
The user-visible record of draft, completed, undone, expired, and discarded imports. It explains what happened to an uploaded statement without treating the original file as permanent history.
_Avoid_: File archive, statement archive

**Import access** (v1):
Any household member may upload, review, and confirm credit card imports for any household credit card account. No role or account-ownership restriction.
_Avoid_: Admin-only import, per-member import permission

**External id** (import):
A bank-provided reference from a credit card statement row, stored on imported transactions when the format supplies one. Used as the primary duplicate key on re-import and as a durable link back to the original statement transaction for auditing. Duplicate matching is scoped to the target credit card account only.
_Avoid_: Ploutizo transaction id, Clerk external id, household-wide bank reference matching

**Completed import**:
An import draft that has been fully processed once. Selected processable rows may create transactions; skipped, invalid, or unprocessed rows remain as import history outcomes and may help prefill later manual transaction entry, but they cannot be batch-processed again from the completed import.
_Avoid_: Partial draft, resumable leftover rows

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
On every credit card, the sum of every **household member**’s personal balances plus **shared balance** always equals the card balance.

**Household member** (v1):
Every member of the organisation (`orgMembers`). All members are active for settlement: each appears on every card in **card balances view** (personal balance may be $0). Members cannot be removed or archived in v1; an unused member simply has no qualifying transactions. Assignees on transactions are always household members.
_Avoid_: Active member (implies a separate inactive set), former member

**Settlement**:
A transaction of type `settlement` that records paying down a credit card from a chequing or savings funding account. It is the explicit paydown type — not a generic `transfer`. Reduces obligation on the card (`accountId`); funding source is the counterpart account (`counterpartAccountId`). Distinct from the Settlement summary UI pane on the dashboard.
_Avoid_: Payoff, payment (unless speaking generically), using `transfer` for card paydown, funding settlement from cash/investment/credit card

**Settlement assignees** (API):
The list of household members on a settlement transaction — same attribution model as expenses and refunds. **One assignee** → **personal settlement** (reduces that member’s personal balance). **Two or more assignees** → **shared settlement** (reduces **shared balance**; server LRM split). A single-assignee settlement can never reduce shared. For shared settlements, assignees must match **shared participants** on that card (the members who appear on shared qualifying transactions there). Pay toward in the UI selects which settlement shape to create (which assignee set to send). `payerMemberId` is not used.
_Avoid_: Pay toward as API bucket field, payer alone as the sole API field

**Shared participant ids** (API):
Member ids returned per credit card for clients building a shared settlement (`assignees` length > 1). Derived from shared transactions on that card, scoped like balances — always a subset of **household members**.

**Qualifying transaction** (settlement balances):
An expense, refund, or settlement on a credit card that updates card, personal, and shared balances. Income, transfer, and contribution never do — including a `transfer` into a credit card; paydown must be recorded as **settlement**. Soft-deleted transactions are excluded — deletion removes their effect on balances (same direction as if the obligation never counted); if the card was already paid down, excluding a past expense can create **balance credit**.
_Avoid_: Balance transaction, settlement-eligible (verbose)

**Refund** (settlement):
A qualifying transaction that decreases obligation on the card (opposite sign from expense in balance math). May reverse a linked expense in full or in part; behaves like removing obligation, analogous to deleting an expense that had been counted.
_Avoid_: Reversal (use when speaking generically)

**Linked refund**:
A refund tied to an existing transaction. On create, fields default from the original (especially category and assignees) so spend classification and personal vs shared classification match the expense unless the user overrides. On edit, assignees can be changed; balance math always uses the refund row’s assignees (count 1 → personal, 2+ → shared). Unlinked refunds require at least one assignee and their own category at create time. During import, a refund may be auto-suggested as linked to an original expense on the same card; the user confirms or overrides before submit.
_Avoid_: Orphan refund, silent auto-link

**Personal transaction**:
A qualifying transaction with exactly one assignee. Its full signed amount applies to that member’s personal balance only.
_Avoid_: Individual transaction, solo assignee

**Shared transaction**:
A qualifying transaction with two or more assignees. Its full signed amount applies to shared balance only. Assignee split rows record who participated; they do not allocate shared obligation per member on the card.
_Avoid_: Split transaction, per-member share of a shared expense (for balances)

**Personal settlement**:
A settlement payment that reduces one member’s personal balance on a card (exactly one assignee on the settlement transaction). Amount may be less than the full owed balance (**partial settlement** allowed).
_Avoid_: Member payment, solo settle

**Partial settlement**:
A settlement for less than the outstanding amount on the chosen slice (personal or shared). Remaining obligation stays on the card. Overpayment is also allowed (creates **balance credit**).
_Avoid_: Full payoff required

**Shared settlement**:
A settlement payment that reduces the card’s shared balance (two or more assignees on the settlement transaction, equal split across shared participants). Distinct from **personal settlement** — same card, different bucket. **Partial settlement** allowed.
_Avoid_: Household payment, pool settle

**Account ownership**:
Whether an account is labeled personal or shared in household settings. Describes who uses the account; does not determine how individual transactions are classified for card balances.
_Avoid_: Using ownership interchangeably with shared transaction

**Assignee**:
A household member attributed to a transaction with a split amount. Every transaction must have one or more assignees so activity can always be attributed to members.
_Avoid_: Owner (use for account ownership), payer (use only when describing settlement payments)

**Transaction correction**:
Qualifying transactions may be edited freely in v1 (including assignees, amounts, links). Changing assignee count moves obligation between personal and shared buckets on the next balance read — never blocked. Balances are always derived from current rows, not frozen by bucket at post time.
_Avoid_: Locked attribution, immutable split

### Balance effects (qualifying transactions)

Expenses **increase** obligation (positive). Refunds and settlements **decrease** obligation (negative).

For a **personal transaction**, the full signed effect applies to that assignee’s personal balance.

For a **shared transaction**, the full signed effect applies to shared balance only. **Personal settlement** and **shared settlement** are separate actions because they reduce different buckets on the same card.

**Shared participants** (per card):
**Household members** who appear on at least one **shared transaction** on that card (same scope as settlement balances). Used when recording **shared settlement** (equal split across participants). Not the same as account owners; not every member is a shared participant until they share activity on that card.
_Avoid_: Co-owners (use account ownership), payers

**Pay toward**:
In the settle dialog, which slice the user is paying down (one member’s personal balance or **shared balance**). The app creates a settlement whose **assignees** match that choice: one member id for personal, all **shared participants** for shared. Classification is always by assignee count on the saved transaction, not a separate bucket flag.
_Avoid_: Settling for, pay toward as server-side enum

**Balance credit**:
A negative personal or shared balance (overpayment on that slice). Credits are first-class in v1 — same visibility as owed and zero: shown on the card balances grid and in Pay toward when non-zero; no special removal or hiding rules.
_Avoid_: Overpayment exception, hiding credit

**Display rules (settlement UI)**:
On the card balances grid, personal and shared chips are omitted when the balance is exactly zero; any owed or credit amount shows a chip. Owed balances show as positive amounts; **balance credit** shows as negative amounts with success styling. The settle dialog Pay toward rows use the same signed formatting for consistency. For households with more than two members, attribution chips wrap without truncation; the segment bar includes one segment per non-zero slice. Pay toward always lists every household member plus Shared with no cap (even when a slice is zero). Member ordering is stable (by `memberId` where roster order is not fixed); Shared is always last. The shared chip and bar segment use a neutral non-member color, not member palette slots and not muted/disabled styling.

**Settle entry point**:
The Card Balances Settle control opens a dropdown only; the settle dialog opens exclusively from choosing a menu item (a member or Shared). There is no direct dialog entry from the Settle button alone.

**Settle dialog field persistence**:
Opening from the action menu seeds pay toward, amount (positive owed only), paid-from default, and date. When the user changes pay toward inside the dialog, only the amount is recomputed from prefill rules; paid from, date, and notes keep any user edits. Paid-from defaults: the selected member’s personal chequing when paying toward a member; a multi-owner household account when paying toward Shared. In the settle dialog, every household member and Shared are always listed under Pay toward regardless of balance, because a settlement can be recorded even when nothing is owed (including increasing credit on personal or shared). The amount field prefills the outstanding owed balance only when that balance is positive; zero or credit prefills as zero and the user enters the payment amount.

**Settlement balance scope**:
All non-deleted qualifying transactions on each card, with no cutoff by transaction `date` and no filter from the dashboard date range. The card balances view is a **now** snapshot of obligation on each settlement-scoped account for the household — separate from period-based metrics and insights elsewhere on the dashboard.
_Avoid_: Statement period balance, monthly settlement, as-of balance

**Card balances view**:
Lists every non-archived credit card in the household, always showing the live **card balance** (owed, zero, or credit). Every **household member** appears on each card with their **personal balance**; **shared balance** appears once per card. Cards are never hidden for being at zero — only **archived** cards are omitted entirely. Signed amounts at a glance are the primary insight.
_Avoid_: Hiding zero-balance cards, statement snapshot table

**Dashboard period**:
The date range picker applies only to summary analytics (income, expenses, spend by category, monthly spend, etc.). It does not affect settlement balances. Card balances are labeled **All time** to signal they are outside the period picker.

## Example dialogue

**Dev:** Tamir’s personal balance on Amex is $100 and shared is $50 — what’s the card balance?  
**Expert:** $150 if Emily’s personal is $0. Personal plus shared always equals the card balance.

**Dev:** Tamir pays $110 on a card where he personally owes $100.  
**Expert:** His personal balance goes to −$10 credit. The card balance drops by $110. Shared is unchanged unless they use Settle shared.

**Dev:** Can shared balance be negative?  
**Expert:** Yes — that’s **balance credit** on the shared slice, same rules as personal. Still visible on the grid and in Pay toward.

**Dev:** What do we call the dialog section where you pick Tamir, Emily, or Shared?  
**Expert:** **Pay toward** — who or what this payment reduces on the card. Each row is name + balance only.

**Dev:** Emily pays $200 from chequing for groceries — does that change settlement?  
**Expert:** No. Chequing expenses are outflows only. Only activity on **settlement-scoped accounts** (credit cards) affects balances.

**Dev:** Does the app track that Emily owes Tamir $80?  
**Expert:** No — **member ↔ card obligation** only. If the UI shows a pairwise summary, it’s derived from card data, not a separate domain.

**Dev:** Tamir and Emily split a $120 dinner on Amex — who owes what on the card?  
**Expert:** **Shared balance** +$120. Neither personal balance moves. Tamir uses **personal settlement** for his solo charges; **shared settlement** pays down the shared bucket.

**Dev:** Tamir moves $500 from chequing to savings — settlement?  
**Expert:** No — that’s a **transfer**. Paying the Amex bill from chequing is **settlement** (chequing → credit card).

**Dev:** Can they fund an RRSP contribution from the Visa?  
**Expert:** No — **contribution** is to investment only, from chequing or savings, not from a card.

**Dev:** User sets dashboard to “Last 30 days” — do card balances change?  
**Expert:** No — **settlement balance scope** is always through now. Period picker is for insights only.

**Dev:** Amex is paid off — hide it from card balances?  
**Expert:** No — **card balances view** keeps every non-archived card visible with $0 (or credit if overpaid).

**Dev:** Alex is in the household but never uses the shared Amex — what shows?  
**Expert:** Alex still has a row with **personal balance** $0. **Shared balance** is one number for the card. He’s not a **shared participant** on that card until he’s on a **shared transaction** there.

**Dev:** Amex shows $100 owed; we delete a $30 expense still in that balance — new balance?  
**Expert:** $70 owed. If they had already **settled** $100, excluding the $30 expense leaves **balance credit** $30 on the card — same idea as a **refund** reversing obligation.

**Dev:** Refund for a shared $120 dinner — personal or shared bucket?  
**Expert:** **Linked refund** copies both assignees → shared −$120. If someone edits it to one assignee only, it becomes personal.
