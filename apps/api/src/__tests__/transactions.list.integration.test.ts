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

describe('GET /transactions — search', () => {
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
          description: 'Unrelated purchase 50%_off',
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

  it('TXN-LIST-SEARCH-01: search total spans the full filtered set, not the page', async () => {
    // "ro" matches "Weekly groceries run" and "Payroll" only.
    const page = await list('?search=ro&limit=1&page=1');
    expect(page.total).toBe(2);
    expect(page.data).toHaveLength(1);
  });

  it('TXN-LIST-SEARCH-02: search matches category name', async () => {
    const page = await list('?search=GROCER');
    expect(page.total).toBe(1);
    expect(page.data[0]?.categoryName).toBe('Groceries');
  });

  it('TXN-LIST-SEARCH-03: search matches account name', async () => {
    const page = await list('?search=rainy%20day');
    expect(page.total).toBe(1);
    expect(page.data[0]?.type).toBe('transfer');
    expect((await list('?search=chequing')).total).toBe(4);
  });

  it('TXN-LIST-SEARCH-04: search matches tag name', async () => {
    const page = await list('?search=travel');
    expect(page.total).toBe(1);
    expect(page.data[0]?.tags.some((t) => t.name === 'Travel')).toBe(true);
  });

  it('TXN-LIST-SEARCH-05: % and _ in the term match literally', async () => {
    const page = await list('?search=%25_');
    expect(page.total).toBe(1);
    expect(page.data[0]?.description).toBe('Unrelated purchase 50%_off');
  });
});

describe('GET /transactions — multi-select filters', () => {
  let accountChequingId: string;
  let accountSavingsId: string;
  let groceriesCategoryId: string;
  let travelTagId: string;
  let member1Id: string;
  let member2Id: string;

  beforeAll(async () => {
    await db.insert(orgs).values({ id: ORG_ID, name: 'Txn list filters' });

    const [chequing, savings] = await db
      .insert(accounts)
      .values([
        { orgId: ORG_ID, name: 'Chequing', type: 'chequing' },
        { orgId: ORG_ID, name: 'Rainy Day Savings', type: 'savings' },
      ])
      .returning({ id: accounts.id });
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

    const [user1, user2] = await db
      .insert(users)
      .values([
        {
          externalId: `user_${crypto.randomUUID()}`,
          email: `${crypto.randomUUID()}@example.test`,
          firstName: 'Zelda',
          lastName: 'Assignee',
        },
        {
          externalId: `user_${crypto.randomUUID()}`,
          email: `${crypto.randomUUID()}@example.test`,
          firstName: 'Yusuf',
          lastName: 'Assignee',
        },
      ])
      .returning({ id: users.id });
    const [member1, member2] = await db
      .insert(orgMembers)
      .values([
        { orgId: ORG_ID, userId: user1.id },
        { orgId: ORG_ID, userId: user2.id },
      ])
      .returning({ id: orgMembers.id });
    member1Id = member1.id;
    member2Id = member2.id;

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
          accountId: accountSavingsId,
          amount: 500_000,
          date: '2026-05-01',
          description: 'Payroll',
        },
      ])
      .returning({ id: transactions.id });

    // txn0 is shared between both members; txn1 is personal to member1.
    await db.insert(transactionTags).values({
      transactionId: seeded[0].id,
      tagId: travelTagId,
    });
    await db.insert(transactionAssignees).values([
      {
        transactionId: seeded[0].id,
        memberId: member1Id,
        amountCents: 1250,
        percentage: '50',
      },
      {
        transactionId: seeded[0].id,
        memberId: member2Id,
        amountCents: 1250,
        percentage: '50',
      },
      {
        transactionId: seeded[1].id,
        memberId: member1Id,
        amountCents: 500_000,
        percentage: '100',
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(orgs).where(eq(orgs.id, ORG_ID));
  });

  const missId = () => crypto.randomUUID();

  it('TXN-LIST-FILTER-01: no values means no filtering', async () => {
    expect((await list('')).total).toBe(2);
  });

  it('TXN-LIST-FILTER-02: comma-separated categoryIds match inclusively', async () => {
    const page = await list(`?categoryId=${groceriesCategoryId},${missId()}`);
    expect(page.total).toBe(1);
    expect(page.data[0]?.categoryName).toBe('Groceries');
    expect((await list(`?categoryId=${missId()},${missId()}`)).total).toBe(0);
  });

  it('TXN-LIST-FILTER-03: assigneeIds AND together and shape sentinels constrain count', async () => {
    expect((await list(`?assigneeId=${member1Id}`)).total).toBe(2);
    expect((await list(`?assigneeId=${member1Id},${member2Id}`)).total).toBe(1);
    expect((await list(`?assigneeId=${missId()}`)).total).toBe(0);
    const shared = await list('?assigneeId=shared');
    expect(shared.total).toBe(1);
    expect(shared.data[0]?.description).toBe('Weekly groceries run');
    const personal = await list('?assigneeId=personal');
    expect(personal.total).toBe(1);
    expect(personal.data[0]?.description).toBe('Payroll');
    expect((await list(`?assigneeId=${member1Id},shared`)).total).toBe(1);
    expect((await list(`?assigneeId=${member1Id},personal`)).total).toBe(1);
    expect(
      (await list(`?assigneeId=${member1Id},shared`)).data[0]?.description
    ).toBe('Weekly groceries run');
    expect((await list('?assigneeId=personal,shared')).total).toBe(2);
  });

  it('TXN-LIST-FILTER-04: comma-separated tagIds match inclusively', async () => {
    const page = await list(`?tagIds=${travelTagId},${missId()}`);
    expect(page.total).toBe(1);
    expect(page.data[0]?.tags.some((t) => t.name === 'Travel')).toBe(true);
    expect((await list(`?tagIds=${missId()}`)).total).toBe(0);
  });

  it('TXN-LIST-FILTER-06: none sentinel matches uncategorized and untagged', async () => {
    const uncategorized = await list('?categoryId=none');
    expect(uncategorized.total).toBe(1);
    expect(uncategorized.data[0]?.description).toBe('Payroll');
    expect((await list(`?categoryId=none,${groceriesCategoryId}`)).total).toBe(
      2
    );
    const untagged = await list('?tagIds=none');
    expect(untagged.total).toBe(1);
    expect(untagged.data[0]?.description).toBe('Payroll');
    expect((await list(`?tagIds=none,${travelTagId}`)).total).toBe(2);
  });

  it('TXN-LIST-FILTER-05: comma-separated accountIds match inclusively', async () => {
    const both = await list(
      `?accountId=${accountChequingId},${accountSavingsId}`
    );
    expect(both.total).toBe(2);
    const one = await list(`?accountId=${accountChequingId},${missId()}`);
    expect(one.total).toBe(1);
  });
});

