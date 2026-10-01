import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@ploutizo/db';
import {
  accounts,
  categories,
  importBatches,
  orgMembers,
  orgs,
  tags,
  users,
} from '@ploutizo/db/schema';
import {
  createImportDraftResponseSchema,
  importHistoryPageSchema,
  transactionListResponseSchema,
} from '@ploutizo/validators';
import { importsRouter } from '../routes/imports';
import { transactionsRouter } from '../routes/transactions';
import { createRouteTestApp } from './testUtils';

const ORG_ID = `org_responses_${crypto.randomUUID()}`;

const app = createRouteTestApp(
  (testApp) => {
    testApp.route('/transactions', transactionsRouter);
    testApp.route('/imports', importsRouter);
  },
  { signedInMemberId: 'user_clerk_abc', activeHouseholdId: ORG_ID }
);

const postJson = (path: string, body: unknown) =>
  app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const seedCreditCard = async (name: string) => {
  const [account] = await db
    .insert(accounts)
    .values({ orgId: ORG_ID, name, type: 'credit_card' })
    .returning({ id: accounts.id });
  return account.id;
};

describe('web response schemas against the real API output', () => {
  let memberId: string;
  let categoryId: string;
  let tagId: string;

  beforeAll(async () => {
    await db.insert(orgs).values({ id: ORG_ID, name: 'Response contracts' });
    const [user] = await db
      .insert(users)
      .values({
        externalId: `user_${crypto.randomUUID()}`,
        email: `${crypto.randomUUID()}@example.test`,
      })
      .returning({ id: users.id });
    const [member] = await db
      .insert(orgMembers)
      .values({ orgId: ORG_ID, userId: user.id })
      .returning({ id: orgMembers.id });
    const [category] = await db
      .insert(categories)
      .values({ orgId: ORG_ID, name: 'Coffee', colour: 'green-500' })
      .returning({ id: categories.id });
    const [tag] = await db
      .insert(tags)
      .values({ orgId: ORG_ID, name: 'Work', colour: 'blue-500' })
      .returning({ id: tags.id });
    memberId = member.id;
    categoryId = category.id;
    tagId = tag.id;
  });

  afterAll(async () => {
    await db.delete(orgs).where(eq(orgs.id, ORG_ID));
  });

  it('parses a transaction list page with a split, category and tag', async () => {
    const accountId = await seedCreditCard('Visa');
    const created = await postJson('/transactions', {
      type: 'expense',
      accountId,
      amount: 1000,
      date: '2026-05-01',
      description: 'Coffee',
      categoryId,
      tagIds: [tagId],
      assignees: [{ memberId, amountCents: 1000, percentage: 100 }],
    });
    expect(created.status).toBe(201);

    const res = await app.request('/transactions');
    expect(res.status).toBe(200);
    const page = transactionListResponseSchema.parse(await res.json());

    expect(page.data[0]?.assignees).toHaveLength(1);
    expect(page.data[0]?.tags).toHaveLength(1);
  });

  it('parses a created draft and its reuse', async () => {
    const accountId = await seedCreditCard('Amex');
    const upload = {
      accountId,
      fileName: 'statement.csv',
      content: 'date,amount,description,type\n2026-05-02,42.18,Coffee,expense',
      selection: { kind: 'profile', profileId: 'internal' },
    };

    const createdRes = await postJson('/imports/drafts', upload);
    expect(createdRes.status).toBe(201);
    const created = createImportDraftResponseSchema.parse(
      await createdRes.json()
    );
    expect(created).toMatchObject({
      kind: 'draft',
      meta: { reusedExisting: false },
    });

    const reusedRes = await postJson('/imports/drafts', upload);
    expect(reusedRes.status).toBe(200);
    const reused = createImportDraftResponseSchema.parse(
      await reusedRes.json()
    );
    expect(reused).toMatchObject({
      kind: 'draft',
      meta: { reusedExisting: true },
    });
  });

  it('parses an upload that needs a column mapping', async () => {
    const accountId = await seedCreditCard('Mastercard');

    const res = await postJson('/imports/drafts', {
      accountId,
      fileName: 'statement.csv',
      content:
        '05/02/2026,NEIGHBORHOOD GROCERY,12.34,,100.00\n05/08/2026,MERCHANT CREDIT,,5.00,105.00',
    });
    expect(res.status).toBe(200);

    expect(
      createImportDraftResponseSchema.parse(await res.json())
    ).toMatchObject({ kind: 'mapping_required' });
  });

  it('parses completed and discarded import history', async () => {
    const accountId = await seedCreditCard('History card');
    const now = new Date();
    await db.insert(importBatches).values([
      {
        orgId: ORG_ID,
        accountId,
        status: 'completed',
        fileName: 'done.csv',
        importedAt: now,
        completedAt: now,
        rowCount: 3,
        createdCount: 1,
        matchedCount: 1,
        skippedCount: 1,
        invalidCount: 0,
      },
      {
        orgId: ORG_ID,
        accountId,
        status: 'discarded',
        fileName: 'dropped.csv',
        importedAt: now,
        discardedAt: now,
        rowCount: 2,
      },
    ]);

    const res = await app.request('/imports/history');
    expect(res.status).toBe(200);
    const page = importHistoryPageSchema.parse(await res.json());

    expect(page.data).toHaveLength(2);
  });
});
