import { db } from '@ploutizo/db';
import {
  transactionAssignees,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import type { Transaction } from '@ploutizo/db';
import type { CreateTransactionInput } from '@ploutizo/validators';
import type { AccountWriteReference } from '@/lib/queries/scope';
import { NotFoundError } from '@/lib/errors';
import { fetchImportBatchInOrg } from '@/lib/queries/imports';
import {
  listCategoryIdsInOrg,
  listMemberIdsInOrg,
  listTagIdsInOrg,
  listTransactionIdsInOrg,
  lockAccountWriteReferences,
} from '@/lib/queries/scope';
import {
  assertArchivedAccountAvailability,
  assertTransactionAccountPolicy,
  invalidCounterpartAccountError,
  invalidRefundReferenceError,
  planCreateTransactionWrite,
  runTransactionWrite,
} from '@/services/transaction-write-planner';

/**
 * A create with an app-owned primary key. Ids exist before any INSERT so
 * same-batch refunds can point at their expense.
 */
export type TransactionCreate = {
  readonly id: string;
  readonly input: CreateTransactionInput;
};

export type CreatedTransaction = typeof transactions.$inferSelect;

/** Keeps every multi-row INSERT well under the Postgres 65,535 bind-parameter limit. */
const INSERT_CHUNK_SIZE = 1000;

type CreateReferences = {
  accountId: string;
  counterpartAccountId: string | null;
  refundOf: string | null;
  categoryId: string | null;
  importBatchId: string | null;
  tagIds: readonly string[];
  memberIds: readonly string[];
};

type PlannedCreate = ReturnType<typeof planCreateTransactionWrite> & {
  id: string;
  refs: CreateReferences;
};

type CreateFacts = {
  accountsById: ReadonlyMap<string, AccountWriteReference>;
  categoryIds: ReadonlySet<string>;
  tagIds: ReadonlySet<string>;
  memberIds: ReadonlySet<string>;
  refundTargetIds: ReadonlySet<string>;
  importBatchIds: ReadonlySet<string>;
};

const planCreate = ({ id, input }: TransactionCreate): PlannedCreate => {
  const plan = planCreateTransactionWrite(input);
  const data = plan.transactionData;
  return {
    ...plan,
    id,
    refs: {
      accountId: data.accountId,
      counterpartAccountId:
        'counterpartAccountId' in data && data.counterpartAccountId
          ? data.counterpartAccountId
          : null,
      refundOf: 'refundOf' in data ? (data.refundOf ?? null) : null,
      categoryId: 'categoryId' in data ? (data.categoryId ?? null) : null,
      importBatchId: data.importBatchId ?? null,
      tagIds: plan.tagIds ?? [],
      memberIds: plan.normalizedAssignees.map((assignee) => assignee.memberId),
    },
  };
};

const distinctIds = (ids: readonly (string | null)[]): string[] =>
  [...new Set(ids.filter((id): id is string => id !== null))].sort();

const loadCreateFacts = async (
  tx: Transaction,
  orgId: string,
  planned: readonly PlannedCreate[]
): Promise<CreateFacts> => {
  const refs = planned.map((plan) => plan.refs);
  const batchIds = new Set(planned.map((plan) => plan.id));

  const accounts = await lockAccountWriteReferences(
    tx,
    orgId,
    distinctIds(
      refs.flatMap((ref) => [ref.accountId, ref.counterpartAccountId])
    )
  );
  const categoryIds = await listCategoryIdsInOrg(
    orgId,
    distinctIds(refs.map((ref) => ref.categoryId)),
    tx
  );
  const tagIds = await listTagIdsInOrg(
    orgId,
    distinctIds(refs.flatMap((ref) => ref.tagIds)),
    tx
  );
  const memberIds = await listMemberIdsInOrg(
    orgId,
    distinctIds(refs.flatMap((ref) => ref.memberIds)),
    tx
  );
  const existingRefundTargetIds = await listTransactionIdsInOrg(
    orgId,
    distinctIds(refs.map((ref) => ref.refundOf)).filter(
      (id) => !batchIds.has(id)
    ),
    tx
  );
  const importBatchIds = new Set<string>();
  for (const importBatchId of distinctIds(
    refs.map((ref) => ref.importBatchId)
  )) {
    if (await fetchImportBatchInOrg(orgId, importBatchId, tx)) {
      importBatchIds.add(importBatchId);
    }
  }

  return {
    accountsById: new Map(accounts.map((account) => [account.id, account])),
    categoryIds,
    tagIds,
    memberIds,
    refundTargetIds: new Set([...existingRefundTargetIds, ...batchIds]),
    importBatchIds,
  };
};

const assertCreatePolicy = (plan: PlannedCreate, facts: CreateFacts) => {
  const { refs } = plan;
  const counterpartAccount =
    refs.counterpartAccountId === null
      ? null
      : (facts.accountsById.get(refs.counterpartAccountId) ?? null);
  if (refs.counterpartAccountId !== null && !counterpartAccount) {
    throw invalidCounterpartAccountError();
  }
  if (refs.refundOf !== null && !facts.refundTargetIds.has(refs.refundOf)) {
    throw invalidRefundReferenceError();
  }
  if (
    refs.importBatchId !== null &&
    !facts.importBatchIds.has(refs.importBatchId)
  ) {
    throw new NotFoundError('Import batch not found.');
  }
  const account = facts.accountsById.get(refs.accountId);
  if (!account) throw new NotFoundError('Account not found');
  if (refs.categoryId !== null && !facts.categoryIds.has(refs.categoryId)) {
    throw new NotFoundError('Category not found');
  }
  if (refs.tagIds.some((tagId) => !facts.tagIds.has(tagId))) {
    throw new NotFoundError('Tag not found');
  }
  if (refs.memberIds.some((memberId) => !facts.memberIds.has(memberId))) {
    throw new NotFoundError('Member not found in this household');
  }

  const accounts = { account, counterpartAccount };
  assertTransactionAccountPolicy(plan.transactionData.type, accounts);
  assertArchivedAccountAvailability(plan.transactionData.date, accounts);
};

const chunkRows = <T>(rows: readonly T[]): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    chunks.push(rows.slice(start, start + INSERT_CHUNK_SIZE));
  }
  return chunks;
};