describe('GET /transactions — date range operators', () => {
  const DATE_ORG_ID = `org_txn_dates_${crypto.randomUUID()}`;

  const dateApp = createRouteTestApp(
    (testApp) => {
      testApp.route('/transactions', transactionsRouter);
    },
    { signedInMemberId: 'user_clerk_abc', activeHouseholdId: DATE_ORG_ID }
  );

  const listDates = async (query: string) => {
    const res = await dateApp.request(`/transactions${query}`);
    expect(res.status).toBe(200);
    return transactionListResponseSchema.parse(await res.json());
  };

  let accountId: string;

  beforeAll(async () => {
    await db.insert(orgs).values({ id: DATE_ORG_ID, name: 'Txn date ops' });

    const [account] = await db
      .insert(accounts)
      .values({ orgId: DATE_ORG_ID, name: 'Chequing', type: 'chequing' })
      .returning({ id: accounts.id });
    accountId = account.id;

    await db.insert(transactions).values([
      {
        orgId: DATE_ORG_ID,
        type: 'expense',
        accountId,
        amount: 100,
        date: '2026-01-01',
        description: 'Jan 1',
      },
      {
        orgId: DATE_ORG_ID,
        type: 'expense',
        accountId,
        amount: 200,
        date: '2026-01-15',
        description: 'Jan 15',
      },
      {
        orgId: DATE_ORG_ID,
        type: 'expense',
        accountId,
        amount: 300,
        date: '2026-01-31',
        description: 'Jan 31',
      },
      {
        orgId: DATE_ORG_ID,
        type: 'expense',
        accountId,
        amount: 400,
        date: '2026-02-10',
        description: 'Feb 10',
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(orgs).where(eq(orgs.id, DATE_ORG_ID));
  });

  const descriptions = (page: { data: { description: string }[] }) =>
    page.data.map((row) => row.description).sort();

  it('TXN-LIST-DATE-01: between is inclusive on both boundaries', async () => {
    const page = await listDates(
      '?dateFrom=2026-01-15&dateTo=2026-01-31&dateRange_op=between'
    );
    expect(page.total).toBe(2);
    expect(descriptions(page)).toEqual(['Jan 15', 'Jan 31']);
  });

  it('TXN-LIST-DATE-02: default operator is between', async () => {
    const page = await listDates('?dateFrom=2026-01-15&dateTo=2026-01-31');
    expect(page.total).toBe(2);
    expect(descriptions(page)).toEqual(['Jan 15', 'Jan 31']);
  });

  it('TXN-LIST-DATE-03: after is strict on dateFrom', async () => {
    const page = await listDates('?dateFrom=2026-01-15&dateRange_op=after');
    expect(page.total).toBe(2);
    expect(descriptions(page)).toEqual(['Feb 10', 'Jan 31']);
  });

  it('TXN-LIST-DATE-04: before is strict on dateTo', async () => {
    const page = await listDates('?dateTo=2026-01-15&dateRange_op=before');
    expect(page.total).toBe(1);
    expect(page.data[0]?.description).toBe('Jan 1');
  });

  it('TXN-LIST-DATE-05: is matches a single day', async () => {
    const page = await listDates('?dateFrom=2026-01-15&dateRange_op=is');
    expect(page.total).toBe(1);
    expect(page.data[0]?.description).toBe('Jan 15');
  });

  it('TXN-LIST-DATE-06: is_not excludes a single day', async () => {
    const page = await listDates('?dateFrom=2026-01-15&dateRange_op=is_not');
    expect(page.total).toBe(3);
    expect(descriptions(page)).toEqual(['Feb 10', 'Jan 1', 'Jan 31']);
  });

  it('TXN-LIST-DATE-07: not_between excludes the closed interval', async () => {
    const page = await listDates(
      '?dateFrom=2026-01-15&dateTo=2026-01-31&dateRange_op=not_between'
    );
    expect(page.total).toBe(2);
    expect(descriptions(page)).toEqual(['Feb 10', 'Jan 1']);
  });
});
