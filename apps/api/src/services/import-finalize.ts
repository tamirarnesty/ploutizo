import { db } from '@ploutizo/db';
import { countImportOutcomes } from '@ploutizo/types';
import type { ImportRowProjection } from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type { ImportRequirementFailureDetails } from '@ploutizo/types';
import type { ImportCompletedResult } from '@ploutizo/validators';
import type {
  ImportSetRequest,
  VerifiedImportDraft,
} from '@/services/import-set';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  completeImportBatch,
  fetchImportBatchSummaryById,
  lockImportDraftBatch,
} from '@/lib/queries/imports';
import { verifyImportSetForDraft } from '@/services/import-set';
import { insertImportTransactionLinks } from '@/lib/queries/import-transaction-links';
import { prepareImportTransactionCreates } from '@/services/import-create-input';
import { toImportCompletedResult } from '@/services/import-history';
import { createTransactionsInTx } from '@/services/transaction-create';

const conflictError = () =>
  new DomainError(
    409,
    'This import draft cannot be finalized.',
    'IMPORT_FINALIZE_CONFLICT'
  );

const applyImportSetProjection = async (
  tx: Transaction,
  orgId: string,
  draft: VerifiedImportDraft,
  projection: readonly ImportRowProjection[]
): Promise<ImportCompletedResult> => {
  const prepared = prepareImportTransactionCreates({
    orgId,
    draft,
    projection,
  });
  await createTransactionsInTx(tx, orgId, prepared.items);
  await insertImportTransactionLinks(tx, prepared.links);

  const counts = countImportOutcomes(projection);
  const completed = await completeImportBatch(tx, {
    orgId,
    batchId: draft.id,
    completedAt: new Date(),
    createdCount: counts.created,
    matchedCount: counts.matched,
    skippedCount: counts.skipped,
    invalidCount: counts.invalid,
  });
  if (!completed) {
    throw conflictError();
  }

  const summary = await fetchImportBatchSummaryById(orgId, draft.id, tx);
  if (!summary) {
    throw new DomainError(500, 'Completed import is missing after finalize.');
  }

  return toImportCompletedResult(summary);
};

export const finalizeImportDraft = async (
  request: ImportSetRequest
): Promise<ImportCompletedResult> =>
  db.transaction(async (tx) => {
    const { orgId, batchId } = request;
    await lockImportDraftBatch(tx, orgId, batchId);

    const batch = await fetchImportBatchSummaryById(orgId, batchId, tx, {
      forUpdate: true,
    });
    if (!batch) throw new NotFoundError('Import draft not found.');

    // Idempotent finalize: rowIds are ignored once the batch is completed.
    if (batch.status === 'completed') return toImportCompletedResult(batch);
    if (batch.status !== 'draft') throw conflictError();

    const verified = await verifyImportSetForDraft(tx, request, {
      summary: batch,
    });
    if (!verified.ready) {
      throw new DomainError<ImportRequirementFailureDetails>(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_FINALIZE_NOT_READY',
        { rows: verified.failures }
      );
    }

    return applyImportSetProjection(
      tx,
      orgId,
      verified.draft,
      verified.projection
    );
  });
