import { evaluateImportMatches } from './evaluate';
import { matchDecisionForSelectionChange } from './decisions';
import type { MatchDecisionsForSelectedRowsInput } from './decisions';
import type { ImportMatchDraftRow } from './types';

/** Derive saved match IDs after selection changes. Rows must already reflect the new selection. */
export const matchDecisionsForSelectedRows = (
  rows: readonly ImportMatchDraftRow[],
  input: MatchDecisionsForSelectedRowsInput
): Map<string, string | null> => {
  const evaluations = evaluateImportMatches(rows, input.options);
  const patches = new Map<string, string | null>();

  for (const rowId of input.rowIds) {
    const row = rows.find((item) => item.id === rowId);
    if (!row) continue;
    const evaluation = evaluations.get(rowId);
    patches.set(
      rowId,
      matchDecisionForSelectionChange({
        selectedForImport: input.selectedForImport,
        currentMatchedTransactionId: row.reviewMatchedTransactionId,
        exactCandidate: evaluation?.exactCandidate ?? null,
        collisionUnresolved: evaluation?.issues.includes('collision') ?? false,
      })
    );
  }

  return patches;
};
