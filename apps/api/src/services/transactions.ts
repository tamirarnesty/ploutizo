import { db } from '@ploutizo/db';
import type { Transaction } from '@ploutizo/db';
import type { UpdateTransactionServiceInput } from '@ploutizo/validators';
import type { ListQueryParams } from '@/lib/queries/transactions';
import type { TransactionWriteAccounts } from '@/services/transaction-write-planner';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { NotFoundError } from '@/lib/errors';
import {
  fetchAccountWriteReference,
  transactionExistsInOrg,
} from '@/lib/queries/scope';
import {
  buildListQuery,
  countQuery,
  enrichTransactions,
  fetchTransactionById,
  replaceAssignees,
  replaceTags,
  restoreTransactionQuery,
  softDeleteTransactionQuery,
  updateTransactionScalarsQuery,
} from '@/lib/queries/transactions';
import {
  assertArchivedAccountAvailability,
  assertTransactionAccountPolicy,
  assertTransactionWriteOrgRefs,
  planUpdateTransactionWrite,
  runTransactionWrite,
} from '@/services/transaction-write-planner';

export type { ListQueryParams };

const TRANSACTION_WRITE_ACCOUNT_REF_OPTIONS = {
  requireActive: false,
  forUpdate: true,
} as const;

const loadTransactionWriteReferences = async (
  orgId: string,
  data: {
    accountId: string;
    counterpartAccountId?: string | null;
    refundOf?: string | null;
    categoryId?: string | null;
    tagIds?: string[];
    assignees?: { memberId: string }[];
  },
  tx: Transaction
): Promise<TransactionWriteAccounts> => {
  const counterpartId = data.counterpartAccountId ?? null;
  // Lock in stable id order so concurrent opposite-direction writes cannot deadlock.
  const idsToLock =
    counterpartId && counterpartId !== data.accountId
      ? [data.accountId, counterpartId].sort()
      : [data.accountId];

  const refs = new Map<string, TransactionWriteAccounts['account']>();
  for (const accountId of idsToLock) {
    const loaded = await fetchAccountWriteReference(
      orgId,
      accountId,
      TRANSACTION_WRITE_ACCOUNT_REF_OPTIONS,
      tx
    );
    if (!loaded) {
      throw new NotFoundError('Account not found');
    }
    refs.set(accountId, loaded);
  }

  const account = refs.get(data.accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const counterpartAccount =
    counterpartId === null
      ? null
      : counterpartId === data.accountId
        ? account
        : (refs.get(counterpartId) ?? null);
  if (counterpartId !== null && !counterpartAccount) {
    throw new NotFoundError('Account not found');
  }

  if (data.refundOf) {
    if (!(await transactionExistsInOrg(orgId, data.refundOf, tx))) {
      throw new NotFoundError('Transaction not found');
    }
  }

  await assertOrgWriteReferences(
    orgId,
    {
      categoryId: data.categoryId,
      tagIds: data.tagIds,
      memberIds: data.assignees?.map((assignee) => assignee.memberId),
    },
    tx
  );

  return { account, counterpartAccount };
};

export const listTransactions = async (params: ListQueryParams) => {
  const [baseRows, total] = await Promise.all([
    buildListQuery(params),
    countQuery(params),
  ]);
  const { assigneeMap, tagMap } = await enrichTransactions(
    params.orgId,
    baseRows
  );
  const data = baseRows.map((row) => ({
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  }));
  return { data, total, page: params.page, limit: params.limit };
};

export const getTransaction = async (orgId: string, id: string) => {
  const row = await fetchTransactionById(orgId, id);
  if (!row) throw new NotFoundError('Transaction not found.');
  const { assigneeMap, tagMap } = await enrichTransactions(orgId, [row]);
  return {
    ...row,
    assignees: assigneeMap[row.id] ?? [],
    tags: tagMap[row.id] ?? [],
  };
};

export const updateTransaction = async (
  orgId: string,
  id: string,
  data: UpdateTransactionServiceInput
) => {
  await assertTransactionWriteOrgRefs(orgId, data);

  return db.transaction(async (tx) => {
    const row = await fetchTransactionById(orgId, id, tx);
    if (!row) throw new NotFoundError('Transaction not found.');

    const writeReferences = await loadTransactionWriteReferences(
      orgId,
      {
        accountId: data.accountId,
        counterpartAccountId:
          'counterpartAccountId' in data
            ? data.counterpartAccountId
            : undefined,
        refundOf: 'refundOf' in data ? data.refundOf : undefined,
        categoryId: 'categoryId' in data ? data.categoryId : undefined,
        tagIds: data.tagIds,
        assignees: data.assignees,
      },
      tx
    );
    assertTransactionAccountPolicy(data.type, writeReferences);
    assertArchivedAccountAvailability(data.date, writeReferences);

    const needsPersistedAssignees = data.assignees === undefined;

    let existingAssignees: readonly { amountCents: number }[] = [];
    if (needsPersistedAssignees) {
      const { assigneeMap } = await enrichTransactions(orgId, [row], tx);
      existingAssignees = (assigneeMap[row.id] ?? []) as readonly {
        amountCents: number;
      }[];
    }

    const { updateData, tagIds, normalizedAssignees } =
      planUpdateTransactionWrite(data, existingAssignees);

    const updated = await runTransactionWrite(() =>
      updateTransactionScalarsQuery(
        tx,
        orgId,
        id,
        updateData as Record<string, unknown>
      )
    );

    if (!updated) throw new NotFoundError('Transaction not found.');

    if (normalizedAssignees !== undefined) {
      await replaceAssignees(tx, id, normalizedAssignees);
    }

    if (tagIds !== undefined) {
      await replaceTags(tx, id, tagIds);
    }

    return updated;
  });
};

export const deleteTransaction = async (
  orgId: string,
  id: string
): Promise<{ id: string }> => {
  const result = await softDeleteTransactionQuery(orgId, id);
  if (!result) throw new NotFoundError('Transaction not found.');
  return result;
};

export const restoreTransaction = async (
  orgId: string,
  id: string
): Promise<{ id: string }> => {
  const result = await runTransactionWrite(() =>
    restoreTransactionQuery(orgId, id)
  );
  if (!result) throw new NotFoundError('Transaction not found.');
  return result;
};
