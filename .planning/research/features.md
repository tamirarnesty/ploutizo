# Features Research

**Project:** ploutizo — personal finance tracker for Canadian households
**Researched:** 2026-03-24
**Overall confidence:** MEDIUM (Canadian bank CSV formats are LOW confidence — need real exports to validate; CRA rules are HIGH confidence from official sources)

---

## 1. Canadian Bank CSV Formats (2025)

**Confidence: LOW** — Bank CSV formats are not documented in public APIs. The formats below are derived from training data (pre-August 2025 cutoff) and community sources. They must be validated against actual bank exports before writing normalizer code.

### TD Bank

**Format:** Fixed headers, no metadata rows at top.

| Column | Notes |
|--------|-------|
| `Transaction Date` | `MM/DD/YYYY` — not ISO |
| `Transaction Description` | Raw merchant string |
| `Withdrawals ($)` | Positive decimal if money went out; empty if not applicable |
| `Deposits ($)` | Positive decimal if money came in; empty if not applicable |
| `Balance ($)` | Running balance after transaction |

- **Amount sign convention:** Separate Withdrawals/Deposits columns — no single signed amount column. Normalizer must: if Withdrawals non-empty -> negative amount; if Deposits non-empty -> positive amount.
- **Date format:** `MM/DD/YYYY` e.g. `03/15/2025`
- **Encoding:** UTF-8, no BOM typically
- **Header row:** Line 1
- **Credit card:** Same structure; "Withdrawals" = charges, "Deposits" = payments/credits
- **External ID:** TD does not include a transaction reference ID in CSV exports (LOW confidence)

### RBC

**Format:** May include metadata header rows before the data table.

| Column | Notes |
|--------|-------|
| `Account Type` | e.g. `Chequing`, `Visa` |
| `Account Number` | Masked account number |
| `Transaction Date` | `MM/DD/YYYY` |
| `Cheque Number` | Usually empty |
| `Description 1` | Primary merchant/description |
| `Description 2` | Secondary detail, often empty |
| `CAD$` | Signed decimal — negative = debit, positive = credit |
| `USD$` | Only populated for USD transactions |

- **Amount sign convention:** Single signed `CAD$` column. Negative = outgoing (purchase/payment), positive = incoming (deposit/refund).
- **Date format:** `MM/DD/YYYY`
- **Encoding:** UTF-8
- **Description:** Two description fields — Description 1 is the primary merchant name; Description 2 has extra detail. Normalizer should concatenate or prefer Description 1.
- **External ID:** No standard transaction ID in RBC CSV exports (LOW confidence)

### CIBC

**Format:** No metadata rows; straight CSV.

| Column | Notes |
|--------|-------|
| `Date` | `YYYY-MM-DD` — ISO format (unusual for Canadian banks) |
| `Description` | Merchant string |
| `Debit` | Positive decimal if debit; empty otherwise |
| `Credit` | Positive decimal if credit; empty otherwise |
| `Balance` | Running balance |

- **Amount sign convention:** Separate Debit/Credit columns (similar to TD but column names differ). Normalizer: Debit non-empty -> negative; Credit non-empty -> positive.
- **Date format:** `YYYY-MM-DD` — this is the exception among Canadian banks; most use `MM/DD/YYYY`
- **Encoding:** UTF-8
- **External ID:** None in standard CSV (LOW confidence)

### Scotiabank

**Format:** May include account summary lines at top before data rows.

| Column | Notes |
|--------|-------|
| `Date` | `MM/DD/YYYY` |
| `Description` | Merchant/description string |
| `Withdrawals` | Positive decimal if outgoing; empty otherwise |
| `Deposits` | Positive decimal if incoming; empty otherwise |
| `Balance` | Running balance |

- **Amount sign convention:** Separate Withdrawals/Deposits columns.
- **Date format:** `MM/DD/YYYY`
- **Encoding:** UTF-8 or Windows-1252 (Scotiabank historically had encoding quirks — flag for testing)
- **External ID:** None standard (LOW confidence)

### BMO

**Format:** May include non-data header lines at top. Check for "Date" in first column to detect start of data.

| Column | Notes |
|--------|-------|
| `Date` | `MM/DD/YYYY` |
| `Transaction Description` | Merchant/description |
| `Withdrawal` | Positive decimal if outgoing |
| `Deposit` | Positive decimal if incoming |
| `Balance` | Running balance |

