# PC Financial CSV contract

Content profile: `pc_financial`. Detection is from file contents, not the selected card's Financial institution.

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

## Layout

Headered export. Headers, in order:

`Description,Type,Card Holder Name,Date,Time,Amount`

Observed files quote these headers. Detection is from file contents via these names, not the selected card.

## Dates

Parse `Date` as `MM/DD/YYYY`. Emit date-only `YYYY-MM-DD`. `Time` is source provenance only; do not persist or synthesize a time on the transaction date.

## Amounts and types

`Type` is the authoritative direction signal, not the signed amount:

| `Type`          | Baseline           | Extra                                |
| --------------- | ------------------ | ------------------------------------ |
| `PURCHASE`      | expense            |                                      |
| `INTEREST`      | expense            |                                      |
| `PAYMENT`       | refund             | `classificationHint: 'bill_payment'` |
| any other value | Invalid import row | keep the raw type                    |

Observed purchases and interest are negative; observed payments are positive. Emit a positive absolute amount. Never emit `parsedType: settlement`.

A `PAYMENT` row classifies as Settlement from the hint even when its description is not a phrase-vault value. `statement.csv` uses `PC FINANCIAL PAYMENT THANK YOU` for that case.

## Identifiers and hints

No transaction-level external id. `Card Holder Name` is cardholder metadata, not an assignee hint (Amex `Card Member` is the only approved assignee hint).

## Failures

Unsupported `Type` values, malformed dates, and malformed amounts in a recognized file are Invalid import rows. Unreadable input, unrecognized structure, or no importable rows are Import file failures.

CSV contents never identify a bank or source account. Institution mismatch is not part of import.

## Fixtures

`statement.csv`: `PURCHASE` expense, `INTEREST` expense, `PAYMENT` with a non-vault description, unsupported `FEE` type, malformed date.
