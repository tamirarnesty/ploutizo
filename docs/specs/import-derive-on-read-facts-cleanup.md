# Import derive-on-read facts cleanup

## Problem Statement

During Review import, the system persists review-derived row state and upload-time row counts alongside the durable facts that actually define an import draft. Those values become stale as members edit reviewed import values, selection, refund links, and settlement details.

This creates two sources of truth:

- the durable import draft facts
- persisted review status and upload-time counts

The import module should instead have one source of durable facts with read and write modules that adapt those facts for the Import hub, Review import, Continue, and future Finalize/import history capabilities.

Import history must remain broad and useful. A household member should be able to understand what happened to an uploaded file, including whether it is a draft, completed, discarded, expired, or undone, plus the outcome counts after Finalize. This cleanup must not reduce history to only successfully created transactions.

## Solution

Remove persisted review-derived state while retaining durable source and lifecycle facts.

The import module will have these conceptual fact groups:

1. **Import draft facts** — source provenance, parsed values, reviewed import values, and import-set selection.
2. **Review evaluation** — derived status, blockers, invalid reasons, refund-link issues, and live review counts.
3. **Prepared import set** — temporary Continue → Finalize staging containing a stable reviewed-value snapshot.
4. **Completed import result** — durable batch lifecycle and finalized outcome facts for Import history.
5. **Transaction provenance** — links from created or matched transactions back to the import batch and source identity.

This specification covers the derive-on-read cleanup and the seams needed by the future result/history module. It does not implement Finalize or completed-import result persistence.

## User Stories

1. As a household member, I want a new import draft to retain the original file provenance, so that I can understand where each candidate transaction came from.
2. As a household member, I want parsed import values to remain available during review, so that I can compare my corrections with the original statement.
3. As a household member, I want my reviewed import values to persist when I leave and resume Review import, so that I do not lose corrections.
4. As a household member, I want row readiness to update after I edit a reviewed value, so that the interface reflects the current draft facts.
5. As a household member, I want invalid reasons to describe the current reviewed values, so that stale upload-time messages do not mislead me.
6. As a household member, I want refund-link issues to update when I change a refund target, so that Continue reflects current facts.
7. As a household member, I want selection to define the current import set, so that unselected rows are not accidentally prepared for Finalize.
8. As a household member, I want the Import hub to show current review counts, so that its centralized view reflects the same facts as Review import.
9. As a household member, I want the Import hub to show active drafts without requiring persisted status snapshots, so that the hub can derive presentation data from the import module.
10. As a household member, I want a completed import to remain visible in Import history, so that I can understand what happened to an uploaded file after Finalize.
11. As a household member, I want Import history to distinguish draft, completed, discarded, expired, and undone imports, so that lifecycle state is visible at a glance.
12. As a household member, I want Import history to show finalized outcome counts, so that a mixed import can explain created, matched, skipped, invalid, unresolved, and unprocessed rows.
13. As a household member, I want history to exclude incomplete Review import state, so that draft facts are not mistaken for finalized outcomes.
14. As a household member, I want created transactions to retain import provenance, so that I can trace a transaction back to its source batch.
15. As a household member, I want matched import rows to retain their relationship to the existing transaction, so that duplicate handling remains explainable.
16. As a household member, I want temporary prepared staging to disappear after Finalize succeeds, so that stale revisions do not appear to be current history.
17. As a household member, I want a failed or rejected Continue to leave the draft facts intact, so that I can correct the rows and try again.
18. As a household member, I want a discarded draft to remain represented by its batch lifecycle, so that I know the uploaded file was intentionally discarded.
19. As a household member, I want the system to avoid retaining dropped row payloads after completion when they are not needed for history, so that history remains useful without duplicating draft data.
20. As a developer, I want one evaluator to derive review state from durable facts, so that GET, the client working copy, the Import hub, and Continue agree.
21. As a developer, I want database records to contain facts rather than presentation state, so that edits cannot leave stale status columns behind.
22. As a developer, I want the Import hub read module to derive counts from the same evaluator, so that the hub does not create another source of truth.
23. As a developer, I want upload persistence to write only durable import facts and immutable source facts, so that initial classification does not become a second status authority.
24. As a developer, I want the prepared-set module to have a clear staging lifecycle, so that PLO-56 can implement Finalize without conflating staging and history.
25. As a developer, I want the completed-import result contract documented before Finalize is built, so that PLO-56 can preserve broad history without reusing review-derived columns.
26. As a developer, I want the existing API and client interfaces to omit persisted derived fields, so that adapters cannot accidentally trust database status.
27. As a developer, I want tests to cross the highest useful module seam, so that internal evaluator or adapter refactors do not require rewriting behavior tests.
28. As a developer, I want dead count mutation helpers removed, so that future contributors do not revive a persistence path that contradicts the fact model.
29. As a developer, I want migration handling to preserve immutable upload facts and batch lifecycle facts, so that existing imports remain understandable during schema cleanup.
30. As a developer, I want the domain glossary to distinguish review state, prepared staging, completed result, and transaction provenance, so that future work uses precise language.

## Implementation Decisions

### Durable facts and derived state