- **Amount sign convention:** Separate Withdrawal/Deposit columns.
- **Date format:** `MM/DD/YYYY`
- **Encoding:** UTF-8 typically, but some users report BOM (EF BB BF prefix) — strip BOM if present
- **External ID:** None standard (LOW confidence)

### Amex Canada

**Format:** Clean CSV, no metadata rows.

| Column | Notes |
|--------|-------|
| `Date` | `MM/DD/YYYY` |
| `Reference` | Amex transaction reference number — useful as `external_id` |
| `Amount` | Signed decimal — **positive = charge (outgoing)**, negative = credit/refund (unusual — inverted from bank convention) |
| `Description` | Merchant name and location |
| `Card Member` | Name on card (for corporate/supplementary card exports) |
| `Account #` | Masked card number |

- **Amount sign convention:** INVERTED compared to bank accounts. Positive = charge (expense), negative = credit/refund. Normalizer must invert sign.
- **Date format:** `MM/DD/YYYY`
- **Reference column:** Amex provides a reference number. Use as `external_id` for deduplication.
- **Encoding:** UTF-8

### Tangerine

**Format:** May include account summary at top.

| Column | Notes |
|--------|-------|
| `Date` | `MM/DD/YYYY` |
| `Transaction` | Description/merchant |
| `Name` | Sometimes merchant name |
| `Memo` | Additional detail |
| `Amount` | Signed decimal — negative = outgoing, positive = incoming |

- **Amount sign convention:** Single signed Amount column. Negative = expense, positive = income. Same convention as ploutizo normalized format.
- **Date format:** `MM/DD/YYYY`
- **Encoding:** UTF-8

### EQ Bank

**Format:** Clean CSV, minimal metadata.

| Column | Notes |
|--------|-------|
| `Date` | `YYYY-MM-DD` (ISO) |
| `Transaction Details` | Description string |
| `Debit` | Positive decimal if outgoing; empty otherwise |
| `Credit` | Positive decimal if incoming; empty otherwise |
| `Balance` | Running balance |

- **Amount sign convention:** Separate Debit/Credit columns.
- **Date format:** `YYYY-MM-DD` — ISO, like CIBC
- **Encoding:** UTF-8

### Summary Table

| Bank | Date Format | Amount Columns | Sign Convention | External ID | Encoding Notes |
|------|------------|----------------|-----------------|-------------|----------------|
| TD | `MM/DD/YYYY` | Withdrawals + Deposits | Separate columns | None | UTF-8 |
| RBC | `MM/DD/YYYY` | `CAD$` (single signed) | Neg=debit, Pos=credit | None | UTF-8 |
| CIBC | `YYYY-MM-DD` | Debit + Credit | Separate columns | None | UTF-8 |
| Scotiabank | `MM/DD/YYYY` | Withdrawals + Deposits | Separate columns | None | Possible Win-1252 |
| BMO | `MM/DD/YYYY` | Withdrawal + Deposit | Separate columns | None | Possible BOM |
| Amex CA | `MM/DD/YYYY` | `Amount` (single signed) | **INVERTED**: Pos=charge | `Reference` | UTF-8 |
| Tangerine | `MM/DD/YYYY` | `Amount` (single signed) | Neg=expense, Pos=income | None | UTF-8 |
| EQ Bank | `YYYY-MM-DD` | Debit + Credit | Separate columns | None | UTF-8 |

### Detection Strategy

Auto-detect bank format by examining header row columns:

```typescript
const BANK_SIGNATURES: Record<string, string[]> = {
  td:          ['Transaction Date', 'Transaction Description', 'Withdrawals ($)', 'Deposits ($)'],
  rbc:         ['Account Type', 'Account Number', 'Transaction Date', 'CAD$'],
  cibc:        ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
  scotiabank:  ['Date', 'Description', 'Withdrawals', 'Deposits', 'Balance'],
  bmo:         ['Date', 'Transaction Description', 'Withdrawal', 'Deposit', 'Balance'],
  amex:        ['Date', 'Reference', 'Amount', 'Description'],
  tangerine:   ['Date', 'Transaction', 'Name', 'Memo', 'Amount'],
  eqbank:      ['Date', 'Transaction Details', 'Debit', 'Credit', 'Balance'],
};
```

Fallback: if no signature matches, attempt normalized ploutizo format detection (requires `date`, `amount`, `description`, `type` columns).

### Quirks to Handle

