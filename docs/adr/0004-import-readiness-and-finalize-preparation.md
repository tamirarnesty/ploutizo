---
status: accepted
---

# Import readiness and import set verification

Credit card imports must not define a separate notion of transaction validity from manual transaction creation. Selected import rows form the import set; each selected row must satisfy shared transaction requirements, plus import-specific requirements, before Continue shows an **Import finalize preview** and before Finalize creates anything.

## Decision

Import row status is a derived review/UI state, not the authority for whether a row may proceed. The authority is **import set verification**: requirement evaluation over the selected import set, where create outcomes must project to valid transaction candidates under the shared transaction policy and requirement evaluator, and matched outcomes must be accepted same-kind existing transactions that create no new transaction.

Continue and Finalize run the **same** server-side verification over the current import draft rows and the session import set (`rowIds`), under the per-draft advisory lock. Nothing is staged between them:

- **Continue** is stateless. It returns the Import finalize preview, which the review session holds until Finalize or abandon.
- **Finalize** re-verifies from scratch, then creates transactions, links matched transactions, and records the completed result in one database transaction. Finalize on an already completed batch returns the recorded result without re-verifying (idempotent retry).

Verification projects the entire uploaded file, not the selected import set alone: one mutually exclusive outcome per source row, with counts equal to the immutable source `rowCount`.

| Outcome   | Rule                                                         |
| --------- | ------------------------------------------------------------ |
| `created` | Selected create candidate that passed requirement evaluation |
| `matched` | Selected row with an accepted same-kind existing transaction |
| `skipped` | Unselected processable row                                   |
| `invalid` | Structurally invalid row, selected or not                    |

## Consequences

- The transaction policy and requirement evaluator are prerequisites for import readiness work; imports should not copy transaction-form rules.
- The import set is selected rows only, not the entire uploaded file or draft. Unselected rows are outside requirement evaluation and cannot block Continue or Finalize.
- The projection accounts for every source row. Skipped and invalid rows are outcomes inside it; they are not omitted.
- Outcomes are mutually exclusive. Their counts sum to `rowCount`.
- Because Finalize re-verifies current draft rows, anything that changed after Continue (edits, deleted match targets, claimed external ids, removed members) is caught at Finalize with the same requirement failures Continue would report. No snapshot, revision, or preview token is needed.
- Credit card imports produce only expense, refund, or settlement outcomes.
- Expense and refund category is a shared transaction requirement, not an import-only rule.
- New imported settlements must satisfy saved settlement requirements, including funding account; accepted settlement matches finalize as no-op.
- Requirement results use structured keys for UI/API/tests, with presentation copy mapped separately.
