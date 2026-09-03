# Shared import file failures

Authority: [Spec: Format-Agnostic Import Parse Module](https://linear.app/ploutizo/document/spec-format-agnostic-import-parse-module-1c2493be019e).

These cases fail the whole upload before draft creation. They are distinct from Invalid import rows, which stay in a recognized file.

## Detection rules

Detection is from file contents — a content profile match, not institution inference. The selected credit-card account is the only account decision. CSV contents never identify a bank, issuer, or source account.

Headerless files use strict positional signatures and resolve to a **generic positional content profile** (never an institution):

- `mdy_debit_credit_balance`: five columns, `MM/DD/YYYY` dates, monetary balance in column 5
- `iso_debit_credit_masked_card`: five columns, `YYYY-MM-DD` dates, masked card in column 5

If no profile matches or multiple match, the result is `mapping_required` — the member must choose a profile or supply a custom mapping.

## File-level failure categories

| Category | Code | Example |
| --- | --- | --- |
| No recognized profile and member has not submitted a selection | `mapping_required` (not a failure — needs member decision) | `headerless-unrecognized.csv` |
| Member submitted an invalid profile selection | `IMPORT_INVALID_SELECTION` | profile ID doesn't match the file |
| Ambiguous file (two profiles match) | `IMPORT_FILE_AMBIGUOUS` | only occurs when two profiles match the same file |
| Unreadable CSV | `IMPORT_FILE_CORRUPT` | unclosed quote, trailing characters after a quoted field, unquoted interior quote |
| Empty | `IMPORT_FILE_EMPTY` | blank file or only a header row |
| No importable rows after normalization | `IMPORT_FILE_NO_ROWS` | every row structurally unusable |
| Oversize | `IMPORT_FILE_TOO_LARGE` | over 512 KB or 1,000 data rows |

UTF-8 BOM is stripped during read and is not a failure. Tests should prefix an approved fixture with `\uFEFF` rather than committing a second copy.

## Row-level boundary

Once a file is recognized (or a selection is confirmed), malformed dates, amounts, debit/credit combinations, and unsupported PC `Type` values are Invalid import rows. They do not fail the file when at least one row is importable.