const insertPlanned = async (
  tx: Transaction,
  orgId: string,
  planned: readonly PlannedCreate[]
): Promise<CreatedTransaction[]> => {
  const batchIds = new Set(planned.map((plan) => plan.id));
  const isSameBatchRefund = (plan: PlannedCreate) =>
    plan.refs.refundOf !== null && batchIds.has(plan.refs.refundOf);
  // refund_of is checked at the end of each INSERT statement, so a same-batch
  // refund must land in the same chunk as its target or a later one.
  const insertOrder = [
    ...planned.filter((plan) => !isSameBatchRefund(plan)),
    ...planned.filter(isSameBatchRefund),
  ];

  const rows = await runTransactionWrite(async () => {
    const inserted: CreatedTransaction[] = [];
    for (const chunk of chunkRows(insertOrder)) {
      inserted.push(
        ...(await tx
          .insert(transactions)
          .values(
            chunk.map((plan) => ({
              id: plan.id,
              orgId,
              ...plan.transactionData,
            }))
          )
          .returning())
      );
    }
    return inserted;
  });

  const assigneeRows = planned.flatMap((plan) =>
    plan.normalizedAssignees.map((assignee) => ({
      transactionId: plan.id,
      memberId: assignee.memberId,
      amountCents: assignee.amountCents,
      percentage: assignee.percentage.toString(),
    }))
  );
  for (const chunk of chunkRows(assigneeRows)) {
    await tx.insert(transactionAssignees).values(chunk);
  }

  const tagRows = planned.flatMap((plan) =>
    plan.refs.tagIds.map((tagId) => ({ transactionId: plan.id, tagId }))
  );
  for (const chunk of chunkRows(tagRows)) {
    await tx.insert(transactionTags).values(chunk);
  }

  return rows;
};

/**
 * The only transaction create path (manual POST, settlements, import
 * finalize). Round trips are constant in items.length: one ordered account
 * lock, one lookup each for categories, tags, members, and refund targets,
 * one per distinct import batch, then the inserts. Validation is atomic and
 * the first violating item throws before anything is written.
 */
export const createTransactionsInTx = async (
  tx: Transaction,
  orgId: string,
  items: readonly TransactionCreate[]
): Promise<CreatedTransaction[]> => {
  if (items.length === 0) return [];
  const planned = items.map(planCreate);
  const facts = await loadCreateFacts(tx, orgId, planned);
  for (const plan of planned) assertCreatePolicy(plan, facts);

  const rows = await insertPlanned(tx, orgId, planned);
  // RETURNING order is not guaranteed to match VALUES order.
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return items.map(({ id }) => rowsById.get(id)!);
};

export const createTransaction = async (
  orgId: string,
  input: CreateTransactionInput
): Promise<CreatedTransaction> =>
  db.transaction(async (tx) => {
    const [row] = await createTransactionsInTx(tx, orgId, [
      { id: crypto.randomUUID(), input },
    ]);
    return row;
  });
