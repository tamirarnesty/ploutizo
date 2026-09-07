---
status: accepted
---

# Import readiness and finalize preparation

Credit card imports must not define a separate notion of transaction validity from manual transaction creation. Selected import rows form the import set; each selected row must satisfy shared transaction requirements, plus import-specific requirements, before Continue can prepare a stable finalize set.

## Decision

Import row status is a derived review/UI state, not the authority for whether a row may proceed. The authority is requirement evaluation over the selected import set: create outcomes must project to valid transaction candidates under the shared transaction policy and requirement evaluator, while matched outcomes must be accepted same-kind existing transactions and create no new transaction.

Continue is a server-verified phase boundary. The review UI may evaluate requirements continuously for icons, tooltips, and button state, but the API re-evaluates the selected import set before creating a prepared import set for Finalize. Final confirmation re-verifies the prepared set before bulk creation and recording of matched/no-op, skipped, and invalid outcomes.

A prepared import set is a revision-bound, immutable projection of the entire uploaded file, not of the selected import set alone. After the selected import set passes verification, Continue persists one mutually exclusive outcome per source row. Outcome counts must equal the immutable source `rowCount`. Selected-only `unprocessed` preparation is removed.

| Outcome   | Rule                                                                              |
| --------- | --------------------------------------------------------------------------------- |
| `created` | Selected create candidate that passed requirement evaluation                      |
| `matched` | Selected row with an accepted same-kind existing transaction                      |
| `skipped` | Unselected processable row                                                        |
| `invalid` | Structurally invalid row, selected or not                                         |

## Consequences

- The transaction policy and requirement evaluator are prerequisites for import readiness work; imports should not copy transaction-form rules.
- The import set is selected rows only, not the entire uploaded file or draft. Unselected rows are outside requirement evaluation and cannot block Continue.
- The prepared import set accounts for every source row. Skipped and invalid rows are recorded outcomes inside the prepared set; they are not omitted from it.
- Prepared outcomes are mutually exclusive. Their counts sum to `rowCount`.
- Credit card imports produce only expense, refund, or settlement outcomes.
- Expense and refund category is a shared transaction requirement, not an import-only rule.
- New imported settlements must satisfy saved settlement requirements, including funding account; accepted settlement matches finalize as no-op.
- Requirement results use structured keys for UI/API/tests, with presentation copy mapped separately.
