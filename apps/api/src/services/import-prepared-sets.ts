import { db } from '@ploutizo/db';
import { isImportRowReadyForImport } from '@ploutizo/utils/import-row-readiness';
import {
  resolveImportRowReviewAmount,
  resolveImportRowReviewDate,
  resolveImportRowReviewDescription,
  resolveImportRowReviewType,
  toImportTransactionType,
} from '@ploutizo/utils/import-row-status';
import { importPreparedReviewedValuesSchema } from '@ploutizo/validators';
import type { Transaction } from '@ploutizo/db';
import type { PrepareImportOutcomeInput } from '@ploutizo/validators';
import type {
  ImportContinueNotReadyDetails,
  ImportContinueNotReadyRow,
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
import { listOrgMembers } from '@/lib/queries/households';
import { allTransactionsInOrg } from '@/lib/queries/scope';
import { loadDraftEvaluationContext } from '@/services/import-draft-view';

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
    notes: row.reviewNotes,
    tagIds: row.reviewTagIds,
    externalId: row.externalId,
    rawDescription: row.sourceDescription?.trim() || null,
    selectedForImport: row.selectedForImport,
  };

  return importPreparedReviewedValuesSchema.parse(snapshot);
};

const assertNoDuplicateBatchRowIds = (
  outcomes: PrepareImportOutcomeInput[]
) => {
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
};

const evaluateSelectedRowsForContinue = async (
  orgId: string,
  targetAccountId: string,
  draftRows: readonly ImportDraftRowRecord[],
  selectedRows: readonly ImportDraftRowRecord[],
  tx: Transaction
): Promise<ImportContinueNotReadyRow[]> => {
  const [{ evaluations }, members] = await Promise.all([
    loadDraftEvaluationContext(orgId, targetAccountId, draftRows, {
      client: tx,
      includePriorRefunds: true,
    }),
    listOrgMembers(orgId, tx),
  ]);
  const validAssigneeMemberIds = new Set(members.map((member) => member.id));

  const notReady: ImportContinueNotReadyRow[] = [];
  for (const row of selectedRows) {
    const evaluation = evaluations.get(row.id);
    if (!evaluation) {
      throw new DomainError(
        500,
        'Import draft evaluation is missing a selected row.'
      );
    }

    const ready = isImportRowReadyForImport(
      {
        status: evaluation.status,
        reviewAssigneeMemberIds: row.reviewAssigneeMemberIds,
      },
      { validAssigneeMemberIds }
    );

    if (!ready) {
      notReady.push({
        batchRowId: row.id,
        status: evaluation.status,
        blockers: evaluation.blockers,
        invalidReason: evaluation.invalidReason,
      });
    }
  }

  return notReady;
};

const insertPreparedSetFromRows = async (
  tx: Transaction,
  input: {
    orgId: string;
    batchId: string;
    outcomes: PrepareImportOutcomeInput[];
    rowsById: ReadonlyMap<string, ImportDraftRowRecord>;
  }
): Promise<ImportPreparedSet> => {
  const validatedOutcomes = input.outcomes.map((outcome) => {
    const row = input.rowsById.get(outcome.batchRowId);
    if (!row) {
      throw new NotFoundError('Import draft row not found.');
    }
    return { outcome, row };
  });

  const transactionIds = validatedOutcomes.flatMap(({ outcome }) =>
    outcome.transactionId ? [outcome.transactionId] : []
  );
  if (!(await allTransactionsInOrg(input.orgId, transactionIds, tx))) {
    throw new NotFoundError('Transaction not found');
  }

  const latest = await fetchLatestPreparedSetForBatch(
    input.orgId,
    input.batchId,
    tx
  );
  const revision = (latest?.revision ?? 0) + 1;

  const set = await insertImportPreparedSet(tx, {
    orgId: input.orgId,
    batchId: input.batchId,
    revision,
  });

  const insertedOutcomes = await insertImportPreparedOutcomes(
    tx,
    validatedOutcomes.map(({ outcome, row }) => ({
      orgId: input.orgId,
      preparedSetId: set.id,
      batchRowId: outcome.batchRowId,
      outcome: outcome.outcome,
      transactionId: outcome.transactionId ?? null,
      reviewedValues: buildReviewedValuesSnapshot(row),
    }))
  );

  return toImportPreparedSet(set, insertedOutcomes);
};

/**
 * Create an immutable prepared-set revision for a draft.
 * Does not confirm/create transactions — foundation for Continue/Finalize only.
 * Reviewed values are snapshotted from the draft rows loaded in this transaction.
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

  assertNoDuplicateBatchRowIds(outcomes);

  return db.transaction(async (tx) => {
    await lockPreparedSetRevisionForBatch(tx, orgId, batchId);

    const draft = await fetchDraftSummaryById(orgId, batchId, tx);
    if (!draft) throw new NotFoundError('Import draft not found.');

    const draftRows = await listDraftRows(orgId, batchId, tx);
    return insertPreparedSetFromRows(tx, {
      orgId,
      batchId,
      outcomes,
      rowsById: new Map(draftRows.map((row) => [row.id, row])),
    });
  });
};

/**
 * Continue gate: re-evaluate selected rows under the prepared-set lock, then
 * snapshot an `unprocessed` prepared set revision when every selected row is ready.
 */
export const continueImportDraft = async (
  orgId: string,
  batchId: string
): Promise<ImportPreparedSet> =>
  db.transaction(async (tx) => {
    await lockPreparedSetRevisionForBatch(tx, orgId, batchId);

    const draft = await fetchDraftSummaryById(orgId, batchId, tx);
    if (!draft) throw new NotFoundError('Import draft not found.');
    if (!draft.accountId) {
      throw new DomainError(500, 'Import draft is missing an account.');
    }

    const draftRows = await listDraftRows(orgId, batchId, tx);
    const selectedRows = draftRows.filter((row) => row.selectedForImport);
    if (selectedRows.length === 0) {
      throw new DomainError(
        400,
        'Select at least one row to continue.',
        'IMPORT_CONTINUE_NONE_SELECTED'
      );
    }

    const notReady = await evaluateSelectedRowsForContinue(
      orgId,
      draft.accountId,
      draftRows,
      selectedRows,
      tx
    );
    if (notReady.length > 0) {
      throw new DomainError<ImportContinueNotReadyDetails>(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_CONTINUE_NOT_READY',
        { rows: notReady }
      );
    }

    const outcomes: PrepareImportOutcomeInput[] = selectedRows.map((row) => ({
      batchRowId: row.id,
      outcome: 'unprocessed',
    }));

    return insertPreparedSetFromRows(tx, {
      orgId,
      batchId,
      outcomes,
      rowsById: new Map(draftRows.map((row) => [row.id, row])),
    });
  });

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
