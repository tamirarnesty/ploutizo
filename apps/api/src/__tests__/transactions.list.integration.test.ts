import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
import { transactionListResponseSchema } from '@ploutizo/validators';
import { transactionsRouter } from '../routes/transactions';
import { createRouteTestApp } from './testUtils';

const ORG_ID = `org_txn_list_${crypto.randomUUID()}`;

const app = createRouteTestApp(
  (testApp) => {
    testApp.route('/transactions', transactionsRouter);
  },
  { signedInMemberId: 'user_clerk_abc', activeHouseholdId: ORG_ID }
);

const list = async (query = '') => {
  const res = await app.request(`/transactions${query}`);
  expect(res.status).toBe(200);
  return transactionListResponseSchema.parse(await res.json());
};

describe('GET /transactions — search and amountSum', () => {
  let accountChequingId: string;
  let accountSavingsId: string;
  let groceriesCategoryId: string;
  let travelTagId: string;
  let memberId: string;

  beforeAll(async () => {
    await db.insert(orgs).values({ id: ORG_ID, name: 'Txn list search' });

    const [chequing, savings] = await db
      .insert(accounts)
      .values([
        { orgId: ORG_ID, name: 'Chequing', type: 'chequing' },
        { orgId: ORG_ID, name: 'Rainy Day Savings', type: 'savings' },
      ])
      .returning({ id: accounts.id, name: accounts.name });
    accountChequingId = chequing.id;
    accountSavingsId = savings.id;

    const [category] = await db
      .insert(categories)
      .values({ orgId: ORG_ID, name: 'Groceries', colour: 'green-500' })
      .returning({ id: categories.id });
    groceriesCategoryId = category.id;

    const [tag] = await db
      .insert(tags)
      .values({ orgId: ORG_ID, name: 'Travel', colour: 'blue-500' })
      .returning({ id: tags.id });
    travelTagId = tag.id;

    const [user] = await db
      .insert(users)
      .values({
        externalId: `user_${crypto.randomUUID()}`,
        email: `${crypto.randomUUID()}@example.test`,
        firstName: 'Zelda',
        lastName: 'Assignee',
      })
      .returning({ id: users.id });
    const [member] = await db
      .insert(orgMembers)
      .values({ orgId: ORG_ID, userId: user.id })
      .returning({ id: orgMembers.id });
    memberId = member.id;

    const seeded = await db
      .insert(transactions)
      .values([
        {
          orgId: ORG_ID,
          type: 'expense',
          accountId: accountChequingId,
          amount: 2500,
          date: '2026-05-10',
          description: 'Weekly groceries run',
          categoryId: groceriesCategoryId,
        },
        {
          orgId: ORG_ID,
          type: 'income',
          accountId: accountChequingId,
          amount: 500_000,
          date: '2026-05-01',
          description: 'Payroll',
        },
        {
          orgId: ORG_ID,
          type: 'transfer',
          accountId: accountChequingId,
          counterpartAccountId: accountSavingsId,
          amount: 10_000,
          date: '2026-05-05',
          description: 'Move to savings',
        },
        {
          orgId: ORG_ID,
          type: 'expense',
          accountId: accountChequingId,
          amount: 9999,
          date: '2026-06-15',
          description: 'Unrelated purchase',
        },
      ])
      .returning({ id: transactions.id });

    await db.insert(transactionTags).values({
      transactionId: seeded[0].id,
      tagId: travelTagId,
    });

    await db.insert(transactionAssignees).values({
      transactionId: seeded[0].id,
      memberId,
      amountCents: 2500,
      percentage: '100',
    });
  });

  afterAll(async () => {
    await db.delete(orgs).where(eq(orgs.id, ORG_ID));
  });

  it('TXN-LIST-SEARCH-01: empty search leaves the filtered set unchanged', async () => {
    const baseline = await list();
    const withEmpty = await list('?search=');
    expect(withEmpty.total).toBe(baseline.total);
    expect(withEmpty.data.map((r) => r.id).sort()).toEqual(
      baseline.data.map((r) => r.id).sort()
    );
  });

  it('TXN-LIST-SEARCH-02: search matches description across the full filtered set, not the page', async () => {
    const page = await list('?search=groceries&limit=1&page=1');
    expect(page.total).toBe(1);
    expect(page.data).toHaveLength(1);
    expect(page.data[0]?.description).toContain('groceries');
  });

  it('TXN-LIST-SEARCH-03: search matches category name', async () => {
    const page = await list('?search=GROCER');
    expect(page.total).toBe(1);
    expect(page.data[0]?.categoryName).toBe('Groceries');
  });

  it('TXN-LIST-SEARCH-04: search matches account name', async () => {
    const page = await list('?search=rainy%20day');
    expect(page.total).toBe(1);
    expect(page.data[0]?.type).toBe('transfer');
  });

  it('TXN-LIST-SEARCH-05: search matches tag name', async () => {
    const page = await list('?search=travel');
    expect(page.total).toBe(1);
    expect(page.data[0]?.tags.some((t) => t.name === 'Travel')).toBe(true);
  });

  it('TXN-LIST-SEARCH-06: search does not match assignee, amount, or date', async () => {
    expect((await list('?search=Zelda')).total).toBe(0);
    expect((await list('?search=Assignee')).total).toBe(0);
    expect((await list('?search=2500')).total).toBe(0);
    expect((await list('?search=2026-05-10')).total).toBe(0);
  });

  it('TXN-LIST-AMOUNTSUM-01: amountSum uses displayed signs and ignores page/limit', async () => {
    const page = await list('?limit=1&page=1');
    // expense -2500, income +500000, transfer +10000, expense -9999
    expect(page.amountSum).toBe(-2500 + 500_000 + 10_000 - 9999);
    expect(page.total).toBe(4);
    expect(page.data).toHaveLength(1);
  });

  it('TXN-LIST-AMOUNTSUM-02: amountSum respects search and other filters', async () => {
    const page = await list('?search=groceries');
    expect(page.total).toBe(1);
    expect(page.amountSum).toBe(-2500);
  });

  it('TXN-LIST-AMOUNTSUM-03: empty set yields amountSum 0', async () => {
    const page = await list('?search=definitely-no-match');
    expect(page.total).toBe(0);
    expect(page.data).toHaveLength(0);
    expect(page.amountSum).toBe(0);
  });
});
