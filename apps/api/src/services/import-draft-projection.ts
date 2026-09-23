import { verifyImportSetForContinue } from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type { ImportRequirementFailure } from '@ploutizo/types';
import type { PreparedImportOutcomeProjection } from '@ploutizo/utils/import-set-verification';
import type { ImportDraftSummaryRow } from '@/lib/queries/imports';
import { DomainError, NotFoundError } from '@/lib/errors';
import { fetchDraftSummaryById, listDraftRows } from '@/lib/queries/imports';
import { loadImportContinueDraftFacts } from '@/services/import-continue';

export type VerifyImportDraftProjectionResult =
  | {
      ready: true;
      draft: ImportDraftSummaryRow;
      projection: readonly PreparedImportOutcomeProjection[];
    }
  | { ready: false; failures: ImportRequirementFailure[] };

/** Shared Continue/Finalize verification for a session import set (`rowIds`). */
export const verifyImportDraftProjectionForRowIds = async (
  orgId: string,
  batchId: string,
  rowIds: readonly string[],
  tx: Transaction
): Promise<VerifyImportDraftProjectionResult> => {
  const draft = await fetchDraftSummaryById(orgId, batchId, tx);
  if (!draft) throw new NotFoundError('Import draft not found.');
  if (!draft.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }

  const uniqueRowIds = [...new Set(rowIds)];
  const draftRows = await listDraftRows(orgId, batchId, tx);
  const rowIdSet = new Set(uniqueRowIds);
  if (
    draftRows.filter((row) => rowIdSet.has(row.id)).length !==
    uniqueRowIds.length
  ) {
    throw new NotFoundError('Import draft row not found.');
  }

  const draftFacts = await loadImportContinueDraftFacts(
    orgId,
    draft.accountId,
    draft,
    draftRows,
    rowIdSet,
    tx
  );
  const verified = verifyImportSetForContinue(draftFacts);
  if (!verified.ready) {
    return { ready: false, failures: verified.failures };
  }

  return { ready: true, draft, projection: verified.projection };
};
