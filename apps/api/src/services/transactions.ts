import { db } from '@ploutizo/db';
import {
  transactionAssignees,
  transactionTags,
  transactions,
} from '@ploutizo/db/schema';
import { validateTransactionAccountPolicy } from '@ploutizo/utils/transaction-policy';
import type { Transaction } from '@ploutizo/db';
import type { TransactionType } from '@ploutizo/types';
import type {
  CreateTransactionInput,
  UpdateTransactionServiceInput,
} from '@ploutizo/validators';
import type { AccountWriteReference } from '@/lib/queries/scope';
import type { ListQueryParams } from '@/lib/queries/transactions';
import { assertOrgWriteReferences } from '@/lib/assertOrgWriteReferences';
import { DomainError, NotFoundError } from '@/lib/errors';
import { isExternalIdUniqueViolation } from '@/lib/isUniqueViolation';
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
import { fetchImportBatchInOrg } from '@/lib/queries/imports';
import {
  assertTransactionWriteOrgRefs,
  planCreateTransactionWrite,
  planUpdateTransactionWrite,
} from '@/services/transaction-write-planner';

export type { ListQueryParams };

type LoadedTransactionWriteReferences = {
  account: AccountWriteReference;
  counterpartAccount: AccountWriteReference | null;
};

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
): Promise<LoadedTransactionWriteReferences> => {
  const counterpartId = data.counterpartAccountId ?? null;
  // Lock in stable id order so concurrent opposite-direction writes cannot deadlock.
  const idsToLock =
    counterpartId && counterpartId !== data.accountId
      ? [data.accountId, counterpartId].sort()
      : [data.accountId];

  const refs = new Map<string, AccountWriteReference>();
  for (const accountId of idsToLock) {
    const loaded = await fetchAccountWriteReference(orgId, accountId, {}, tx);
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

const assertTransactionAccountPolicy = (
  type: TransactionType,
  refs: LoadedTransactionWriteReferences
) => {
  const result = validateTransactionAccountPolicy({
    type,
    account: refs.account,
    counterpartAccount: refs.counterpartAccount,
  });

  if (!result.valid) {
    throw new DomainError(
      400,
      result.violations.map((violation) => violation.message).join(' '),
      'TRANSACTION_ACCOUNT_POLICY_VIOLATION'
    );
  }
};

const assertImportBatchProvenance = async (
  orgId: string,
  importBatchId: string | undefined,
  tx: Transaction
) => {
  if (!importBatchId) return;
  const batch = await fetchImportBatchInOrg(orgId, importBatchId, tx);
  if (!batch) {
    throw new NotFoundError('Import batch not found.');
  }
};

const mapExternalIdConflict = (error: unknown): never => {
  if (isExternalIdUniqueViolation(error)) {
    throw new DomainError(
      409,
      'An active transaction with this external id already exists on this account.',
      'EXTERNAL_ID_CONFLICT'
    );
  }
  throw error;
};

const runTransactionWrite = async <T>(write: () => Promise<T>): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    return mapExternalIdConflict(error);
  }
};

export const createTransactionInTx = async (
  tx: Transaction,
  orgId: string,
  data: CreateTransactionInput
) => {
  const { transactionData, tagIds, normalizedAssignees } =
    planCreateTransactionWrite(data);
  await assertTransactionWriteOrgRefs(orgId, data, tx);
  await assertImportBatchProvenance(orgId, transactionData.importBatchId, tx);

  const writeReferences = await loadTransactionWriteReferences(
    orgId,
    {
      accountId: transactionData.accountId,
      counterpartAccountId:
        'counterpartAccountId' in transactionData
          ? transactionData.counterpartAccountId
          : undefined,
      refundOf:
        'refundOf' in transactionData ? transactionData.refundOf : undefined,
      categoryId:
        'categoryId' in transactionData
          ? transactionData.categoryId
          : undefined,
      tagIds,
      assignees: normalizedAssignees,
    },
    tx
  );
  assertTransactionAccountPolicy(transactionData.type, writeReferences);

  const inserted = await runTransactionWrite(async () => {
    const [row] = await tx
      .insert(transactions)
      .values({ orgId, ...transactionData })
      .returning();
    return row;
  });

  await tx.insert(transactionAssignees).values(
    normalizedAssignees.map((a) => ({
      transactionId: inserted.id,
      memberId: a.memberId,
      amountCents: a.amountCents,
      percentage: a.percentage.toString(),
    }))
  );

  if (tagIds && tagIds.length > 0) {
    await tx
      .insert(transactionTags)
      .values(tagIds.map((tagId) => ({ transactionId: inserted.id, tagId })));
  }

  return inserted;
};

export const createTransaction = async (
  orgId: string,
  data: CreateTransactionInput
) => db.transaction(async (tx) => createTransactionInTx(tx, orgId, data));

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
