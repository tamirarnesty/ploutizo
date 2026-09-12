import { db } from '@ploutizo/db';
import { importMatchTargetQueryInput } from '@ploutizo/utils';
import { verifyImportSetForContinue } from '@ploutizo/utils/import-set-verification';
import { preparedImportRowSnapshotSchema } from '@ploutizo/validators';
import type {
  ImportContinueDraftFacts,
  ImportExternalFacts,
  ImportFinalizeExternalFacts,
  PreparedImportOutcomeProjection,
} from '@ploutizo/utils/import-set-verification';
import type { Transaction } from '@ploutizo/db';
import type {
  ImportPreparedConfirmation,
  ImportPreparedSet,
  ImportPreparedSetSummary,
  ImportRequirementFailureDetails,
  PreparedImportRowSnapshot,
} from '@ploutizo/types';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import type {
  ImportPreparedOutcomeRecord,
  ImportPreparedSetRecord,
} from '@/lib/queries/import-prepared-sets';
import type { AccountWriteReference } from '@/lib/queries/scope';
import type { ImportMatchTargetQueryInput } from '@/lib/queries/import-match-targets';
import { DomainError, NotFoundError } from '@/lib/errors';
import {
  deleteImportPreparedSet,
  fetchPreparedSetById,
  fetchPreparedSetForBatchRevision,
  insertImportPreparedOutcomes,
  insertImportPreparedSet,
  isCompletePreparedProjection,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
  toImportPreparedConfirmation,
  toImportPreparedSet,
  toImportPreparedSetSummary,
} from '@/lib/queries/import-prepared-sets';
import {
  bumpImportDraftRevision,
  fetchDraftSummaryById,
  listDraftRows,
} from '@/lib/queries/imports';
import { listOrgMembers } from '@/lib/queries/households';
import {
  allTransactionsInOrg,
  fetchAccountWriteReference,
} from '@/lib/queries/scope';
import {
  listActiveExternalIdOwners,
  listImportMatchTargets,
} from '@/lib/queries/import-match-targets';
import {
  listRefundTargetExpensesByIds,
  sumPriorRefundTotalsByTransactionTarget,
} from '@/lib/queries/import-refund-targets';
import { toImportDraftDurableRow } from '@/services/import-draft-view';

const parsePreparedSnapshot = (
  snapshot: PreparedImportRowSnapshot
): PreparedImportRowSnapshot => preparedImportRowSnapshotSchema.parse(snapshot);

export const loadCounterpartAccounts = async (
  orgId: string,
  counterpartIds: readonly string[],
  tx: Transaction
) => {
  const counterparts = new Map<string, AccountWriteReference>();
  for (const accountId of [...new Set(counterpartIds)]) {
    const account = await fetchAccountWriteReference(orgId, accountId, {}, tx);
    if (account) counterparts.set(accountId, account);
  }
  return counterparts;
};

const loadImportExternalFacts = async (
  orgId: string,
  targetAccountId: string,
  input: {
    refundOfIds: string[];
    matchQuery: ImportMatchTargetQueryInput;
    counterpartIds: readonly string[];
    createdExternalIds: readonly string[];
    rowCount: number;
  },
  tx: Transaction
): Promise<ImportExternalFacts> => {
  const [
    existingExpenses,
    priorRefundsByTarget,
    existingTransactions,
    members,
    targetAccount,
  ] = await Promise.all([
    listRefundTargetExpensesByIds(orgId, input.refundOfIds, tx),
    sumPriorRefundTotalsByTransactionTarget(orgId, input.refundOfIds, tx),
    listImportMatchTargets(orgId, targetAccountId, input.matchQuery, tx),
    listOrgMembers(orgId, tx),
    fetchAccountWriteReference(orgId, targetAccountId, {}, tx),
  ]);

  if (!targetAccount) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }

  const [counterpartAccounts, activeExternalIdOwners] = await Promise.all([
    loadCounterpartAccounts(orgId, input.counterpartIds, tx),
    listActiveExternalIdOwners(
      orgId,
      targetAccountId,
      input.createdExternalIds,
      tx
    ),
  ]);

  return {
    rowCount: input.rowCount,
    targetAccount,
    counterpartAccounts,
    validAssigneeMemberIds: new Set(members.map((member) => member.id)),
    existingTransactions: [...existingTransactions.values()],
    existingExpenses,
    priorRefundsByTarget,
    activeExternalIdOwners,
  };
};

export const loadImportContinueDraftFacts = async (
  orgId: string,
  targetAccountId: string,
  draft: { rowCount: number },
  draftRows: readonly ImportDraftRowRecord[],
  tx: Transaction
): Promise<ImportContinueDraftFacts> => {
  const durableRows = draftRows.map(toImportDraftDurableRow);
  const createdExternalIds = durableRows.flatMap((row) => {
    if (!row.selectedForImport) return [];
    const externalId = row.externalId?.trim();
    return externalId ? [externalId] : [];
  });

  return {
    ...(await loadImportExternalFacts(
      orgId,
      targetAccountId,
      {
        refundOfIds: draftRows.flatMap((row) =>
          row.reviewRefundOf ? [row.reviewRefundOf] : []
        ),
        matchQuery: importMatchTargetQueryInput(draftRows),
        counterpartIds: draftRows.flatMap((row) =>
          row.reviewCounterpartAccountId ? [row.reviewCounterpartAccountId] : []
        ),
        createdExternalIds,
        rowCount: draft.rowCount,
      },
      tx
    )),
    rows: durableRows,
  };
};

