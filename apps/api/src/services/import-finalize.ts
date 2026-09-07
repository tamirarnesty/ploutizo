import { db } from '@ploutizo/db';
import { projectImportPreparedOutcome } from '@ploutizo/utils/import-requirements';
import { lrmSplit } from '@ploutizo/utils/assignee-split';
import type { Transaction } from '@ploutizo/db';
import type { ImportMatchEvaluation } from '@ploutizo/utils';
import type {
  ImportCompletedResult,
  ImportPreparedOutcomeCounts,
  ImportPreparedReviewedValues,
  ImportRequirementFailure,
  ImportRequirementFailureDetails,
  ImportTransactionLinkOutcome,
  ImportTransactionType,
} from '@ploutizo/types';
import type { CreateTransactionInput } from '@ploutizo/validators';
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
import { listActiveExternalIdOwners } from '@/lib/queries/import-match-targets';
import {
  deleteImportPreparedSetsForBatch,
  fetchPreparedSetById,
  isCompletePreparedProjection,
  listPreparedOutcomesForSet,
  lockPreparedSetRevisionForBatch,
} from '@/lib/queries/import-prepared-sets';
import { insertImportTransactionLinks } from '@/lib/queries/import-transaction-links';
import { toImportDraftDurableRow } from '@/services/import-draft-view';
import {
  evaluateImportSetForContinue,
  invalidatePreparedStagingForDraft,
} from '@/services/import-prepared-sets';
import { toImportCompletedResult } from '@/services/imports';
import { createTransactionInTx } from '@/services/transactions';

const IMPORT_TYPE_CREATE_ORDER: Record<ImportTransactionType, number> = {
  expense: 0,
  settlement: 1,
  refund: 2,
};

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

const countOutcomes = (
  outcomes: readonly ImportPreparedOutcomeRecord[]
): ImportPreparedOutcomeCounts => {
  const counts: ImportPreparedOutcomeCounts = {
    created: 0,
    matched: 0,
    skipped: 0,
    invalid: 0,
  };
  for (const outcome of outcomes) {
    if (outcome.outcome === 'created') counts.created += 1;
    else if (outcome.outcome === 'matched') counts.matched += 1;
    else if (outcome.outcome === 'skipped') counts.skipped += 1;
    else if (outcome.outcome === 'invalid') counts.invalid += 1;
  }
  return counts;
};

const requireImportType = (
  values: ImportPreparedReviewedValues
): ImportTransactionType => {
  if (
    values.type !== 'expense' &&
    values.type !== 'refund' &&
    values.type !== 'settlement'
  ) {
    throw new DomainError(500, 'Prepared create outcome is missing a type.');
  }
  return values.type;
};

const buildCreateInput = (input: {
  accountId: string;
  batchId: string;
  values: ImportPreparedReviewedValues;
  refundOf: string | null;
}): CreateTransactionInput => {
  const { accountId, batchId, values, refundOf } = input;
  if (values.date == null || values.amount == null || !values.description) {
    throw new DomainError(
      500,
      'Prepared create outcome is missing required reviewed values.'
    );
  }

  const assignees = lrmSplit(values.amount, values.assigneeMemberIds);
  const base = {
    accountId,
    amount: values.amount,
    date: values.date,
    description: values.description,
    notes: values.notes ?? undefined,
    assignees,
    tagIds: values.tagIds.length > 0 ? values.tagIds : undefined,
    importBatchId: batchId,
    rawDescription: values.rawDescription,
    externalId: values.externalId,
  };

  const type = requireImportType(values);
  if (type === 'expense') {
    if (!values.categoryId) {
      throw new DomainError(
        500,
        'Prepared expense outcome is missing a category.'
      );
    }
    return { ...base, type, categoryId: values.categoryId };
  }
  if (type === 'refund') {
    if (!values.categoryId) {
      throw new DomainError(
        500,
        'Prepared refund outcome is missing a category.'
      );
    }
    return {
      ...base,
      type,
      categoryId: values.categoryId,
      ...(refundOf ? { refundOf } : {}),
    };
  }
  if (!values.counterpartAccountId) {
    throw new DomainError(
      500,
      'Prepared settlement outcome is missing a funding account.'
    );
  }
  return {
    ...base,
    type,
    counterpartAccountId: values.counterpartAccountId,
    ...(values.categoryId ? { categoryId: values.categoryId } : {}),
  };
};

const sortCreatedOutcomes = (outcomes: ImportPreparedOutcomeRecord[]) =>
  [...outcomes].sort((left, right) => {
    const leftType = requireImportType(left.reviewedValues);
    const rightType = requireImportType(right.reviewedValues);
    const order =
      IMPORT_TYPE_CREATE_ORDER[leftType] - IMPORT_TYPE_CREATE_ORDER[rightType];
    if (order !== 0) return order;
    return left.batchRowId.localeCompare(right.batchRowId);
  });