- The durable import draft fact store contains source provenance, parsed values, reviewed import values, refund references, tags, assignees, settlement funding, and `selectedForImport`.
- `rowCount` remains as an immutable upload/source fact describing the number of parsed source rows.
- Row `status` and `invalidReason` are derived review presentation values and are not persisted.
- Batch `validRowCount` and `invalidRowCount` are removed as upload-time review snapshots.
- No replacement `excludedFromImport` field is introduced in this cleanup. Selection remains the durable import-set fact; `skipped` is a prepared/finalized outcome, not a Review import status authority.
- The shared evaluator remains the single module that derives row status, blockers, invalid reasons, refund-link issues, and live review counts from durable facts plus external facts.

### Read and write modules

- The upload write module persists source facts, parsed values, initial reviewed values, resolved references, and lifecycle facts only.
- The draft read module loads durable facts and invokes the shared evaluator to construct the Review import view.
- The Import hub read module derives live counts from draft rows and the same evaluator. It may compose facts from multiple sources; it must not persist a second count authority.
- PATCH row and selection writes continue to return durable row facts. Callers rederive presentation state locally.
- Continue re-evaluates the selected import set server-side and creates temporary prepared staging.
- The future Finalize module consumes only the prepared staging for the current revision.

### Prepared staging and completed history contract

- Prepared sets are temporary Continue → Finalize staging, not permanent Import history.
- Prepared staging must be cleaned up after Finalize confirms and transaction writes complete.
- The cleanup is atomic with Finalize: transaction creation, matched-transaction linkage, completed result recording, and staging cleanup must not leave a partially finalized state.
- The completed-import result contract belongs to PLO-56 and must remain separate from Review import status.
- Import history retains broad batch-level lifecycle and finalized outcome information: file/account/source identity, lifecycle state, total rows, outcome counts, and timestamps.
- The finalized result contract may retain successful transaction provenance for created and matched outcomes without retaining full dropped-row draft payloads.
- History excludes active and incomplete Review import state while still showing the batch lifecycle of discarded or otherwise closed imports.

### Schema and migration

- Remove the row status and invalid-reason columns and their database enum dependency.
- Remove the upload-time valid/invalid batch count columns and their insert/update paths.
- Retain batch lifecycle fields and `rowCount`.
- Preserve existing durable review fields and selection.
- Map or validate existing data during migration so no source provenance, reviewed value, or lifecycle fact is lost.
- Remove dead count-adjustment helpers and stale fixtures that model derived database fields.
- Update the working-copy ADR to describe the completed collection/evaluator path, the fact model, and the future prepared-staging/history contract.
- Update the domain glossary to preserve the broader Import history meaning and distinguish it from Review import status.

### Architectural seams

The primary test seam is the shared evaluator over durable import draft facts plus supplied external facts. Existing API and client read adapters should be tested through this seam rather than introducing another status module.

The secondary seam is the Import hub read adapter, which composes draft facts and evaluator output into a centralized summary. Its contract is derived data, not another durable store.

The prepared-set staging seam is documented for PLO-56 but is not implemented by this spec.

## Testing Decisions

- Tests assert observable behavior through the highest useful interface, not database implementation details.
- Evaluator tests cover current review status, blockers, invalid reasons, refund-link issues, and live counts from durable facts.
- Upload tests verify that durable source and review facts are inserted while derived status, invalid reason, and batch valid/invalid counts are not written.
- Draft read tests verify that stale or absent persisted derived fields do not affect the evaluated Review import view.
- PATCH and selection tests verify durable response shapes and continued client rederivation.
- Import hub read tests verify that counts are derived from current rows and evaluator facts rather than stored batch snapshots.
- Migration/schema tests verify that `rowCount`, lifecycle facts, provenance, reviewed values, and selection remain available.
- Prepared-set tests verify the documented staging contract at the existing Continue seam; cleanup and Finalize behavior remain PLO-56 tests.
- Import history tests for finalized outcome summaries belong to PLO-56 and should use the completed-result read seam.
- Prior art includes the shared evaluator tests, import draft view tests, API import route tests, and client working-copy tests.
- Tests should cover mixed rows: ready, needs review, structurally invalid, refund-link blocked, selected, and unselected.

## Out of Scope

- Implementing Finalize or transaction creation.
- Implementing completed-import result persistence or the Import history UI contract.
- Adding lifecycle states beyond the current implementation.
- Designing or implementing transaction undo behavior.
- Retaining full dropped-row payloads as permanent history.
- Redesigning refund matching or merchant classification.
- Changing the TanStack DB working-copy architecture.
- Fixing unrelated PR #127 prepared-revision freshness defects.
- Introducing a new adapter or port without a second concrete adapter.

## Further Notes

- This spec intentionally preserves the broader Import history model from the refined import model: history answers “what happened to this file?”, not only “which transactions were created?”
- “Review import status” and “finalized import outcome” are different concepts and must not share a persisted field.
- `rowCount` is a source fact. Valid/invalid review counts are derived. Finalized outcome counts are a separate future result fact.
- PLO-56 should use this spec’s fact groups and seams when implementing prepared staging cleanup, Finalize, transaction provenance, completed results, and Import history.
