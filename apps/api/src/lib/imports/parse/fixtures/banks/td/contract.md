# TD CSV contract

Format id: `td`. Financial institution: `td`.

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

## Layout

Headerless export. Strict positional signature, five columns:

| Index | Field | Role |
| --- | --- | --- |
| 0 | transaction date | `MM/DD/YYYY` |
| 1 | description | source description |
| 2 | debit | expense amount when populated |
| 3 | credit | refund amount when populated |
| 4 | running balance | provenance only |

A shared headerless mapper with CIBC is allowed. Return `td` only when this signature is established: five columns and `MM/DD/YYYY` dates on the rows that have a parseable date. A minority of unparseable dates does not make the file unrecognized; those rows are Invalid import rows. Do not guess an issuer from a generic five-column file.

The current CSV reader treats the first nonblank row as headers. PLO-33 must give headerless normalizers raw positional records.

## Dates

Parse column 0 as `MM/DD/YYYY`. Emit date-only `YYYY-MM-DD`. Do not add a time.

## Amounts and types

Debit is expense baseline; credit is refund baseline. Exactly one of debit or credit is populated on an accepted row. Both populated, neither populated, or a non-numeric amount is an Invalid import row.

Emit a positive absolute amount. Never emit `parsedType: settlement`. Running balance is not used for direction.

Bill payment rows use the refund (credit) baseline plus the shared exact phrase vault. Example: `PAYMENT - THANK YOU` matches `PAYMENT THANK YOU`.

## Identifiers

No transaction-level external id. Do not use running balance as an identifier.

## Failures

Malformed dates or debit/credit combinations in a recognized TD file are Invalid import rows. Unreadable input, unrecognized or mixed headerless structure, or no importable rows are Import file failures.

When a headerless file cannot reliably be identified as TD, leave `detectedInstitutionId` null so no institution mismatch warning is shown.

## Fixtures

`statement.csv`: debit expense, credit refund, credit `PAYMENT - THANK YOU`, both debit and credit populated.
