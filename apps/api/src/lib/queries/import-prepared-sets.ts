import { db } from '@ploutizo/db';
import {
  importPreparedOutcomes,
  importPreparedSets,
} from '@ploutizo/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { DbClient, Transaction } from '@ploutizo/db';
import type { ImportPreparedSet } from '@ploutizo/types';

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

export const fetchLatestPreparedSetForBatch = async (
  orgId: string,
  batchId: string,
  client: DbClient = db
) => {
  const rows = await client
    .select()
    .from(importPreparedSets)
    .where(
      and(
        eq(importPreparedSets.orgId, orgId),
        eq(importPreparedSets.batchId, batchId)
      )
    )
    .orderBy(desc(importPreparedSets.revision))
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

export const toImportPreparedSet = (
  set: ImportPreparedSetRecord,
  outcomes: ImportPreparedOutcomeRecord[]
): ImportPreparedSet => ({
  id: set.id,
  batchId: set.batchId,
  revision: set.revision,
  createdAt: set.createdAt.toISOString(),
  outcomes: outcomes.map((outcome) => ({
    id: outcome.id,
    preparedSetId: outcome.preparedSetId,
    batchRowId: outcome.batchRowId,
    outcome: outcome.outcome,
    transactionId: outcome.transactionId,
    reviewedValues: outcome.reviewedValues,
    createdAt: outcome.createdAt.toISOString(),
  })),
});
