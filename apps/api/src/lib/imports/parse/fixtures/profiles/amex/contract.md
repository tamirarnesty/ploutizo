# Amex CSV contract

Content profile: `amex`. Detection is from file contents, not the selected card's Financial institution.

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

Short and extended exports are one format. Required shared columns support the short export; extended columns are optional.

## Layout

Required headers, in order:

`Date,Date Processed,Description,Card Member,Account #,Amount`

Optional extended headers, after `Amount`:

`Foreign Spend Amount,Commission,Exchange Rate,Merchant,Merchant Address,Merchant City/State,Zip Code,Country,Reference,Category`

Detection matches the required headers from file contents. Extra columns do not create a second format.

## Dates

Parse `Date` as `D MMM YYYY` (day may be one or two digits). Ignore `Date Processed`. Emit date-only `YYYY-MM-DD`. Do not add or synthesize a time.

## Amounts and types

One signed `Amount` column. Positive is expense baseline; negative is refund baseline. Emit a positive absolute amount. Never emit `parsedType: settlement`.

Bill payment rows use the refund baseline. Shared exact phrase vault matching (after uppercasing, trimming, collapsing whitespace/punctuation — never substring) may then classify them as Settlement. Example: `PAYMENT RECEIVED - THANK YOU`.

## Identifiers and hints

- `Reference` is immutable `externalId` provenance when present, after removing exactly one leading spreadsheet apostrophe. Keep the raw cell in `rawData`. Short exports have no `Reference`.
- `Card Member` is an expense/refund-only assignee hint. Resolve it case-insensitively against a member's first or full name. An unmatched value (see `Pat Nomatch` in `short.csv`) leaves account-ownership defaults intact. Settlements never use it.
- `Account #` is card metadata, not an external id. Do not prefill notes from metadata; retain extra columns only as raw provenance.

## Failures

Malformed dates or amounts in a recognized file are Invalid import rows. Unreadable input, unrecognized structure, or no importable rows are Import file failures.

CSV contents never identify a bank or source account. Institution mismatch is not part of import.

## Fixtures

- `short.csv`: expense with unmatched Card Member, refund, vault-phrase bill payment, malformed date.
- `extended.csv`: expense with `Reference`, refund, vault-phrase bill payment, missing amount.
