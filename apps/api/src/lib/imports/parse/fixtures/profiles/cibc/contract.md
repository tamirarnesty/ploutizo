# ISO debit/credit/masked-card CSV contract

Content profile: `iso_debit_credit_masked_card`. This is a generic positional layout, not a bank. Historically observed on CIBC credit-card exports; the same layout may appear from any issuer.

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

## Layout

Headerless export. Strict positional signature, five columns:

| Index | Field              | Role                                        |
| ----- | ------------------ | ------------------------------------------- |
| 0     | transaction date   | `YYYY-MM-DD`                                |
| 1     | description        | source description                          |
| 2     | debit              | expense amount when populated               |
| 3     | credit             | refund amount when populated                |
| 4     | masked card number | account metadata in `4505********1234` form |

A shared headerless mapper with `mdy_debit_credit_balance` is allowed. Detection (`matches`) requires every data row to keep this signature: five columns, `YYYY-MM-DD` (not MDY) in column 0, a masked card `NNNN********NNNN` in column 5, and at least one row with exclusive debit or credit. Auto-detection does not apply — the member must select this profile (or a custom mapping) before draft creation. Files that look like this layout are suggested as candidates on `mapping_required`.

After the member confirms this profile (`acceptsSelection`), a minority of signature-breaking rows are Invalid import rows, not `IMPORT_INVALID_SELECTION`. Confirmation still requires five columns and at least one row whose date is ISO and not MDY. Confirming this profile on an MDY-only file is `IMPORT_INVALID_SELECTION`.

Do not guess an issuer from a generic five-column file.

## Dates

Parse column 0 as `YYYY-MM-DD`. Emit the same date-only value. Do not add a time.

## Amounts and types

Debit is expense baseline; credit is refund baseline. Exactly one of debit or credit is populated on an accepted row. Both populated, neither populated, or a non-numeric amount is an Invalid import row.

Emit a positive absolute amount. Never emit `parsedType: settlement`.

Bill payment rows use the refund (credit) baseline plus the shared exact phrase vault. There is no CIBC-specific issuer-name rule. Example: `PAIEMENT MERCI`.

## Identifiers

No transaction-level external id. The masked card number is account metadata, not `externalId`.

## Failures

Malformed dates or debit/credit combinations after confirmation are Invalid import rows. Unreadable input, mixed headerless structure that does not accept this profile, or no importable rows are Import file failures. Without a selection, a file that fails the strict detection signature returns `mapping_required` rather than auto-importing.

## Fixtures

`statement.csv`: debit expense, credit refund, credit `PAIEMENT MERCI`, both debit and credit populated.
