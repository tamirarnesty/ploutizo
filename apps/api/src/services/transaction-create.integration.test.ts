import { inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  orgMembers,
  orgs,
  tags,
  transactionAssignees,
  transactionTags,
  transactions,
  users,
} from '@ploutizo/db/schema';
import type { Transaction } from '@ploutizo/db';
import type { TransactionCreate } from '@/services/transaction-create';
import { createTransactionsInTx } from '@/services/transaction-create';

class Rollback extends Error {}

/** Runs the body in a transaction that is always rolled back. */
const inRolledBackTx = async (body: (tx: Transaction) => Promise<void>) => {
  await db
    .transaction(async (tx) => {
      await body(tx);
      throw new Rollback();
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rollback)) throw error;
    });
};

const seed = async (tx: Transaction) => {
  const orgId = `org_bulk_create_${crypto.randomUUID()}`;
  await tx.insert(orgs).values({ id: orgId, name: 'Bulk create' });
  const [user] = await tx
    .insert(users)
    .values({
      externalId: `user_${crypto.randomUUID()}`,
      email: `${crypto.randomUUID()}@example.test`,
    })
    .returning({ id: users.id });
  const [member] = await tx
    .insert(orgMembers)
    .values({ orgId, userId: user.id })
    .returning({ id: orgMembers.id });
  const [account] = await tx
    .insert(accounts)
    .values({ orgId, name: 'Visa', type: 'credit_card' })
    .returning({ id: accounts.id });
  const [category] = await tx
    .insert(categories)
    .values({ orgId, name: 'Coffee', colour: 'green-500' })
    .returning({ id: categories.id });
  const [tag] = await tx
    .insert(tags)
    .values({ orgId, name: 'Work', colour: 'blue-500' })
    .returning({ id: tags.id });
  return {
    orgId,
    memberId: member.id,
    accountId: account.id,
    categoryId: category.id,
    tagId: tag.id,
  };
};

describe('createTransactionsInTx against Postgres', () => {
  it('writes a same-batch refund, tags, and chunked rows in one transaction', async () => {
    await inRolledBackTx(async (tx) => {
      const org = await seed(tx);
      const expense = (id: string): TransactionCreate => ({
        id,
        input: {
          type: 'expense',
          accountId: org.accountId,
          amount: 1000,
          date: '2026-05-01',
          description: 'Coffee',
          categoryId: org.categoryId,
          tagIds: [org.tagId],
          assignees: [
            { memberId: org.memberId, amountCents: 1000, percentage: 100 },
          ],
        },
      });
      const expenseIds = Array.from({ length: 2500 }, () =>
        crypto.randomUUID()
      );
      const refundId = crypto.randomUUID();
      const items: TransactionCreate[] = [
        {
          id: refundId,
          input: {
            type: 'refund',
            accountId: org.accountId,
            amount: 400,
            date: '2026-05-02',
            description: 'Coffee refund',
            categoryId: org.categoryId,
            refundOf: expenseIds[2499],
            assignees: [
              { memberId: org.memberId, amountCents: 400, percentage: 100 },
            ],
          },
        },
        ...expenseIds.map(expense),
      ];

      const rows = await createTransactionsInTx(tx, org.orgId, items);

      expect(rows.map((row) => row.id)).toEqual(items.map((item) => item.id));
      expect(rows[0]).toMatchObject({
        id: refundId,
        type: 'refund',
        refundOf: expenseIds[2499],
        orgId: org.orgId,
      });
      const ids = items.map((item) => item.id);
      const [persisted, assignees, tagLinks] = [
        await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(inArray(transactions.id, ids)),
        await tx
          .select({ id: transactionAssignees.transactionId })
          .from(transactionAssignees)
          .where(inArray(transactionAssignees.transactionId, ids)),
        await tx
          .select({ id: transactionTags.transactionId })
          .from(transactionTags)
          .where(inArray(transactionTags.transactionId, ids)),
      ];
      expect([persisted.length, assignees.length, tagLinks.length]).toEqual([
        2501, 2501, 2500,
      ]);
    });
  }, 60_000);
});
