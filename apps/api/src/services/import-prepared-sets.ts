import { db } from '@ploutizo/db';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import type {
  ImportPreparedReviewedValues,
  ImportPreparedSet,
} from '@ploutizo/types';
import type { PreparedOutcomeInput } from '@/lib/queries/import-prepared-sets';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  fetchLatestPreparedSetForBatch,
  fetchLatestPreparedSetRevision,
  fetchPreparedSetById,
  insertImportPreparedOutcomes,
  insertImportPreparedSet,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
  toImportPreparedSet,
} from '@/lib/queries/import-prepared-sets';
import {
  fetchDraftSummaryById,
  listDraftRows,
} from '@/lib/queries/imports';

export const buildReviewedValuesSnapshot = (
  row: ImportDraftRowRecord
): ImportPreparedReviewedValues => {
  const type = toImportTransactionType(
    resolveImportRowReviewType({
      reviewType: toImportTransactionType(row.reviewType),
      parsedType: toImportTransactionType(row.parsedType),
    })
  );

  const description = resolveImportRowReviewDescription({
    reviewDescription: row.reviewDescription,
    parsedDescription: row.parsedDescription,
  });
  const sourceDescription = row.sourceDescription?.trim() || null;
  const rawDescription =
    description && sourceDescription && description !== sourceDescription
      ? sourceDescription
      : null;

  return {
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
    notes: row.reviewNotes,
    tagIds: row.reviewTagIds,
    externalId: row.externalId,
    rawDescription,
    selectedForImport: row.selectedForImport,
  };
};

/**
 * Create an immutable prepared-set revision for a draft.
 * Does not confirm/create transactions — foundation for Continue/Finalize only.
 */
export const createImportPreparedSetRevision = async (
  orgId: string,
  batchId: string,
  outcomes: PreparedOutcomeInput[]
): Promise<ImportPreparedSet> => {
  const draft = await fetchDraftSummaryById(orgId, batchId);
  if (!draft) throw new NotFoundError('Import draft not found.');

  if (outcomes.length === 0) {
    throw new DomainError(
      400,
      'Prepared set requires at least one outcome row.'
    );
  }

  const draftRows = await listDraftRows(orgId, batchId);
  const rowIds = new Set(draftRows.map((row) => row.id));
  for (const outcome of outcomes) {
    if (!rowIds.has(outcome.batchRowId)) {
      throw new NotFoundError('Import draft row not found.');
    }
  }

  const prepared = await db.transaction(async (tx) => {
    await lockPreparedSetRevisionForBatch(tx, batchId);
    const latestRevision = await fetchLatestPreparedSetRevision(
      orgId,
      batchId,
      tx
    );
    const revision = (latestRevision ?? 0) + 1;

    const set = await insertImportPreparedSet(tx, {
      orgId,
      batchId,
      revision,
    });

    const insertedOutcomes = await insertImportPreparedOutcomes(
      tx,
      outcomes.map((outcome) => ({
        orgId,
        preparedSetId: set.id,
        batchRowId: outcome.batchRowId,
        outcome: outcome.outcome,
        transactionId: outcome.transactionId ?? null,
        reviewedValues: outcome.reviewedValues,
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
