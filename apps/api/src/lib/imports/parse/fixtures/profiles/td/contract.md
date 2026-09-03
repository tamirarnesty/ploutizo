# MDY debit/credit/balance CSV contract

Content profile: `mdy_debit_credit_balance`. This is a generic positional layout, not a bank. Historically observed on TD credit-card exports; the same layout may appear from any issuer.

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

## Layout

Headerless export. Strict positional signature, five columns:

| Index | Field            | Role                          |
| ----- | ---------------- | ----------------------------- |
| 0     | transaction date | `MM/DD/YYYY`                  |
| 1     | description      | source description            |
| 2     | debit            | expense amount when populated |
| 3     | credit           | refund amount when populated  |
| 4     | running balance  | provenance only               |

A shared headerless mapper with `iso_debit_credit_masked_card` is allowed. Detection (`matches`) requires every data row to keep this signature: five columns, `MM/DD/YYYY` (not ISO) in column 0, a monetary amount in column 5, and at least one row with exclusive debit or credit. Auto-detection does not apply — the member must select this profile (or a custom mapping) before draft creation. Files that look like this layout are suggested as candidates on `mapping_required`.

After the member confirms this profile (`acceptsSelection`), a minority of signature-breaking rows are Invalid import rows, not `IMPORT_INVALID_SELECTION`. Confirmation still requires five columns and at least one row whose date is `MM/DD/YYYY` and not ISO. Confirming this profile on an ISO-only file is `IMPORT_INVALID_SELECTION`.

Do not guess an issuer from a generic five-column file.

## Dates

Parse column 0 as `MM/DD/YYYY`. Emit date-only `YYYY-MM-DD`. Do not add a time.

## Amounts and types

Debit is expense baseline; credit is refund baseline. Exactly one of debit or credit is populated on an accepted row. Both populated, neither populated, or a non-numeric amount is an Invalid import row.

Emit a positive absolute amount. Never emit `parsedType: settlement`. Running balance is not used for direction.

Bill payment rows use the refund (credit) baseline plus the shared exact phrase vault. Example: `PAYMENT - THANK YOU` matches `PAYMENT THANK YOU`.

## Identifiers

No transaction-level external id. Do not use running balance as an identifier.

## Failures

Malformed dates or debit/credit combinations after confirmation are Invalid import rows. Unreadable input, mixed headerless structure that does not accept this profile, or no importable rows are Import file failures. Without a selection, a file that fails the strict detection signature returns `mapping_required` rather than auto-importing.

## Fixtures

`statement.csv`: debit expense, credit refund, credit `PAYMENT - THANK YOU`, both debit and credit populated.
