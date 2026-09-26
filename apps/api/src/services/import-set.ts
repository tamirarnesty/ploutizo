import { verifyImportSet } from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type { ImportRequirementFailure } from '@ploutizo/types';
import type { ImportRowProjection } from '@ploutizo/utils/import-set-verification';
import type { ImportDraftSummaryRow } from '@/lib/queries/imports';
import { DomainError, NotFoundError } from '@/lib/errors';
import { fetchDraftSummaryById, listDraftRows } from '@/lib/queries/imports';
import { loadImportSetFacts } from '@/services/import-set-facts';

/** Continue / Finalize request: the session import set on one import draft. */
export interface ImportSetRequest {
  orgId: string;
  batchId: string;
  rowIds: readonly string[];
}

export type VerifiedImportDraft = ImportDraftSummaryRow & { accountId: string };

export type VerifyImportSetForDraftResult =
  | {
      ready: true;
      draft: VerifiedImportDraft;
      projection: readonly ImportRowProjection[];
    }
  | { ready: false; failures: ImportRequirementFailure[] };

/** Import set verification over current draft rows. Callers hold the draft lock. */
export const verifyImportSetForDraft = async (
  tx: Transaction,
  { orgId, batchId, rowIds }: ImportSetRequest,
  options?: { summary?: ImportDraftSummaryRow | null }
): Promise<VerifyImportSetForDraftResult> => {
  const summary =
    options?.summary ?? (await fetchDraftSummaryById(orgId, batchId, tx));
  if (!summary) throw new NotFoundError('Import draft not found.');
  const { accountId } = summary;
  if (!accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }
  const draft = { ...summary, accountId };

  const selectedRowIds = new Set(rowIds);
  const draftRows = await listDraftRows(orgId, batchId, tx);
  const draftRowIds = new Set(draftRows.map((row) => row.id));
  if ([...selectedRowIds].some((rowId) => !draftRowIds.has(rowId))) {
    throw new NotFoundError('Import draft row not found.');
  }

  const verified = verifyImportSet(
    await loadImportSetFacts(tx, {
      orgId,
      accountId,
      rowCount: draft.rowCount,
      draftRows,
      selectedRowIds,
    })
  );
  if (!verified.ready) {
    return { ready: false, failures: verified.failures };
  }

  return { ready: true, draft, projection: verified.projection };
};
