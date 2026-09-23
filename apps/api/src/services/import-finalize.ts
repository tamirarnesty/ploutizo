import { db } from '@ploutizo/db';
import { countImportOutcomes } from '@ploutizo/types';
import type { ImportRowProjection } from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type {
  ImportCompletedResult,
  ImportRequirementFailureDetails,
  ImportTransactionLinkOutcome,
} from '@ploutizo/types';
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
import {
  sortCreatedImportOutcomes,
  toImportCreateTransactionInput,
} from '@/services/import-create-input';
import { toImportCompletedResult } from '@/services/import-history';
import { createTransactionInTx } from '@/services/transactions';

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
  const transactionIdByRowId = new Map<string, string>();
  for (const row of projection) {
    if (row.outcome === 'matched' && row.transactionId) {
      transactionIdByRowId.set(row.batchRowId, row.transactionId);
    }
  }

  const links: {
    orgId: string;
    batchId: string;
    batchRowId: string;
    transactionId: string;
    outcome: ImportTransactionLinkOutcome;
  }[] = [];

  const createdRows = projection.filter((row) => row.outcome === 'created');
  for (const row of sortCreatedImportOutcomes(createdRows)) {
    const values = row.snapshot.reviewedValues;
    const refundOf =
      values.refundOf ??
      (values.refundOfBatchRowId
        ? (transactionIdByRowId.get(values.refundOfBatchRowId) ?? null)
        : null);
    const inserted = await createTransactionInTx(
      tx,
      orgId,
      toImportCreateTransactionInput({
        accountId: draft.accountId,
        batchId: draft.id,
        snapshot: row.snapshot,
        refundOf,
      })
    );
    transactionIdByRowId.set(row.batchRowId, inserted.id);
    links.push({
      orgId,
      batchId: draft.id,
      batchRowId: row.batchRowId,
      transactionId: inserted.id,
      outcome: 'created',
    });
  }

  for (const row of projection) {
    if (row.outcome !== 'matched' || !row.transactionId) continue;
    links.push({
      orgId,
      batchId: draft.id,
      batchRowId: row.batchRowId,
      transactionId: row.transactionId,
      outcome: 'matched',
    });
  }

  await insertImportTransactionLinks(tx, links);

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

    const verified = await verifyImportSetForDraft(tx, request);
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
