import { db } from '@ploutizo/db';
import {
  countPreparedOutcomes,
  diffPreparedProjection,
} from '@ploutizo/utils/import-requirements';
import type { Transaction } from '@ploutizo/db';
import type {
  ImportCompletedResult,
  ImportRequirementFailure,
  ImportRequirementFailureDetails,
  ImportTransactionLinkOutcome,
} from '@ploutizo/types';
import type { ImportDraftSummaryRow } from '@/lib/queries/imports';
import type {
  ImportPreparedOutcomeRecord,
  ImportPreparedSetRecord,
} from '@/lib/queries/import-prepared-sets';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  completeImportBatch,
  fetchImportBatchSummaryById,
  listDraftRows,
} from '@/lib/queries/imports';
import {
  deleteImportPreparedSetsForBatch,
  fetchPreparedSetById,
  isCompletePreparedProjection,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
} from '@/lib/queries/import-prepared-sets';
import { insertImportTransactionLinks } from '@/lib/queries/import-transaction-links';
import {
  sortCreatedImportOutcomes,
  toImportCreateTransactionInput,
} from '@/services/import-create-input';
import { toImportCompletedResult } from '@/services/import-history';
import {
  invalidatePreparedStagingForDraft,
  verifyImportPreparedSet,
} from '@/services/import-prepared-sets';
import { createTransactionInTx } from '@/services/transactions';

const notReadyError = (rows: ImportRequirementFailure[]) =>
  new DomainError<ImportRequirementFailureDetails>(
    400,
    'Some selected rows are not ready to import.',
    'IMPORT_FINALIZE_NOT_READY',
    { rows }
  );

const staleError = (rows: ImportRequirementFailure[] = []) =>
  new DomainError<ImportRequirementFailureDetails>(
    409,
    'Prepared import set is no longer active.',
    'IMPORT_FINALIZE_STALE',
    { rows }
  );

const conflictError = () =>
  new DomainError(
    409,
    'This prepared import set cannot be finalized.',
    'IMPORT_FINALIZE_CONFLICT'
  );

type FinalizeTxResult =
  | { kind: 'ok'; result: ImportCompletedResult }
  | { kind: 'fail'; error: DomainError };

const applyPreparedOutcomes = async (
  tx: Transaction,
  orgId: string,
  batch: ImportDraftSummaryRow,
  prepared: ImportPreparedSetRecord,
  outcomes: ImportPreparedOutcomeRecord[]
): Promise<FinalizeTxResult> => {
  if (!batch.accountId) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }

  const draftRows = await listDraftRows(orgId, batch.id, tx);
  const verified = await verifyImportPreparedSet(
    orgId,
    batch.accountId,
    draftRows,
    tx
  );
  const projectionFailures = diffPreparedProjection(
    outcomes,
    verified.projections,
    verified.matchEvaluations
  );
  const allFailures = [...verified.failures, ...projectionFailures];
  if (allFailures.length > 0) {
    await invalidatePreparedStagingForDraft(tx, orgId, batch.id);
    return { kind: 'fail', error: notReadyError(allFailures) };
  }

  const counts = countPreparedOutcomes(outcomes);
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
  for (const outcome of outcomes) {
    if (outcome.outcome === 'matched' && outcome.transactionId) {
      transactionIdByRowId.set(outcome.batchRowId, outcome.transactionId);
    }
  }

  const createdOutcomes = outcomes.filter(
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

  for (const outcome of outcomes) {
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
    preparedSetId: prepared.id,
    completedAt,
    createdCount: counts.created,
    matchedCount: counts.matched,
    skippedCount: counts.skipped,
    invalidCount: counts.invalid,
  });
  if (!completed) {
    throw conflictError();
  }

  await deleteImportPreparedSetsForBatch(tx, orgId, batch.id);

  const summary = await fetchImportBatchSummaryById(orgId, batch.id, tx);
  if (!summary) {
    throw new DomainError(500, 'Completed import is missing after finalize.');
  }

  return { kind: 'ok', result: toImportCompletedResult(summary) };
};

export const finalizeImportDraft = async (
  orgId: string,
  batchId: string,
  preparedSetId: string
): Promise<ImportCompletedResult> => {
  const outcome = await db.transaction(async (tx) => {
    await lockPreparedSetRevisionForBatch(tx, orgId, batchId);

    const batch = await fetchImportBatchSummaryById(orgId, batchId, tx, {
      forUpdate: true,
    });
    if (!batch) throw new NotFoundError('Import draft not found.');

    if (batch.status === 'completed') {
      if (batch.finalizedPreparedSetId === preparedSetId) {
        return { kind: 'ok' as const, result: toImportCompletedResult(batch) };
      }
      throw conflictError();
    }

    if (batch.status !== 'draft') {
      throw conflictError();
    }

    const prepared = await fetchPreparedSetById(orgId, preparedSetId, tx);
    if (!prepared || prepared.batchId !== batchId) {
      throw new NotFoundError('Prepared import set not found.');
    }

    const outcomes = await listPreparedOutcomesForSet(orgId, prepared.id, tx);
    if (
      prepared.revision !== batch.revision ||
      !isCompletePreparedProjection(outcomes, batch.rowCount)
    ) {
      await invalidatePreparedStagingForDraft(tx, orgId, batchId);
      return { kind: 'fail' as const, error: staleError() };
    }

    return applyPreparedOutcomes(tx, orgId, batch, prepared, outcomes);
  });

  if (outcome.kind === 'fail') throw outcome.error;
  return outcome.result;
};
