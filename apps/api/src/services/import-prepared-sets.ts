import { db } from '@ploutizo/db';
import {
  evaluateImportSetRequirements,
  projectImportPreparedOutcomes,
} from '@ploutizo/utils/import-requirements';
import { buildPreparedImportRowSnapshot } from '@ploutizo/utils/prepared-import-snapshot';
import { preparedImportRowSnapshotSchema } from '@ploutizo/validators';
import type { Transaction } from '@ploutizo/db';
import type { PrepareImportOutcomeInput } from '@ploutizo/validators';
import type {
  ImportPreparedConfirmation,
  ImportPreparedSet,
  ImportPreparedSetSummary,
  ImportRequirementFailureDetails,
  PreparedImportRowSnapshot,
} from '@ploutizo/types';
import type { ImportDraftRowRecord } from '@/lib/queries/imports';
import type { AccountWriteReference } from '@/lib/queries/scope';
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
import { listActiveExternalIdOwners } from '@/lib/queries/import-match-targets';
import {
  loadDraftEvaluationContext,
  toImportDraftDurableRow,
} from '@/services/import-draft-view';

const toPreparedImportRowSnapshot = (
  row: ImportDraftRowRecord
): PreparedImportRowSnapshot =>
  preparedImportRowSnapshotSchema.parse(buildPreparedImportRowSnapshot(row));

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

const insertPreparedSetFromRows = async (
  tx: Transaction,
  input: {
    orgId: string;
    batchId: string;
    revision: number;
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

  const set = await insertImportPreparedSet(tx, {
    orgId: input.orgId,
    batchId: input.batchId,
    revision: input.revision,
  });

  const insertedOutcomes = await insertImportPreparedOutcomes(
    tx,
    validatedOutcomes.map(({ outcome, row }) => ({
      orgId: input.orgId,
      preparedSetId: set.id,
      batchRowId: outcome.batchRowId,
      outcome: outcome.outcome,
      transactionId: outcome.transactionId ?? null,
      snapshot: toPreparedImportRowSnapshot(row),
    }))
  );

  return toImportPreparedSet(set, insertedOutcomes);
};

export const loadCounterpartAccounts = async (
  orgId: string,
  rows: readonly ImportDraftRowRecord[],
  tx: Transaction
) => {
  const counterpartIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.reviewCounterpartAccountId ? [row.reviewCounterpartAccountId] : []
      )
    ),
  ];
  const counterparts = new Map<string, AccountWriteReference>();
  for (const accountId of counterpartIds) {
    const account = await fetchAccountWriteReference(orgId, accountId, {}, tx);
    if (account) counterparts.set(accountId, account);
  }
  return counterparts;
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
      revision: draft.revision,
      outcomes,
      rowsById: new Map(draftRows.map((row) => [row.id, row])),
    });
  });
};

export const verifyImportPreparedSet = async (
  orgId: string,
  targetAccountId: string,
  draftRows: readonly ImportDraftRowRecord[],
  tx: Transaction
) => {
  const [{ evaluations }, members, targetAccount] = await Promise.all([
    loadDraftEvaluationContext(orgId, targetAccountId, draftRows, {
      client: tx,
      includePriorRefunds: true,
    }),
    listOrgMembers(orgId, tx),
    fetchAccountWriteReference(orgId, targetAccountId, {}, tx),
  ]);
  if (!targetAccount) {
    throw new DomainError(500, 'Import draft is missing an account.');
  }

  const counterpartAccounts = await loadCounterpartAccounts(
    orgId,
    draftRows,
    tx
  );
  const durableRows = draftRows.map(toImportDraftDurableRow);
  const refundEvaluations = new Map(
    [...evaluations.entries()].flatMap(([id, evaluation]) =>
      evaluation.refundLink ? [[id, evaluation.refundLink] as const] : []
    )
  );
  const matchEvaluations = new Map(
    [...evaluations.entries()].flatMap(([id, evaluation]) =>
      evaluation.match ? [[id, evaluation.match] as const] : []
    )
  );
  const createdExternalIds = durableRows.flatMap((row) => {
    if (!row.selectedForImport) return [];
    if (matchEvaluations.get(row.id)?.acceptedMatch) return [];
    const externalId = row.externalId?.trim();
    return externalId ? [externalId] : [];
  });
  const activeExternalIdOwners = await listActiveExternalIdOwners(
    orgId,
    targetAccountId,
    createdExternalIds,
    tx
  );

  const failures = evaluateImportSetRequirements({
    rows: durableRows,
    targetAccount,
    counterpartAccounts,
    validAssigneeMemberIds: new Set(members.map((member) => member.id)),
    refundEvaluations,
    matchEvaluations,
    activeExternalIdOwners,
  });

  return {
    failures,
    matchEvaluations,
    projections: projectImportPreparedOutcomes(durableRows, matchEvaluations),
  };
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

    const { failures, matchEvaluations, projections } =
      await verifyImportPreparedSet(orgId, draft.accountId, draftRows, tx);
    if (failures.length > 0) {
      throw new DomainError<ImportRequirementFailureDetails>(
        400,
        'Some selected rows are not ready to import.',
        'IMPORT_CONTINUE_NOT_READY',
        { rows: failures }
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

    const outcomes: PrepareImportOutcomeInput[] = draftRows.map((row) => {
      const match = matchEvaluations.get(row.id);
      const outcome = projections.get(row.id);
      if (!outcome) {
        throw new DomainError(500, 'Prepared projection is missing a row.');
      }
      return {
        batchRowId: row.id,
        outcome,
        transactionId:
          outcome === 'matched'
            ? (match?.acceptedMatch?.transactionId ?? null)
            : null,
      };
    });

    const prepared = await insertPreparedSetFromRows(tx, {
      orgId,
      batchId,
      revision: draft.revision,
      outcomes,
      rowsById: new Map(draftRows.map((row) => [row.id, row])),
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