1. **BOM stripping:** `buffer.toString('utf8').replace(/^\uFEFF/, '')` — apply to all inputs before parsing
2. **Amex sign inversion:** Positive in Amex CSV = expense (outgoing). Must multiply by -1 before normalizing.
3. **Scotiabank encoding:** Test with Windows-1252 encoded exports. Use `iconv-lite` if non-UTF-8 characters detected.
4. **Metadata header rows:** TD, BMO, Scotiabank, RBC may have 1–3 non-data rows before the header. Detection: scan lines until a known header signature is found, then skip preceding lines.
5. **Empty amount cells:** Debit/Credit columns will have empty string `""` when not applicable — treat empty as `0` or null before deciding sign.
6. **Balance rows:** Some banks include a closing balance row at the end — filter rows where description matches known balance-line patterns (e.g. "Opening Balance", "Closing Balance").
7. **Date parsing:** Do not use `new Date(string)` for parsing — it's locale-sensitive. Use explicit parse functions: `MM/DD/YYYY` -> split on `/` and recompose.

---

## 2. TFSA Contribution Room Calculation

**Confidence: HIGH** — CRA annual limits are publicly published; formula is well-established.

### Annual Contribution Limits by Year

| Year | Annual Limit | Cumulative (from 2009) |
|------|-------------|------------------------|
| 2009 | $5,000 | $5,000 |
| 2010 | $5,000 | $10,000 |
| 2011 | $5,000 | $15,000 |
| 2012 | $5,000 | $20,000 |
| 2013 | $5,500 | $25,500 |
| 2014 | $5,500 | $31,000 |
| 2015 | $10,000 | $41,000 |
| 2016 | $5,500 | $46,500 |
| 2017 | $5,500 | $52,000 |
| 2018 | $5,500 | $57,500 |
| 2019 | $6,000 | $63,500 |
| 2020 | $6,000 | $69,500 |
| 2021 | $6,000 | $75,500 |
| 2022 | $6,000 | $81,500 |
| 2023 | $6,500 | $88,000 |
| 2024 | $7,000 | $95,000 |
| 2025 | $7,000 | $102,000 |

The 2025 limit of $7,000 is confirmed. Future years (2026+) are indexed to inflation (rounded to nearest $500) — the app must support adding new annual limits via a hardcoded constant file updated each January.

### Eligibility

