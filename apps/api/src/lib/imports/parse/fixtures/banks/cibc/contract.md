# CIBC CSV contract

Format id: `cibc`. Financial institution: `cibc`.

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

## Layout

Headerless export. Strict positional signature, five columns:

| Index | Field | Role |
| --- | --- | --- |
| 0 | transaction date | `YYYY-MM-DD` |
| 1 | description | source description |
| 2 | debit | expense amount when populated |
| 3 | credit | refund amount when populated |
| 4 | masked card number | account metadata in `4505********1234` form |

A shared headerless mapper with TD is allowed. Return `cibc` only when this signature is established: five columns and `YYYY-MM-DD` dates on the rows that have a parseable date. A minority of unparseable dates does not make the file unrecognized; those rows are Invalid import rows. Do not guess an issuer from a generic five-column file.

The current CSV reader treats the first nonblank row as headers. PLO-33 must give headerless normalizers raw positional records.

## Dates

Parse column 0 as `YYYY-MM-DD`. Emit the same date-only value. Do not add a time.

## Amounts and types

Debit is expense baseline; credit is refund baseline. Exactly one of debit or credit is populated on an accepted row. Both populated, neither populated, or a non-numeric amount is an Invalid import row.

Emit a positive absolute amount. Never emit `parsedType: settlement`.

Bill payment rows use the refund (credit) baseline plus the shared exact phrase vault. There is no CIBC-specific issuer-name rule. Example: `PAIEMENT MERCI`.

## Identifiers

No transaction-level external id. The masked card number is account metadata, not `externalId`.

## Failures

Malformed dates or debit/credit combinations in a recognized CIBC file are Invalid import rows. Unreadable input, unrecognized or mixed headerless structure, or no importable rows are Import file failures.

When a headerless file cannot reliably be identified as CIBC, leave `detectedInstitutionId` null so no institution mismatch warning is shown.

## Fixtures

`statement.csv`: debit expense, credit refund, credit `PAIEMENT MERCI`, both debit and credit populated.
