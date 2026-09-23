import { db } from '@ploutizo/db';
import { verifyPreparedImportSetForFinalize } from '@ploutizo/utils/import-set-verification';
import { countPreparedOutcomes } from '@ploutizo/types';
import type { PreparedImportOutcomeProjection } from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type {
  ImportCompletedResult,
  ImportRequirementFailure,
  ImportRequirementFailureDetails,
  ImportTransactionLinkOutcome,
} from '@ploutizo/types';
import type { ImportDraftSummaryRow } from '@/lib/queries/imports';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  completeImportBatch,
  fetchImportBatchSummaryById,
  lockImportDraftBatch,
} from '@/lib/queries/imports';
import { verifyImportDraftProjectionForRowIds } from '@/services/import-draft-projection';
import { insertImportTransactionLinks } from '@/lib/queries/import-transaction-links';
import {
  sortCreatedImportOutcomes,
  toImportCreateTransactionInput,
} from '@/services/import-create-input';
import { toImportCompletedResult } from '@/services/import-history';
import { loadImportFinalizeExternalFacts } from '@/services/import-continue';
import { createTransactionInTx } from '@/services/transactions';

const notReadyError = (rows: ImportRequirementFailure[]) =>
  new DomainError<ImportRequirementFailureDetails>(
    400,
    'Some selected rows are not ready to import.',
    'IMPORT_FINALIZE_NOT_READY',
    { rows }
  );

const conflictError = () =>
  new DomainError(
    409,
    'This import draft cannot be finalized.',
    'IMPORT_FINALIZE_CONFLICT'
  );

type FinalizeTxResult =
  | { kind: 'ok'; result: ImportCompletedResult }
  | { kind: 'fail'; error: DomainError };

const applyVerifiedProjection = async (
  tx: Transaction,
  orgId: string,
  batch: ImportDraftSummaryRow,
  verified: readonly PreparedImportOutcomeProjection[]
): Promise<FinalizeTxResult> => {
  if (!batch.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }

  const externalFacts = await loadImportFinalizeExternalFacts(
    orgId,
    batch.accountId,
    verified,
    batch.rowCount,
    tx
  );
  const preparedRows = verified.map((row) => ({
    batchRowId: row.batchRowId,
    outcome: row.outcome,
    transactionId: row.transactionId,
    snapshot: row.snapshot,
  }));
  const finalizeCheck = verifyPreparedImportSetForFinalize(
    preparedRows,
    externalFacts
  );
  if (!finalizeCheck.ready) {
    return { kind: 'fail', error: notReadyError(finalizeCheck.failures) };
  }

  const counts = countPreparedOutcomes(preparedRows);
  if (
    counts.created + counts.matched + counts.skipped + counts.invalid !==
    batch.rowCount
  ) {
    throw new DomainError(
      500,
      'Prepared outcome counts do not match rowCount.'
    );
  }

  const transactionIdByRowId = new Map<string, string>();
  for (const outcome of preparedRows) {
    if (outcome.outcome === 'matched' && outcome.transactionId) {
      transactionIdByRowId.set(outcome.batchRowId, outcome.transactionId);
    }
  }

  const createdOutcomes = preparedRows.filter(
    (outcome) => outcome.outcome === 'created'
  );
  const links: {
    orgId: string;
    batchId: string;
    batchRowId: string;
    transactionId: string;
    outcome: ImportTransactionLinkOutcome;
  }[] = [];

  for (const outcome of sortCreatedImportOutcomes(createdOutcomes)) {
    const values = outcome.snapshot.reviewedValues;
    const refundOf =
      values.refundOf ??
      (values.refundOfBatchRowId
        ? (transactionIdByRowId.get(values.refundOfBatchRowId) ?? null)
        : null);
    const inserted = await createTransactionInTx(
      tx,
      orgId,
      toImportCreateTransactionInput({
        accountId: batch.accountId,
        batchId: batch.id,
        snapshot: outcome.snapshot,
        refundOf,
      })
    );
    transactionIdByRowId.set(outcome.batchRowId, inserted.id);
    links.push({
      orgId,
      batchId: batch.id,
      batchRowId: outcome.batchRowId,
      transactionId: inserted.id,
      outcome: 'created',
    });
  }

  for (const outcome of preparedRows) {
    if (outcome.outcome !== 'matched' || !outcome.transactionId) continue;
    links.push({
      orgId,
      batchId: batch.id,
      batchRowId: outcome.batchRowId,
      transactionId: outcome.transactionId,
      outcome: 'matched',
    });
  }

  await insertImportTransactionLinks(tx, links);

  const completedAt = new Date();
  const completed = await completeImportBatch(tx, {
    orgId,
    batchId: batch.id,
    completedAt,
    createdCount: counts.created,
    matchedCount: counts.matched,
    skippedCount: counts.skipped,
    invalidCount: counts.invalid,
  });
  if (!completed) {
    throw conflictError();
  }

  const summary = await fetchImportBatchSummaryById(orgId, batch.id, tx);
  if (!summary) {
    throw new DomainError(500, 'Completed import is missing after finalize.');
  }

  return { kind: 'ok', result: toImportCompletedResult(summary) };
};

export const finalizeImportDraft = async (
  orgId: string,
  batchId: string,
  rowIds: string[]
): Promise<ImportCompletedResult> => {
  const uniqueRowIds = [...new Set(rowIds)];
  const outcome = await db.transaction(async (tx) => {
    await lockImportDraftBatch(tx, orgId, batchId);

    const batch = await fetchImportBatchSummaryById(orgId, batchId, tx, {
      forUpdate: true,
    });
    if (!batch) throw new NotFoundError('Import draft not found.');

    // Idempotent finalize: rowIds are ignored once the batch is completed.
    if (batch.status === 'completed') {
      return { kind: 'ok' as const, result: toImportCompletedResult(batch) };
    }

    if (batch.status !== 'draft') {
      throw conflictError();
    }

    if (!batch.accountId) {
      throw new DomainError(500, 'Import draft is missing an account.');
    }

    const verified = await verifyImportDraftProjectionForRowIds(
      orgId,
      batchId,
      uniqueRowIds,
      tx
    );
    if (!verified.ready) {
      return { kind: 'fail' as const, error: notReadyError(verified.failures) };
    }

    return applyVerifiedProjection(tx, orgId, batch, verified.projection);
  });

  if (outcome.kind === 'fail') throw outcome.error;
  return outcome.result;
};