- Must be a **Canadian resident** at the time the room accumulates
- Must be **18 years of age or older** (the year you turn 18, not necessarily on your birthday — CRA grants the full year's room)
- Room accumulates from the **later of**: the year you turn 18 OR 2009 (the first TFSA year)

### Room Calculation Formula

```
available_room =
  SUM(annual_limits for all years from max(2009, birth_year + 18) to current_year)
  - total_contributions_tracked
  + total_withdrawals_in_prior_years
```

**Critical nuance:** Withdrawals restore room, but only in the following calendar year, not immediately.
- Withdraw $10,000 in March 2025 → room restored January 1, 2026 (not in 2025)

### Room by Birth Year (end of 2025)

| Born | Eligible From | Lifetime Room (2025) |
|------|--------------|---------------------|
| 1991 or earlier | 2009 | $102,000 |
| 1995 | 2013 | $82,000 |
| 1997 | 2015 | $71,000 |
| 2000 | 2018 | $50,000 |
| 2001 | 2019 | $44,500 |
| 2003 | 2021 | $32,500 |
| 2005 | 2023 | $20,500 |
| 2006 | 2024 | $14,000 |
| 2007 | 2025 | $7,000 |
| 2008 or later | 2026+ | $0 (not yet eligible) |

### Implementation Model

```typescript
const TFSA_ANNUAL_LIMITS: Record<number, number> = {
  2009: 500000, // cents
  2010: 500000,
  2011: 500000,
  2012: 500000,
  2013: 550000,
  2014: 550000,
  2015: 1000000,
  2016: 550000,
  2017: 550000,
  2018: 550000,
  2019: 600000,
  2020: 600000,
  2021: 600000,
  2022: 600000,
  2023: 650000,
  2024: 700000,
  2025: 700000,
};

const calcTfsaLifetimeRoom = (birthYear: number, currentYear: number): number => {
  const eligibleFrom = Math.max(2009, birthYear + 18);
  return Object.entries(TFSA_ANNUAL_LIMITS)
    .filter(([year]) => parseInt(year) >= eligibleFrom && parseInt(year) <= currentYear)
    .reduce((sum, [, limit]) => sum + limit, 0);
};

const calcTfsaAvailableRoom = (
  birthYear: number,
  currentYear: number,
  contributionsCents: number,  // total contributions tracked in app
  priorYearWithdrawalsCents: number,  // withdrawals made before current year
): number => {
  const lifetimeRoom = calcTfsaLifetimeRoom(birthYear, currentYear);
  return lifetimeRoom - contributionsCents + priorYearWithdrawalsCents;
};
```

### Edge Cases

1. **Withdrawal timing:** The app tracks contributions only in v1 — withdrawals from TFSA are not tracked as contribution-type transactions (they're tracked as regular income or transfer transactions). The TFSA room calculation in v1 will therefore be: `lifetime_room - tracked_contributions`. The withdrawal restoration is not modeled in v1. Document this limitation clearly in the UI.

2. **Non-resident years:** CRA does not grant TFSA room for years when the user was not a Canadian resident. The app cannot track residency status — document as a known limitation; the user's actual CRA room may differ.

3. **January 1 room addition:** New room is added on January 1 each year. The current year's room should only be included when `current_year <= present_year`.

4. **Over-contribution detection threshold:** The app compares tracked contributions against calculated room. If `contributions > room`, flag as over-contribution. The penalty is 1% per month on the excess — the app warns but does not calculate the penalty.

5. **Year of death:** CRA rules have special treatment for year of death — out of scope for v1.

6. **Birth year collection:** The app stores `birth_year` (not full DOB) per member. For TFSA eligibility in current year: eligible if `current_year >= birth_year + 18`. For the room in the current year to be included: the user turns 18 sometime during the year.

---

## 3. RRSP Contribution Rules

**Confidence: HIGH for formula structure; MEDIUM for 2025 exact dollar cap** — the 2025 cap of $32,490 is based on CRA indexing and is widely reported. Verify before hardcoding.

### Formula

```
RRSP_room = 18% × prior_year_earned_income
            - pension_adjustment (PA)
            - past_service_pension_adjustment (PSPA)
            + pension_adjustment_reversal (PAR)
            + unused_room_carried_forward
```

Dollar cap (annual maximum, ignoring carryforward): **$32,490 in 2025**.

So effective room for the year = `min(18% × prior_year_income, $32,490) - PA + PAR + carried_forward`.

### Earned Income Components

Earned income (for RRSP purposes) includes:
- Employment income (salary, wages, self-employment net)
- Net rental income
- Royalties
- Alimony/spousal support received
- Research grants (net of expenses)

Does NOT include: investment income, pension income, RRSP withdrawals.

### Pension Adjustment (PA)

The PA is the dollar value of pension benefits earned during the year under a Registered Pension Plan (RPP) or Deferred Profit Sharing Plan (DPSP). It reduces RRSP room dollar-for-dollar. Reported in box 52 of the T4 slip.

### v1 Approach (Manual Room Override)

Per REQUIREMENTS.md, v1 uses manual room override — the user enters their available RRSP room directly from their CRA MyAccount or Notice of Assessment. The app then tracks contributions against that number.

This sidesteps the complexity of earned income tracking entirely.

**Implementation:**
- `contribution_room_settings` table stores `manual_rrsp_room_cents` per member
- User updates this annually after receiving their NOA from CRA
- App tracks contributions made within the current tax year
- Available room = `manual_room_entered - contributions_this_year`
- Over-contribution threshold: CRA allows a lifetime $2,000 over-contribution buffer before penalties apply

### RRSP Dollar Limits by Year (for reference if auto-calculation is added in v2)

| Year | Annual Limit |
|------|-------------|
| 2020 | $27,230 |
| 2021 | $27,830 |
| 2022 | $29,210 |
| 2023 | $30,780 |
| 2024 | $31,560 |
| 2025 | $32,490 |

### Edge Cases

1. **RRSP deadline:** Contributions made in first 60 days of calendar year can be applied to prior year's tax return. The app doesn't need to model this — the user manually adjusts their room input.
2. **Spousal RRSP:** Contributions to a spousal RRSP count against the contributor's room, not the annuitant's. The app in v1 doesn't need to model spousal attribution.
3. **Conversion to RRIF at 71:** RRSP must be converted to RRIF by Dec 31 of the year the holder turns 71. Out of scope for v1.
4. **$2,000 lifetime over-contribution buffer:** CRA allows $2,000 cumulative lifetime over-contribution without penalty. Consider showing a warning only when contributions exceed `room + $2,000`, not at `room + $1`.

---

## 4. FHSA Contribution Rules

**Confidence: HIGH** — FHSA launched April 1, 2023; rules are well-established from CRA publications.

### Core Rules

| Parameter | Value |
|-----------|-------|
| Annual contribution limit | $8,000 |
| Lifetime contribution limit | $40,000 |
| Maximum carry-forward per year | $8,000 (unused room from prior year, capped) |
| Maximum single-year contribution (with carry-forward) | $16,000 |
| Account open requirement | Account must be open in the year to earn room |
| Eligible account holder | Canadian resident, at least 18 years old, first-time home buyer |
| FHSA eligible from | 2023 (accounts opened from April 1, 2023 onward) |

### Room Accumulation

Room accumulates based on the account open date, not the member's birth year:
- Year account is opened: $8,000 room
- Each subsequent year: +$8,000 room
- Carry-forward: unused room from the prior year carries forward (capped at $8,000)
- Lifetime ceiling: $40,000 total contributions

### Carry-Forward Mechanics

The carry-forward is based on **prior year unused room** with a hard cap of $8,000:

```
carry_forward = min(prior_year_unused_room, 8000)
annual_room = 8000 + carry_forward
effective_room = min(annual_room, 40000 - total_contributions_to_date)
```

Note: Carry-forward does NOT compound. Each year you can carry forward at most $8,000 from the previous year, regardless of how many years you've left the account unfunded. If you open the account and contribute nothing for 3 years, you still only have $8,000 carry-forward capacity (from year 3 to year 4), not $24,000.

### Example Scenarios

**Scenario 1: Opened 2023, contributed nothing through 2025**
- 2023: annual room $8,000; contributed $0; unused $8,000
- 2024: annual room $8,000 + carry-forward $8,000 = $16,000; contributed $0; unused $16,000 (but carry-forward cap resets to $8,000 for next year)
- 2025: annual room $8,000 + carry-forward $8,000 = $16,000; total room to date: $24,000 earned, $16,000 available
- Note: you cannot "bank" $24,000 of carry-forward; carry-forward resets to at most $8,000 each year

**Scenario 2: Opened 2023, max contribution year 1 ($8,000), nothing else**
- 2023: $8,000 room; contributed $8,000; unused $0; lifetime used $8,000
- 2024: $8,000 + $0 carry-forward = $8,000 room; total lifetime used $8,000; remaining lifetime $32,000
- 2025: $8,000 + $0 carry-forward = $8,000 room

**Scenario 3: Opened 2023, contributed $4,000 in 2023**
- 2023: $8,000 room; contributed $4,000; unused $4,000
- 2024: $8,000 + $4,000 carry-forward = $12,000 room
- 2025: If 2024 unused = $8,000, carry-forward = $8,000 → room = $16,000

### Important FHSA Edge Cases

1. **Account must be open to earn room:** Room only accumulates from the year the account is opened. Unlike TFSA, there is no retroactive room for years before account opening. The app must track `account_open_date` on the investment account to compute room.

2. **Mid-year opening still gets full year's room:** Opening in November 2024 still gives $8,000 for 2024. No pro-rating.

3. **No carry-forward in first year:** There is no prior year to carry forward from in the year of opening. Carry-forward first applies from year 2 onward.

4. **Carry-forward cap resets annually:** The carry-forward is always based on the immediately prior year's unused room, not accumulated unused room from multiple years. This is the most commonly misunderstood rule.

5. **$40,000 lifetime hard ceiling:** Even if room math says more, total contributions can never exceed $40,000. The room calculation must always apply `min(computed_room, 40000 - total_contributions)`.

6. **FHSA room after first-home purchase:** Once the account is used to buy a home, no further contributions are allowed. The account must be closed within 1 year. The app should support marking the account as "used for home purchase" to stop tracking room.

7. **FHSA → RRSP transfer:** Unused FHSA funds can be transferred to RRSP/RRIF without using RRSP contribution room. The app does not need to model this in v1 but should support a transfer transaction between the accounts.

### Implementation Model

```typescript
const calcFhsaAvailableRoom = (
  accountOpenYear: number,
  currentYear: number,
  totalContributionsCents: number,
  priorYearContributionsCents: number, // contributions made specifically in currentYear - 1
): number => {
  if (currentYear < accountOpenYear) return 0;

  const annualLimitCents = 800000; // $8,000 in cents
  const lifetimeLimitCents = 4000000; // $40,000 in cents

  // Prior year earned room
  const priorYearEarnedCents = currentYear > accountOpenYear ? annualLimitCents : 0;
  const priorYearUnusedCents = Math.max(0, priorYearEarnedCents - priorYearContributionsCents);
  const carryForwardCents = Math.min(priorYearUnusedCents, annualLimitCents);

  const currentYearRoomCents = annualLimitCents + carryForwardCents;
  const lifetimeRemainingCents = lifetimeLimitCents - totalContributionsCents;

  return Math.max(0, Math.min(currentYearRoomCents, lifetimeRemainingCents));
};
```

**Note:** The above is a simplified model. In practice the app would need to look at the actual contribution history by year to compute prior year unused room. The `contribution_room_settings` table should store computed room snapshots to avoid re-deriving from raw transaction history on every request.

---

## 5. Shared Expense Settlement Patterns

**Confidence: MEDIUM** — Based on analysis of Splitwise/Tricount UX patterns and general industry practice. The ploutizo settlement model is already well-specified in REQUIREMENTS.md; this section adds implementation nuances.

### How Splitwise Models It

Splitwise uses a **debt graph** approach:
- Every expense creates directed debt edges (A owes B, C owes B)
- Settlement simplification: Splitwise optionally "simplifies debts" by netting out triangular debts — e.g. A owes B $10, B owes C $10, C owes A $10 resolves to nothing
- Per-group balances are shown, not per-expense

**Relevance to ploutizo:** ploutizo's model is per-account (not per-group), which is intentionally simpler. The REQUIREMENTS.md specifies showing individual gross balances per account plus a display-only net settlement line for opposing member pairs. This is the right approach for a household finance tracker where the account is the settlement unit.

### Tricount's Approach

Tricount focuses on trip/event settlement rather than ongoing household finances. Uses a matrix of who-paid-for-what and computes minimum transactions to settle. Less relevant to ploutizo's continuous running balance model.

### The ploutizo Settlement Model

The per-account running balance model from REQUIREMENTS.md is well-suited to the household finance use case:

```
Per account settlement state:
  account_balance = sum(all expense transactions on this account)
  member_balance[m] = sum(member_split_amount for member m on this account)
                    - sum(settlement transactions where payer=m and settled_account=this)
```

### UX Pattern Recommendations

**Settlement card layout (per account with shared transactions):**
```
[Account Name]  Total: $340
  Tamir    $300  [Settle]
  Emily    $40   [Settle]
```

**Net settlement line (cross-account display):**
Only show when member pair has opposing non-zero balances across multiple accounts:
```
After netting across all accounts: Emily → Tamir $90
```

**Settlement flow on "Settle" CTA:**
1. Drawer/dialog opens with amount pre-filled to current balance
2. Allow partial amount (user can reduce the amount)
3. "Source" field: which account/method the payment is coming from (for deduplication)
4. Confirm → creates `settlement` transaction and updates balance immediately

### Key UX Pitfalls

1. **Negative balance confusion:** If a member overpays a settlement (pays more than they owe), their balance goes negative. The UI should handle this gracefully — show as a credit, not confuse users with negative debt language.

2. **Source account deduplication:** When Emily pays Tamir via e-transfer for his TD Visa, this appears in Emily's chequing CSV as an outgoing transfer AND in Tamir's TD Visa CSV as an incoming payment. The settlement system's `settled_account` field on the settlement transaction enables deduplication. Document this clearly for users doing CSV imports.

3. **Zero-balance hiding:** Settlement cards for accounts where all members have $0 balance should be collapsed/hidden. Only surface accounts with outstanding balances.

4. **Account exclusion flag:** Accounts flagged as "each person pays their own" need clear visual indication in the accounts list AND must be excluded from all settlement calculations. A bug here creates incorrect settlement amounts.

5. **Partial settlements:** Allowing partial settlement (less than full balance) is correct behavior (user might pay $100 toward a $300 balance). The settlement transaction records the actual amount paid; the running balance updates accordingly.

### Data Model Consideration

The current schema stores `settled_account_id` on settlement transactions, which is the correct link for deduplication. However, the settlement balance query needs to join across:
- `transactions` (for expenses and splits)
- `transaction_assignees` (for per-member split amounts)
- Settlement transactions (filter by `type = 'settlement'` and `settled_account_id`)

This join is potentially expensive for accounts with large transaction histories. Consider a denormalized `settlement_balances` view or materialized cache for accounts with >500 transactions.

---

## 6. Budget Rollover Logic

**Confidence: MEDIUM** — Based on industry best practices. The surplus-only rollover is explicitly specified in REQUIREMENTS.md; the edge cases below are derived from reasoning about period boundary conditions.

### Core Rule

```
rollover_amount = max(0, prior_period_budget_limit - prior_period_actual_spend)
current_period_effective_limit = base_limit + rollover_amount
```

Overspend does NOT roll over (rollover_amount floor is 0, not negative).

### Period Boundary Edge Cases

**1. Mid-month budget creation**

When a budget is created mid-period (e.g. March 15 for a monthly budget):
- Option A: The current period's budget starts March 15 and ends March 31. The next full period is April 1–30.
- Option B: Treat the partial month as the first period; expense tracking starts from March 15.
- **Recommendation:** Use Option B. The budget period start date is the creation date. The first full rollover calculation happens at the end of that first (potentially partial) period. If the budget was only active for 16 days, the surplus calculation uses only the 16-day base amount — this can feel unfair.
- **Alternative:** Pro-rate the first period's limit: `base_limit × (days_remaining / days_in_period)`. This is fairer but adds complexity.
- **Decision for v1:** Do not pro-rate. Record the full period start/end dates; the first period limit is the full `base_limit`. This is simpler and users can manually adjust if they want.

**2. Rollover when a budget is paused mid-period**

If a user pauses a budget on March 20 and reactivates on April 5:
- The March period runs Mar 1–31. Actual spend during March (before and after pause) counts for the March period.
- Rollover from March to April: `max(0, march_limit - march_spend)`.
- April effective limit = `april_base_limit + march_rollover`.
- **Key question:** Does spend after the pause date count against the paused budget's period? The simplest answer: yes. The pause flag only prevents new budget alerts; it does not retroactively exclude transactions.

**3. Budget period type change**

If a user changes a budget from monthly to weekly: the effective period history is discontinuous. The safest approach: treat a period type change as a new budget (reset rollover history). Do not attempt to carry over rollover amounts across a period type change.

**4. No transactions in a period**

If a user has a $500 Groceries budget and spends $0 in January:
- January rollover = $500
- February effective limit = $500 (base) + $500 (rollover) = $1,000
- This is correct behavior. The surplus-only rule is satisfied.
- Edge case: If this continues for 12 months, the effective limit becomes `$500 + $500 = $1,000` (rollover is always at most one prior period's surplus, not cumulative over many periods).

**5. Rollover chain accumulation cap**

The spec says "surplus only" but does not cap rollover accumulation. Consider whether rollover should be:
- Option A: Only the immediately prior period's surplus (what most apps do)
- Option B: Cumulative surplus across all prior periods (can lead to very large effective limits after months of underspending)

**Recommendation:** Cap rollover to at most the `base_limit` (i.e. max rollover = base amount). This prevents runaway budget limits that confuse users. Example: $500 base, $500 rollover max → effective limit never exceeds $1,000.

**6. Budget deletion with rollover history**

If a budget is deleted and recreated for the same category:
- The old budget's rollover history is gone.
- The new budget starts fresh with no rollover.
- This is correct and expected — no special handling needed.

**7. Calendar year boundary (Dec → Jan)**

Monthly budgets crossing a calendar year boundary behave identically to any other month transition. No special handling needed.

### Implementation Model

```typescript
const calcBudgetPeriodSpend = (
  categoryId: string,
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
): number => {
  // Sum expense transaction amounts for this category in this org
  // within [periodStart, periodEnd] where type = 'expense' and category_id = categoryId
  // Returns cents
};

const calcBudgetRollover = (
  baseLimitCents: number,
  priorPeriodStart: Date,
  priorPeriodEnd: Date,
  priorPeriodActualSpendCents: number,
): number => {
  const surplus = Math.max(0, baseLimitCents - priorPeriodActualSpendCents);
  // Cap rollover at base_limit to prevent runaway accumulation
  return Math.min(surplus, baseLimitCents);
};

const calcEffectiveBudgetLimit = (
  baseLimitCents: number,
  rolloverEnabled: boolean,
  rolloverAmountCents: number,
): number => {
  if (!rolloverEnabled) return baseLimitCents;
  return baseLimitCents + rolloverAmountCents;
};
```

### Storage Consideration

Whether to store rollover snapshots or recompute:
- **Recompute on every view:** Simple but potentially slow for long budget histories.
- **Store rollover amount per period:** Pre-computed at period end; faster reads. Requires a budget periods or budget snapshots table.
- **Recommendation for v1:** Recompute. Budget histories are short (months) and the query is bounded. Add a period snapshot table in v2 if performance becomes an issue.

---

## Key Gotchas

- **Amex Canada CSV sign is INVERTED:** Positive = charge (expense). Every other bank uses negative = outgoing. Normalizer must explicitly invert Amex amounts. This is the single most dangerous CSV parsing bug.
- **BOM in CSV files:** Strip the UTF-8 BOM (`\uFEFF`) before parsing ALL CSV inputs, not just specific banks. BMO exports have been reported with BOM.
- **TFSA withdrawals restore room in the FOLLOWING calendar year, not immediately.** The v1 app does not model withdrawals in the room calculation (contributions only). Document this limitation explicitly in the UI.
- **FHSA carry-forward does NOT compound.** It is always based on the prior year's unused room only, capped at $8,000. Common misconception: people think unused room accumulates over multiple unfunded years.
- **FHSA room requires account to be OPEN.** Unlike TFSA (which gives retroactive room from age 18), FHSA room only starts from the year the account is opened. The `account_open_date` field is required for correct room calculation.
- **Budget rollover should be capped at base_limit to prevent runaway limits.** REQUIREMENTS.md does not specify a cap — add one.
- **Partial settlement can create negative member balances** if they overpay. Handle this in UI.
- **Canadian bank CSV headers are not standardized.** They have changed in the past and may change again. The detection logic must be versioned and testable. Write normalizer functions as pure functions with fixture-based tests.
- **Scotiabank may export Windows-1252 encoding** for older accounts. Use `iconv-lite` or the `encoding` package to handle non-UTF-8 inputs.
- **CIBC and EQ Bank use YYYY-MM-DD dates** — all others use MM/DD/YYYY. Date parsing must be bank-specific, not a single shared parser.

---

## Recommendations

### CSV Import

- Write each bank normalizer as a pure function: `(rawRow: Record<string, string>) => NormalizedRow`. Test with fixture CSVs committed to the repo.
- Detect bank format from header columns, not filename. Users rename files.
- Apply BOM stripping before CSV parsing as a universal pre-processing step.
- For Amex: document the sign inversion in the normalizer code with a comment.
- For Scotiabank: implement `iconv-lite` fallback for non-UTF-8 content.
- Add a bank-format detection function that returns `null` for unrecognized formats, triggering a user-visible error ("This CSV format was not recognized. Supported banks: TD, RBC, CIBC...").
- Store the detected bank format on the `import_batches` record for debugging and future rule improvements.
- **Test fixtures needed:** Obtain or create sample CSVs for each of the 8 banks before building the normalizer. Real exports are the only reliable source of truth — training data confidence on exact column names is LOW.

### TFSA

- Hardcode `TFSA_ANNUAL_LIMITS` as a `Record<number, number>` constant in `packages/db` or `packages/types`. Update each January.
- Always include all years from `max(2009, birthYear + 18)` to `currentYear` inclusive.
- Document in UI: "Your actual CRA room may differ due to withdrawals made in prior years, years of non-residency, or contributions to accounts not tracked here."
- Add a "Learn more" link to CRA's TFSA contribution page.

### RRSP

- v1: manual room input only. Store as `manual_rrsp_room_cents` in `contribution_room_settings`. Display field labeled "Available RRSP room (from your NOA or CRA My Account)."
- Show last-updated date next to the manual room entry so users know when they last refreshed it.
- Warn at `contributions > manual_room + 200000` (the $2,000 lifetime over-contribution buffer).

### FHSA

- Always compute effective room with `min(computed_room, 40000_00 - total_contributions_cents)` to enforce the lifetime cap.
- Store `account_open_year` on the investment account (or derive from `created_at`).
- To compute prior year's unused room, the query needs contribution history grouped by year — not just total contributions.
- Add support for "used for home purchase" status on FHSA accounts — freezes room and prevents further contributions.

### Settlement

- Index `transactions` on `(org_id, account_id, type)` and `(org_id, settled_account_id, type)` for efficient settlement balance queries.
- Hide settlement cards for accounts with zero balance across all members.
- Show settlement amounts with the breakdown: "You owe $300 (55 transactions, $850 total spend, your share: $300)."
- Consider a "settle all" option that generates individual settlement transactions per account in one action.

### Budgets

- Cap rollover at `base_limit` (not in REQUIREMENTS.md — add to spec).
- For the first partial period when a budget is created mid-month: use the full `base_limit`, not a prorated amount. Simpler to implement and explain.
- Store `effective_limit_cents` per period alongside `base_limit_cents` so the rollover calculation doesn't need to recompute the entire history chain.
- Budget period queries must use `>=` on start and `<=` on end (inclusive bounds). Check timezone handling — store dates as UTC midnight.
