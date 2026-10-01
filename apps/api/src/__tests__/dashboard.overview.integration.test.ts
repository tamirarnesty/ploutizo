import { eq, inArray } from 'drizzle-orm';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { db } from '@ploutizo/db';
import { accounts, categories, orgs, transactions } from '@ploutizo/db/schema';
import { dashboardOverviewResponseSchema } from '@ploutizo/validators';
import type { ColourToken } from '@ploutizo/types';
import type { DashboardRangedShortcut } from '@ploutizo/utils/dashboard-period';
import { dashboardRouter } from '../routes/dashboard';
import { TEST_HOUSEHOLD_PRINCIPAL, createRouteTestApp } from './testUtils';

vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId })),
}));

const app = createRouteTestApp((testApp) => {
  testApp.route('/dashboard', dashboardRouter);
});

const OTHER_ORG_ID = `${TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId}_other`;

const seedOrg = async (orgId: string) => {
  await db
    .insert(orgs)
    .values({ id: orgId, name: 'Test household' })
    .onConflictDoNothing();
};

const seedAccount = async (orgId: string) => {
  const [account] = await db
    .insert(accounts)
    .values({
      orgId,
      name: 'Chequing',
      type: 'chequing',
    })
    .returning({ id: accounts.id });
  return account.id;
};

/** Without a shortcut the range is custom. */
const overviewQuery = (range: {
  from: string;
  to: string;
  shortcut?: DashboardRangedShortcut;
}) => `/dashboard/overview?${new URLSearchParams(range).toString()}`;

type TxnInput = {
  type: (typeof transactions.$inferInsert)['type'];
  amount: number;
  date: string;
  categoryId?: string;
};

const insertTxns = async (
  rows: TxnInput[],
  target: { orgId: string; accountId: string }
) => {
  await db.insert(transactions).values(
    rows.map((row) => ({
      ...target,
      ...row,
      description: row.type,
    }))
  );
};

const txn = (
  type: TxnInput['type'],
  amount: number,
  date: string,
  categoryId?: string
): TxnInput => ({ type, amount, date, categoryId });

const expense = (amount: number, date: string, categoryId?: string) =>
  txn('expense', amount, date, categoryId);

const refund = (amount: number, date: string, categoryId?: string) =>
  txn('refund', amount, date, categoryId);

const seedCategory = async (
  orgId: string,
  name: string,
  colour: ColourToken = 'blue-500'
) => {
  const [category] = await db
    .insert(categories)
    .values({ orgId, name, colour, sortOrder: 0 })
    .returning({ id: categories.id });
  return category.id;
};

/** Seeds one category per name, in order, returning their ids. */
const seedCategories = async (orgId: string, names: string[]) => {
  const ids: string[] = [];
  for (const name of names) ids.push(await seedCategory(orgId, name));
  return ids;
};

