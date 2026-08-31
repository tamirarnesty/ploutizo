# Shared import file failures

Authority: [Spec: Approved Bank Import Formats and Financial Institutions](https://linear.app/ploutizo/document/spec-approved-bank-import-formats-and-financial-institutions-019cae9f9dc4).

These cases fail the whole upload before draft creation. They are distinct from Invalid import rows, which stay in a recognized file.

## Detection rules

Detection is from file contents, banks first, then `internal`, then unsupported. The selected card does not choose the parser.

Headerless files use strict positional signatures. A shared TD/CIBC mapper is allowed, but a specific issuer id is returned only when the signature is conclusive:

- TD: five columns and `MM/DD/YYYY` dates
- CIBC: five columns and `YYYY-MM-DD` dates

If that is not reliable, do not guess. Leave `detectedInstitutionId` null so no institution mismatch warning is shown.

A detected issuer mismatch is a non-blocking warning only when both the detected format institution and the selected card's Financial institution are known and different.

## File-level failure categories

| Category | Code | Example |
| --- | --- | --- |
| Unrecognized structure | `IMPORT_FILE_UNRECOGNIZED` | `headerless-unrecognized.csv` (three columns, no bank or internal signature) |
| Inconclusive headerless layout | `IMPORT_FILE_UNRECOGNIZED` or `IMPORT_FILE_AMBIGUOUS` | `headerless-mixed-dates.csv` (five columns, mixed `MM/DD/YYYY` and `YYYY-MM-DD`). Must not return `td` or `cibc`. Use unrecognized if neither adapter matches; ambiguous if both would match. |
| Ambiguous bank match | `IMPORT_FILE_AMBIGUOUS` | two registered bank adapters match the same file |
| Unreadable CSV | `IMPORT_FILE_CORRUPT` | unclosed quote, trailing characters after a quoted field, unquoted interior quote |
| Empty / no importable rows | `IMPORT_FILE_EMPTY` | blank file, headers only, or every row structurally unusable |
| Oversize | `IMPORT_FILE_TOO_LARGE` | over 512 KB or 1,000 data rows |

UTF-8 BOM is stripped during read and is not a failure. PLO-33 tests should prefix an approved fixture with `\uFEFF` rather than committing a second copy.

## Row-level boundary

Once a file is recognized, malformed dates, amounts, debit/credit combinations, and unsupported PC `Type` values are Invalid import rows. They do not fail the file when at least one row is importable.