const collectExternalIdFailures = async (
  orgId: string,
  accountId: string,
  createdOutcomes: readonly ImportPreparedOutcomeRecord[],
  tx: Transaction
): Promise<ImportRequirementFailure[]> => {
  const externalIds = createdOutcomes.flatMap((outcome) =>
    outcome.reviewedValues.externalId ? [outcome.reviewedValues.externalId] : []
  );
  const owners = await listActiveExternalIdOwners(
    orgId,
    accountId,
    externalIds,
    tx
  );
  const failures: ImportRequirementFailure[] = [];
  for (const outcome of createdOutcomes) {
    const externalId = outcome.reviewedValues.externalId;
    if (!externalId) continue;
    const ownerId = owners.get(externalId);
    if (ownerId) {
      failures.push({
        batchRowId: outcome.batchRowId,
        key: 'import.external_id.active_conflict',
        params: { transactionId: ownerId, externalId },
      });
    }
  }
  return failures;
};

const collectProjectionMismatches = (
  outcomes: readonly ImportPreparedOutcomeRecord[],
  matchEvaluations: Map<string, ImportMatchEvaluation>,
  rowsById: Map<string, ReturnType<typeof toImportDraftDurableRow>>
): ImportRequirementFailure[] => {
  const failures: ImportRequirementFailure[] = [];
  for (const outcome of outcomes) {
    const row = rowsById.get(outcome.batchRowId);
    if (!row) {
      failures.push({
        batchRowId: outcome.batchRowId,
        key: 'import.match.invalidated_decision',
      });
      continue;
    }
    const match = matchEvaluations.get(row.id);
    const live = projectImportPreparedOutcome(row, match);
    if (live !== outcome.outcome) {
      failures.push({
        batchRowId: outcome.batchRowId,
        key:
          outcome.outcome === 'matched' || live === 'matched'
            ? 'import.match.invalidated_decision'
            : 'import.match.missing_target',
      });
      continue;
    }
    if (
      outcome.outcome === 'matched' &&
      outcome.transactionId !== (match?.acceptedMatch?.transactionId ?? null)
    ) {
      failures.push({
        batchRowId: outcome.batchRowId,
        key: 'import.match.invalidated_decision',
      });
    }
  }
  return failures;
};

type FinalizeTxResult =
  | { kind: 'ok'; result: ImportCompletedResult }
  | { kind: 'fail'; error: DomainError };

const claimAndWriteFinalize = async (
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
  const { failures, matchEvaluations } = await evaluateImportSetForContinue(
    orgId,
    batch.accountId,
    draftRows,
    tx
  );

  const rowsById = new Map(
    draftRows.map((row) => [row.id, toImportDraftDurableRow(row)])
  );
  const createdOutcomes = outcomes.filter(
    (outcome) => outcome.outcome === 'created'
  );
  const projectionFailures = collectProjectionMismatches(
    outcomes,
    matchEvaluations,
    rowsById
  );
  const externalIdFailures = await collectExternalIdFailures(
    orgId,
    batch.accountId,
    createdOutcomes,
    tx
  );
  const allFailures = [
    ...failures,
    ...projectionFailures,
    ...externalIdFailures,
  ];
  if (allFailures.length > 0) {
    await invalidatePreparedStagingForDraft(tx, orgId, batch.id);
    return { kind: 'fail', error: notReadyError(allFailures) };
  }

  const counts = countOutcomes(outcomes);
  if (
    counts.created + counts.matched + counts.skipped + counts.invalid !==
    batch.rowCount
  ) {
    throw new DomainError(
      500,
      'Prepared outcome counts do not match rowCount.'
    );
  }

  const createdByRowId = new Map<string, string>();
  const links: {
    orgId: string;
    batchId: string;
    batchRowId: string;
    transactionId: string;
    outcome: ImportTransactionLinkOutcome;
  }[] = [];

  for (const outcome of sortCreatedOutcomes(createdOutcomes)) {
    const values = outcome.reviewedValues;
    const refundOf =
      values.refundOf ??
      (values.refundOfBatchRowId
        ? (createdByRowId.get(values.refundOfBatchRowId) ?? null)
        : null);
    const inserted = await createTransactionInTx(
      tx,
      orgId,
      buildCreateInput({
        accountId: batch.accountId,
        batchId: batch.id,
        values,
        refundOf,
      })
    );
    createdByRowId.set(outcome.batchRowId, inserted.id);
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

    return claimAndWriteFinalize(tx, orgId, batch, prepared, outcomes);
  });

  if (outcome.kind === 'fail') throw outcome.error;
  return outcome.result;
};