/** Numbered category names: `${prefix} 0` … `${prefix} ${count - 1}`. */
const numberedNames = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix} ${i}`);

/** One expense per category, largest first: 100 × (count − index) cents. */
const rankedExpenses = (categoryIds: string[], date: string) =>
  categoryIds.map((categoryId, index) =>
    expense((categoryIds.length - index) * 100, date, categoryId)
  );

const MARCH = {
  from: '2026-03-01',
  to: '2026-03-31',
  shortcut: 'mtd',
} as const;

const fetchOverview = async (path: string) => {
  const res = await app.request(path);
  expect(res.status).toBe(200);
  return dashboardOverviewResponseSchema.parse(await res.json());
};

describe('GET /api/dashboard/overview integration', () => {
  let accountId: string;
  const household = () => ({
    orgId: TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId,
    accountId,
  });

  beforeAll(async () => {
    await seedOrg(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId);
    await seedOrg(OTHER_ORG_ID);
  });

  beforeEach(async () => {
    const orgIds = [TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, OTHER_ORG_ID];
    await db.delete(transactions).where(inArray(transactions.orgId, orgIds));
    await db.delete(categories).where(inArray(categories.orgId, orgIds));
    accountId = await seedAccount(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId);
  });

  afterAll(async () => {
    await db.delete(transactions).where(eq(transactions.orgId, OTHER_ORG_ID));
    await db.delete(categories).where(eq(categories.orgId, OTHER_ORG_ID));
    await db.delete(accounts).where(eq(accounts.orgId, OTHER_ORG_ID));
    await db.delete(orgs).where(eq(orgs.id, OTHER_ORG_ID));
  });

  it('aggregates net spend from expenses minus refunds only', async () => {
    await insertTxns(
      [
        expense(5000, '2026-03-10'),
        refund(1500, '2026-03-11'),
        txn('transfer', 9000, '2026-03-11'),
        txn('income', 12000, '2026-03-12'),
        txn('settlement', 2000, '2026-03-12'),
        txn('contribution', 3000, '2026-03-13'),
      ],
      household()
    );

    const body = await fetchOverview(overviewQuery(MARCH));
    const total = body.trend.reduce((sum, row) => sum + row.amountCents, 0);
    expect(total).toBe(3500);
  });

  it('allows negative bucket totals when refunds exceed expenses', async () => {
    await insertTxns(
      [expense(1000, '2026-03-05'), refund(2500, '2026-03-05')],
      household()
    );

    const body = await fetchOverview(overviewQuery(MARCH));
    const day = body.trend.find((row) => row.bucketStart === '2026-03-05');
    expect(day?.amountCents).toBe(-1500);
  });

  it('compares month to date with the same days of the previous month', async () => {
    const body = await fetchOverview(
      overviewQuery({ from: '2026-03-01', to: '2026-03-15', shortcut: 'mtd' })
    );
    expect(body.meta).toEqual({
      kind: 'ranged',
      range: {
        from: '2026-03-01',
        to: '2026-03-15',
        priorFrom: '2026-02-01',
        priorTo: '2026-02-15',
        grain: 'day',
      },
    });
    expect(body.trend).toHaveLength(15);
  });

  it('clamps the prior window to a shorter previous month', async () => {
    const body = await fetchOverview(overviewQuery(MARCH));
    expect(body.meta.range).toMatchObject({
      priorFrom: '2026-02-01',
      priorTo: '2026-02-28',
    });
    expect(body.trend.at(27)?.priorAmountCents).toBe(0);
    expect(body.trend.at(28)?.priorAmountCents).toBeNull();
  });

  it('compares year to date with the same dates last year', async () => {
    await insertTxns(
      [expense(400, '2026-02-10'), expense(900, '2025-02-11')],
      household()
    );

    const body = await fetchOverview(
      overviewQuery({ from: '2026-01-01', to: '2026-03-24', shortcut: 'ytd' })
    );
    expect(body.meta.range).toEqual({
      from: '2026-01-01',
      to: '2026-03-24',
      priorFrom: '2025-01-01',
      priorTo: '2025-03-24',
      grain: 'week',
    });
    const weekOfFeb9 = body.trend.find(
      (row) => row.bucketStart === '2026-02-09'
    );
    expect(weekOfFeb9?.amountCents).toBe(400);
    expect(weekOfFeb9?.priorAmountCents).toBe(900);
  });

  it('compares a custom range with the equal-length window before it', async () => {
    await insertTxns(
      [expense(400, '2026-03-12'), expense(900, '2026-03-02')],
      household()
    );

    const body = await fetchOverview(
      overviewQuery({ from: '2026-03-10', to: '2026-03-19' })
    );
    expect(body.meta.range).toEqual({
      from: '2026-03-10',
      to: '2026-03-19',
      priorFrom: '2026-02-28',
      priorTo: '2026-03-09',
      grain: 'day',
    });
    const marchTwelfth = body.trend.find(
      (row) => row.bucketStart === '2026-03-12'
    );
    expect(marchTwelfth).toEqual({
      bucketStart: '2026-03-12',
      amountCents: 400,
      priorAmountCents: 900,
    });
  });

  it('buckets ranges up to six months by Monday-start week', async () => {
    await insertTxns(
      [
        expense(300, '2025-10-01'),
        expense(200, '2025-10-05'),
        expense(700, '2025-04-02'),
      ],
      household()
    );

    const body = await fetchOverview(
      overviewQuery({ from: '2025-10-01', to: '2026-03-24', shortcut: '6m' })
    );
    expect(body.meta.range).toEqual({
      from: '2025-10-01',
      to: '2026-03-24',
      priorFrom: '2025-04-01',
      priorTo: '2025-09-24',
      grain: 'week',
    });
    expect(body.trend.at(0)).toEqual({
      bucketStart: '2025-09-29',
      amountCents: 500,
      priorAmountCents: 700,
    });
    expect(body.trend.at(-1)?.bucketStart).toBe('2026-03-23');
  });

  it('buckets ranges longer than six months by month', async () => {
    await insertTxns(
      [expense(500, '2026-01-15'), expense(700, '2026-03-10')],
      household()
    );

    const body = await fetchOverview(
      overviewQuery({ from: '2025-10-01', to: '2026-04-15' })
    );
    expect(body.meta.range).toMatchObject({ grain: 'month' });
    expect(body.trend.map((row) => row.bucketStart)).toEqual([
      '2025-10-01',
      '2025-11-01',
      '2025-12-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01',
    ]);
    expect(body.trend.at(3)?.amountCents).toBe(500);
  });

  it('scopes results to the active household', async () => {
    const otherAccountId = await seedAccount(OTHER_ORG_ID);
    await insertTxns([expense(100, '2026-04-01')], household());
    await insertTxns([expense(999999, '2026-04-01')], {
      orgId: OTHER_ORG_ID,
      accountId: otherAccountId,
    });

    const body = await fetchOverview(
      overviewQuery({ from: '2026-04-01', to: '2026-04-30' })
    );
    const total = body.trend.reduce((sum, row) => sum + row.amountCents, 0);
    expect(total).toBe(100);
  });

  it.each([
    ['a half range', '/dashboard/overview?from=2026-01-01'],
    [
      'an impossible date',
      overviewQuery({ from: '2026-13-40', to: '2026-01-31' }),
    ],
    [
      'an unknown shortcut',
      '/dashboard/overview?from=2026-03-01&to=2026-03-15&shortcut=all',
    ],
    [
      'a reversed range',
      overviewQuery({ from: '2026-03-20', to: '2026-03-05' }),
    ],
    [
      'client-chosen bucketing',
      '/dashboard/overview?from=2026-03-05&to=2026-03-20&bucket=day',
    ],
  ])('rejects %s', async (_label, path) => {
    const res = await app.request(path);
    expect(res.status).toBe(400);
  });

  it('returns all-time monthly buckets with no prior when no range is provided', async () => {
    await insertTxns(
      [expense(500, '2026-01-15'), expense(700, '2026-02-10')],
      household()
    );

    const body = await fetchOverview('/dashboard/overview');
    expect(body.meta).toEqual({
      kind: 'all',
      range: {
        from: '2026-01-15',
        to: '2026-02-10',
        priorFrom: null,
        priorTo: null,
        grain: 'month',
      },
    });
    expect(body.trend).toEqual([
      { bucketStart: '2026-01-01', amountCents: 500, priorAmountCents: null },
      { bucketStart: '2026-02-01', amountCents: 700, priorAmountCents: null },
    ]);
    expect(body.categories).toEqual([
      {
        kind: 'uncategorised',
        amountCents: 1200,
        shareOfPeriod: 1,
        priorAmountCents: null,
      },
    ]);
  });

  it('returns an empty all-time trend with no range when there is no spend', async () => {
    const body = await fetchOverview('/dashboard/overview');
    expect(body).toEqual({
      meta: { kind: 'all', range: null },
      trend: [],
      categories: [],
    });
  });

  describe('categories', () => {
    it('returns the top eight categories by net spend plus Other', async () => {
      const ids = await seedCategories(
        household().orgId,
        numberedNames('Cat', 10)
      );
      await insertTxns(rankedExpenses(ids, '2026-03-10'), household());

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories).toHaveLength(9);
      expect(
        body.categories
          .slice(0, 8)
          .map((row) => (row.kind === 'category' ? row.name : row.kind))
      ).toEqual([
        'Cat 0',
        'Cat 1',
        'Cat 2',
        'Cat 3',
        'Cat 4',
        'Cat 5',
        'Cat 6',
        'Cat 7',
      ]);
      const other = body.categories.at(-1);
      expect(other).toMatchObject({
        kind: 'other',
        categoryCount: 2,
        amountCents: 300,
      });
      const shareTotal = body.categories.reduce(
        (sum, row) => sum + (row.shareOfPeriod ?? 0),
        0
      );
      expect(shareTotal).toBeCloseTo(1, 5);
    });

    it('drops categories that net to zero and shows those refunds exceed, with no share', async () => {
      const positiveId = await seedCategory(household().orgId, 'Groceries');
      const zeroId = await seedCategory(household().orgId, 'Flat');
      const negativeId = await seedCategory(household().orgId, 'Refunded');
      await insertTxns(
        [
          expense(5000, '2026-03-05', positiveId),
          expense(1000, '2026-03-06', zeroId),
          refund(1000, '2026-03-07', zeroId),
          expense(2000, '2026-03-08', negativeId),
          refund(3000, '2026-03-09', negativeId),
        ],
        household()
      );

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories).toEqual([
        expect.objectContaining({
          kind: 'category',
          categoryId: positiveId,
          name: 'Groceries',
          amountCents: 5000,
          shareOfPeriod: 1,
        }),
        expect.objectContaining({
          kind: 'category',
          categoryId: negativeId,
          name: 'Refunded',
          amountCents: -1000,
          shareOfPeriod: null,
        }),
      ]);
    });

    it('returns each category with its configured colour', async () => {
      const travelId = await seedCategory(
        household().orgId,
        'Travel',
        'violet-500'
      );
      const gasId = await seedCategory(household().orgId, 'Gas', 'amber-300');
      await insertTxns(
        [
          expense(100, '2026-03-01', travelId),
          expense(200, '2026-03-02', gasId),
        ],
        household()
      );

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories).toEqual([
        expect.objectContaining({ categoryId: gasId, colour: 'amber-300' }),
        expect.objectContaining({ categoryId: travelId, colour: 'violet-500' }),
      ]);
    });

    it('maps prior-period amounts onto category rows for ranged windows', async () => {
      const categoryId = await seedCategory(household().orgId, 'Dining');
      await insertTxns(
        [
          expense(400, '2026-03-03', categoryId),
          expense(900, '2026-02-03', categoryId),
        ],
        household()
      );

      const body = await fetchOverview(
        overviewQuery({ from: '2026-03-01', to: '2026-03-05', shortcut: 'mtd' })
      );
      expect(body.categories).toEqual([
        expect.objectContaining({
          categoryId,
          amountCents: 400,
          priorAmountCents: 900,
        }),
      ]);
    });

    it('keeps the household category named Other separate from the aggregate bucket', async () => {
      const ids = await seedCategories(household().orgId, [
        'Other',
        ...numberedNames('Extra', 9),
      ]);
      const otherCategoryId = ids[0];
      await insertTxns(rankedExpenses(ids, '2026-03-10'), household());

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories.at(0)).toMatchObject({
        kind: 'category',
        categoryId: otherCategoryId,
        name: 'Other',
      });
      expect(body.categories.at(-1)).toMatchObject({
        kind: 'other',
        categoryCount: 2,
      });
    });

    it('has null prior amounts on All', async () => {
      const categoryId = await seedCategory(household().orgId, 'Dining');
      await insertTxns([expense(900, '2026-01-10', categoryId)], household());

      const body = await fetchOverview('/dashboard/overview');
      expect(body.categories).toEqual([
        expect.objectContaining({
          categoryId,
          priorAmountCents: null,
        }),
      ]);
    });

    it('scopes category totals to the active household', async () => {
      const mine = await seedCategory(household().orgId, 'Mine');
      const otherAccountId = await seedAccount(OTHER_ORG_ID);
      const theirs = await seedCategory(OTHER_ORG_ID, 'Theirs');
      await insertTxns([expense(100, '2026-04-01', mine)], household());
      await insertTxns([expense(999999, '2026-04-01', theirs)], {
        orgId: OTHER_ORG_ID,
        accountId: otherAccountId,
      });

      const body = await fetchOverview(
        overviewQuery({ from: '2026-04-01', to: '2026-04-30' })
      );
      expect(body.categories).toEqual([
        expect.objectContaining({ categoryId: mine, amountCents: 100 }),
      ]);
    });
  });

  describe('uncategorised spend', () => {
    it('comes last, after other, and counts towards every share', async () => {
      const ids = await seedCategories(
        household().orgId,
        numberedNames('Cat', 9)
      );
      await insertTxns(
        [
          ...ids.map((categoryId) => expense(100, '2026-03-10', categoryId)),
          expense(5000, '2026-03-11'),
          refund(900, '2026-03-12'),
        ],
        household()
      );

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories.map((row) => row.kind)).toEqual([
        ...Array<'category'>(8).fill('category'),
        'other',
        'uncategorised',
      ]);
      expect(body.categories.at(-1)).toMatchObject({
        kind: 'uncategorised',
        amountCents: 4100,
        shareOfPeriod: 4100 / 5000,
      });
      expect(body.categories.at(0)?.shareOfPeriod).toBe(100 / 5000);
      const shareTotal = body.categories.reduce(
        (sum, row) => sum + (row.shareOfPeriod ?? 0),
        0
      );
      expect(shareTotal).toBeCloseTo(1, 5);
    });

    it('carries the prior window’s uncategorised net spend on ranged windows', async () => {
      await insertTxns(
        [
          expense(400, '2026-03-03'),
          expense(900, '2026-02-03'),
          refund(200, '2026-02-04'),
        ],
        household()
      );

      const body = await fetchOverview(
        overviewQuery({ from: '2026-03-01', to: '2026-03-05', shortcut: 'mtd' })
      );
      expect(body.categories).toEqual([
        {
          kind: 'uncategorised',
          amountCents: 400,
          shareOfPeriod: 1,
          priorAmountCents: 700,
        },
      ]);
    });

    it('is shown with no share when refunds exceed its spend', async () => {
      const categoryId = await seedCategory(household().orgId, 'Dining');
      await insertTxns(
        [
          expense(300, '2026-03-03', categoryId),
          expense(1000, '2026-03-04'),
          refund(1500, '2026-03-05'),
        ],
        household()
      );

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories).toEqual([
        expect.objectContaining({
          kind: 'category',
          categoryId,
          shareOfPeriod: 1,
        }),
        {
          kind: 'uncategorised',
          amountCents: -500,
          shareOfPeriod: null,
          priorAmountCents: 0,
        },
      ]);
    });

    it('is left out when it nets to exactly zero', async () => {
      const categoryId = await seedCategory(household().orgId, 'Dining');
      await insertTxns(
        [
          expense(300, '2026-03-03', categoryId),
          expense(1000, '2026-03-04'),
          refund(1000, '2026-03-05'),
        ],
        household()
      );

      const body = await fetchOverview(overviewQuery(MARCH));
      expect(body.categories).toEqual([
        expect.objectContaining({ kind: 'category', categoryId }),
      ]);
    });

    it('is scoped to the active household', async () => {
      const otherAccountId = await seedAccount(OTHER_ORG_ID);
      await insertTxns([expense(100, '2026-04-01')], household());
      await insertTxns([expense(999999, '2026-04-01')], {
        orgId: OTHER_ORG_ID,
        accountId: otherAccountId,
      });

      const body = await fetchOverview(
        overviewQuery({ from: '2026-04-01', to: '2026-04-30' })
      );
      expect(body.categories).toEqual([
        {
          kind: 'uncategorised',
          amountCents: 100,
          shareOfPeriod: 1,
          priorAmountCents: 0,
        },
      ]);
    });
  });
});
