import { db } from '@ploutizo/db';
import {
  importPreparedOutcomes,
  importPreparedSets,
} from '@ploutizo/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { isImportPreparedProjectionOutcome } from '@ploutizo/types';
import type { DbClient, Transaction } from '@ploutizo/db';
import type {
  ImportPreparedConfirmation,
  ImportPreparedConfirmationRow,
  ImportPreparedOutcomeCounts,
  ImportPreparedSet,
  ImportPreparedSetSummary,
} from '@ploutizo/types';

export const insertImportPreparedSet = async (
  tx: Transaction,
  values: {
    orgId: string;
    batchId: string;
    revision: number;
  }
) => {
  const [row] = await tx.insert(importPreparedSets).values(values).returning();
  return row;
};

export const insertImportPreparedOutcomes = async (
  tx: Transaction,
  values: (typeof importPreparedOutcomes.$inferInsert)[]
) => {
  if (values.length === 0) return [];
  return tx.insert(importPreparedOutcomes).values(values).returning();
};

export const deleteImportPreparedSet = async (
  tx: Transaction,
  orgId: string,
  preparedSetId: string
) => {
  await tx
    .delete(importPreparedSets)
    .where(
      and(
        eq(importPreparedSets.id, preparedSetId),
        eq(importPreparedSets.orgId, orgId)
      )
    );
};

export const deleteImportPreparedSetsForBatch = async (
  tx: Transaction,
  orgId: string,
  batchId: string
) => {
  await tx
    .delete(importPreparedSets)
    .where(
      and(
        eq(importPreparedSets.orgId, orgId),
        eq(importPreparedSets.batchId, batchId)
      )
    );
};

export const fetchPreparedSetById = async (
  orgId: string,
  preparedSetId: string,
  client: DbClient = db
) => {
  const rows = await client
    .select()
    .from(importPreparedSets)
    .where(
      and(
        eq(importPreparedSets.id, preparedSetId),
        eq(importPreparedSets.orgId, orgId)
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
};

export const listPreparedOutcomesForSet = async (
  orgId: string,
  preparedSetId: string,
  client: DbClient = db
) =>
  client
    .select()
    .from(importPreparedOutcomes)
    .where(
      and(
        eq(importPreparedOutcomes.orgId, orgId),
        eq(importPreparedOutcomes.preparedSetId, preparedSetId)
      )
    )
    .orderBy(importPreparedOutcomes.createdAt);

export const fetchPreparedSetForBatchRevision = async (
  orgId: string,
  batchId: string,
  revision: number,
  client: DbClient = db
) => {
  const rows = await client
    .select()
    .from(importPreparedSets)
    .where(
      and(
        eq(importPreparedSets.orgId, orgId),
        eq(importPreparedSets.batchId, batchId),
        eq(importPreparedSets.revision, revision)
      )
    )
    .limit(1);
  return rows.at(0) ?? null;
};

/** Lock prepared-set revision allocation for a batch (advisory, org-scoped key). */
export const lockPreparedSetRevisionForBatch = async (
  tx: Transaction,
  orgId: string,
  batchId: string
) => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(abs(hashtext(${`import-prepared:${orgId}:${batchId}`})::bigint))`
  );
};

export type ImportPreparedSetRecord = NonNullable<
  Awaited<ReturnType<typeof fetchPreparedSetById>>
>;

export type ImportPreparedOutcomeRecord = Awaited<
  ReturnType<typeof listPreparedOutcomesForSet>
>[number];

export const toImportPreparedSetSummary = (
  set: ImportPreparedSetRecord
): ImportPreparedSetSummary => ({
  id: set.id,
  batchId: set.batchId,
  revision: set.revision,
  createdAt: set.createdAt.toISOString(),
});

export const toImportPreparedSet = (
  set: ImportPreparedSetRecord,
  outcomes: ImportPreparedOutcomeRecord[]
): ImportPreparedSet => ({
  ...toImportPreparedSetSummary(set),
  outcomes: outcomes.map((outcome) => ({
    id: outcome.id,
    preparedSetId: outcome.preparedSetId,
    batchRowId: outcome.batchRowId,
    outcome: outcome.outcome,
    transactionId: outcome.transactionId,
    snapshot: outcome.snapshot,
    createdAt: outcome.createdAt.toISOString(),
  })),
});

export const isCompletePreparedProjection = (
  outcomes: readonly Pick<ImportPreparedOutcomeRecord, 'outcome'>[],
  rowCount: number
) => {
  if (outcomes.length !== rowCount) return false;
  return outcomes.every((outcome) =>
    isImportPreparedProjectionOutcome(outcome.outcome)
  );
};

const countPreparedOutcomes = (
  outcomes: readonly Pick<ImportPreparedOutcomeRecord, 'outcome'>[]
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

export const toImportPreparedConfirmation = (
  set: ImportPreparedSetRecord,
  outcomes: ImportPreparedOutcomeRecord[],
  rowCount: number
): ImportPreparedConfirmation => {
  const counts = countPreparedOutcomes(outcomes);
  const created: ImportPreparedConfirmationRow[] = [];
  const matched: ImportPreparedConfirmationRow[] = [];

  for (const outcome of outcomes) {
    if (!isImportPreparedProjectionOutcome(outcome.outcome)) continue;
    if (outcome.outcome !== 'created' && outcome.outcome !== 'matched') {
      continue;
    }
    const row: ImportPreparedConfirmationRow = {
      batchRowId: outcome.batchRowId,
      outcome: outcome.outcome,
      transactionId: outcome.transactionId,
      snapshot: outcome.snapshot,
    };
    if (outcome.outcome === 'created') created.push(row);
    else matched.push(row);
  }

  return {
    ...toImportPreparedSetSummary(set),
    rowCount,
    counts,
    created,
    matched,
  };
};
