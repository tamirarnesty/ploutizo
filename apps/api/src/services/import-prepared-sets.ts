import { db } from '@ploutizo/db';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import { importPreparedReviewedValuesSchema } from '@ploutizo/validators';
import type { PrepareImportOutcomeInput } from '@ploutizo/validators';
import type {
  ImportPreparedReviewedValues,
  ImportPreparedSet,
} from '@ploutizo/types';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  fetchLatestPreparedSetForBatch,
  fetchPreparedSetById,
  insertImportPreparedOutcomes,
  insertImportPreparedSet,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
  toImportPreparedSet,
} from '@/lib/queries/import-prepared-sets';
import { fetchDraftSummaryById, listDraftRows } from '@/lib/queries/imports';
import { allTransactionsInOrg } from '@/lib/queries/scope';

export const buildReviewedValuesSnapshot = (
  row: ImportDraftRowRecord
): ImportPreparedReviewedValues => {
  const type = resolveImportRowReviewType({
    reviewType: toImportTransactionType(row.reviewType),
    parsedType: toImportTransactionType(row.parsedType),
  });

  const description = resolveImportRowReviewDescription({
    reviewDescription: row.reviewDescription,
    parsedDescription: row.parsedDescription,
  });

  const snapshot = {
    date: resolveImportRowReviewDate({
      reviewDate: row.reviewDate ?? null,
      parsedDate: row.parsedDate ?? null,
    }),
    amount: resolveImportRowReviewAmount({
      reviewAmount: row.reviewAmount,
      parsedAmount: row.parsedAmount,
    }),
    type,
    description,
    categoryId: row.reviewCategoryId,
    assigneeMemberIds: row.reviewAssigneeMemberIds,
    counterpartAccountId: row.reviewCounterpartAccountId,
    refundOf: row.reviewRefundOf,
    refundOfBatchRowId: row.reviewRefundOfBatchRowId,
    notes: row.reviewNotes,
    tagIds: row.reviewTagIds,
    externalId: row.externalId,
    rawDescription: row.sourceDescription?.trim() || null,
    selectedForImport: row.selectedForImport,
  };

  return importPreparedReviewedValuesSchema.parse(snapshot);
};

/**
 * Create an immutable prepared-set revision for a draft.
 * Does not confirm/create transactions — foundation for Continue/Finalize only.
 * Reviewed values are snapshotted server-side from current draft rows under the lock.
 */
export const createImportPreparedSetRevision = async (
  orgId: string,
  batchId: string,
  outcomes: PrepareImportOutcomeInput[]
): Promise<ImportPreparedSet> => {
  if (outcomes.length === 0) {
    throw new DomainError(
      400,
      'Prepared set requires at least one outcome row.'
    );
  }

  const seenBatchRowIds = new Set<string>();
  for (const outcome of outcomes) {
    if (seenBatchRowIds.has(outcome.batchRowId)) {
      throw new DomainError(
        400,
        'Prepared set outcomes must not contain duplicate batch rows.'
      );
    }
    seenBatchRowIds.add(outcome.batchRowId);
  }

  const prepared = await db.transaction(async (tx) => {
    await lockPreparedSetRevisionForBatch(tx, orgId, batchId);

    const draft = await fetchDraftSummaryById(orgId, batchId, tx);
    if (!draft) throw new NotFoundError('Import draft not found.');

    const draftRows = await listDraftRows(orgId, batchId, tx);
    const rowsById = new Map(draftRows.map((row) => [row.id, row]));

    const validatedOutcomes = outcomes.map((outcome) => {
      const row = rowsById.get(outcome.batchRowId);
      if (!row) {
        throw new NotFoundError('Import draft row not found.');
      }
      return { outcome, row };
    });

    const transactionIds = validatedOutcomes.flatMap(({ outcome }) =>
      outcome.transactionId ? [outcome.transactionId] : []
    );
    if (!(await allTransactionsInOrg(orgId, transactionIds, tx))) {
      throw new NotFoundError('Transaction not found');
    }

    const latest = await fetchLatestPreparedSetForBatch(orgId, batchId, tx);
    const revision = (latest?.revision ?? 0) + 1;

    const set = await insertImportPreparedSet(tx, {
      orgId,
      batchId,
      revision,
    });

    const insertedOutcomes = await insertImportPreparedOutcomes(
      tx,
      validatedOutcomes.map(({ outcome, row }) => ({
        orgId,
        preparedSetId: set.id,
        batchRowId: outcome.batchRowId,
        outcome: outcome.outcome,
        transactionId: outcome.transactionId ?? null,
        reviewedValues: buildReviewedValuesSnapshot(row),
      }))
    );

    return toImportPreparedSet(set, insertedOutcomes);
  });

  return prepared;
};

export const getLatestImportPreparedSet = async (
  orgId: string,
  batchId: string
): Promise<ImportPreparedSet | null> => {
  const set = await fetchLatestPreparedSetForBatch(orgId, batchId);
  if (!set) return null;
  const outcomes = await listPreparedOutcomesForSet(orgId, set.id);
  return toImportPreparedSet(set, outcomes);
};

export const getImportPreparedSet = async (
  orgId: string,
  preparedSetId: string
): Promise<ImportPreparedSet | null> => {
  const set = await fetchPreparedSetById(orgId, preparedSetId);
  if (!set) return null;
  const outcomes = await listPreparedOutcomesForSet(orgId, set.id);
  return toImportPreparedSet(set, outcomes);
};