export const loadImportFinalizeExternalFacts = async (
  orgId: string,
  targetAccountId: string,
  preparedOutcomes: readonly ImportPreparedOutcomeRecord[],
  rowCount: number,
  tx: Transaction
): Promise<ImportFinalizeExternalFacts> =>
  loadImportExternalFacts(
    orgId,
    targetAccountId,
    {
      refundOfIds: preparedOutcomes.flatMap((row) =>
        row.snapshot.reviewedValues.refundOf
          ? [row.snapshot.reviewedValues.refundOf]
          : []
      ),
      matchQuery: {
        extraIds: preparedOutcomes.flatMap((row) =>
          row.outcome === 'matched' && row.transactionId
            ? [row.transactionId]
            : []
        ),
      },
      counterpartIds: preparedOutcomes.flatMap((row) =>
        row.snapshot.reviewedValues.counterpartAccountId
          ? [row.snapshot.reviewedValues.counterpartAccountId]
          : []
      ),
      createdExternalIds: preparedOutcomes.flatMap((row) => {
        if (row.outcome !== 'created') return [];
        const externalId = row.snapshot.provenance.externalId?.trim();
        return externalId ? [externalId] : [];
      }),
      rowCount,
    },
    tx
  );

const insertPreparedSetFromProjection = async (
  tx: Transaction,
  input: {
    orgId: string;
    batchId: string;
    revision: number;
    projection: readonly PreparedImportOutcomeProjection[];
  }
): Promise<ImportPreparedSet> => {
  const transactionIds = input.projection.flatMap((row) =>
    row.transactionId ? [row.transactionId] : []
  );
  if (!(await allTransactionsInOrg(input.orgId, transactionIds, tx))) {
    throw new NotFoundError('Transaction not found');
  }

  const set = await insertImportPreparedSet(tx, {
    orgId: input.orgId,
    batchId: input.batchId,
    revision: input.revision,
  });

  const insertedOutcomes = await insertImportPreparedOutcomes(
    tx,
    input.projection.map((row) => ({
      orgId: input.orgId,
      preparedSetId: set.id,
      batchRowId: row.batchRowId,
      outcome: row.outcome,
      transactionId: row.transactionId,
      snapshot: parsePreparedSnapshot(row.snapshot),
    }))
  );

  return toImportPreparedSet(set, insertedOutcomes);
};

/**
 * Continue gate: re-evaluate the selected Import set under the prepared-set
 * lock, then snapshot a revision-bound full-file prepared projection.
 */
export const continueImportDraft = async (
  orgId: string,
  batchId: string
): Promise<ImportPreparedSetSummary> =>
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

    const draftFacts = await loadImportContinueDraftFacts(
      orgId,
      draft.accountId,
      draft,
      draftRows,
      tx
    );
    const verified = verifyImportSetForContinue(draftFacts);
    if (!verified.ready) {
      throw new DomainError<ImportRequirementFailureDetails>(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_CONTINUE_NOT_READY',
        { rows: verified.failures }
      );
    }

    const existing = await fetchPreparedSetForBatchRevision(
      orgId,
      batchId,
      draft.revision,
      tx
    );
    if (existing) {
      const existingOutcomes = await listPreparedOutcomesForSet(
        orgId,
        existing.id,
        tx
      );
      if (isCompletePreparedProjection(existingOutcomes, draft.rowCount)) {
        return toImportPreparedSetSummary(existing);
      }
      await deleteImportPreparedSet(tx, orgId, existing.id);
    }

    const prepared = await insertPreparedSetFromProjection(tx, {
      orgId,
      batchId,
      revision: draft.revision,
      projection: verified.projection,
    });

    return {
      id: prepared.id,
      batchId: prepared.batchId,
      revision: prepared.revision,
      createdAt: prepared.createdAt,
    };
  });

export const getActiveImportPreparedConfirmation = async (
  orgId: string,
  batchId: string
): Promise<ImportPreparedConfirmation> => {
  const draft = await fetchDraftSummaryById(orgId, batchId);
  if (!draft) throw new NotFoundError('Import draft not found.');

  const set = await fetchPreparedSetForBatchRevision(
    orgId,
    batchId,
    draft.revision
  );
  if (!set) throw new NotFoundError('Prepared import set not found.');

  const outcomes = await listPreparedOutcomesForSet(orgId, set.id);
  if (!isCompletePreparedProjection(outcomes, draft.rowCount)) {
    throw new NotFoundError('Prepared import set not found.');
  }

  const currentDraft = await fetchDraftSummaryById(orgId, batchId);
  if (!currentDraft || currentDraft.revision !== draft.revision) {
    throw new NotFoundError('Prepared import set not found.');
  }

  return toImportPreparedConfirmation(set, outcomes, currentDraft.rowCount);
};

/** Invalidate active prepared staging by advancing the draft revision. */
export const invalidatePreparedStagingForDraft = async (
  tx: Transaction,
  orgId: string,
  batchId: string
) => {
  await lockPreparedSetRevisionForBatch(tx, orgId, batchId);
  await bumpImportDraftRevision(orgId, batchId, tx);
};

export const invalidateImportPreparedSet = async (
  orgId: string,
  batchId: string
): Promise<void> => {
  await db.transaction(async (tx) => {
    const draft = await fetchDraftSummaryById(orgId, batchId, tx);
    if (!draft) throw new NotFoundError('Import draft not found.');
    await invalidatePreparedStagingForDraft(tx, orgId, batchId);
  });
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

export type { ImportPreparedSetRecord };
