import { eq } from 'drizzle-orm';
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
import { accounts, orgs, transactions } from '@ploutizo/db/schema';
import type { GetDashboardOverviewResponse } from '@ploutizo/types';
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

const MARCH = {
  from: '2026-03-01',
  to: '2026-03-31',
  shortcut: 'mtd',
} as const;

const fetchOverview = async (path: string) => {
  const res = await app.request(path);
  expect(res.status).toBe(200);
  return (await res.json()) as GetDashboardOverviewResponse;
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
    await db
      .delete(transactions)
      .where(
        eq(transactions.orgId, TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId)
      );
    accountId = await seedAccount(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId);
  });

  afterAll(async () => {
    await db.delete(transactions).where(eq(transactions.orgId, OTHER_ORG_ID));
    await db.delete(accounts).where(eq(accounts.orgId, OTHER_ORG_ID));
    await db.delete(orgs).where(eq(orgs.id, OTHER_ORG_ID));
  });

  it('aggregates net spend from expenses minus refunds only', async () => {
    await insertTxns(
      [
        { type: 'expense', amount: 5000, date: '2026-03-10' },
        { type: 'refund', amount: 1500, date: '2026-03-11' },
        { type: 'transfer', amount: 9000, date: '2026-03-11' },
        { type: 'income', amount: 12000, date: '2026-03-12' },
        { type: 'settlement', amount: 2000, date: '2026-03-12' },
        { type: 'contribution', amount: 3000, date: '2026-03-13' },
      ],
      household()
    );

    const body = await fetchOverview(overviewQuery(MARCH));
    const total = body.trend.reduce((sum, row) => sum + row.amountCents, 0);
    expect(total).toBe(3500);
  });

  it('allows negative bucket totals when refunds exceed expenses', async () => {
    await insertTxns(
      [
        { type: 'expense', amount: 1000, date: '2026-03-05' },
        { type: 'refund', amount: 2500, date: '2026-03-05' },
      ],
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
      [
        { type: 'expense', amount: 400, date: '2026-02-10' },
        { type: 'expense', amount: 900, date: '2025-02-11' },
      ],
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
      [
        { type: 'expense', amount: 400, date: '2026-03-12' },
        { type: 'expense', amount: 900, date: '2026-03-02' },
      ],
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
        { type: 'expense', amount: 300, date: '2025-10-01' },
        { type: 'expense', amount: 200, date: '2025-10-05' },
        { type: 'expense', amount: 700, date: '2025-04-02' },
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
      [
        { type: 'expense', amount: 500, date: '2026-01-15' },
        { type: 'expense', amount: 700, date: '2026-03-10' },
      ],
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
    await insertTxns(
      [{ type: 'expense', amount: 100, date: '2026-04-01' }],
      household()
    );
    await insertTxns(
      [{ type: 'expense', amount: 999999, date: '2026-04-01' }],
      {
        orgId: OTHER_ORG_ID,
        accountId: otherAccountId,
      }
    );

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
      [
        { type: 'expense', amount: 500, date: '2026-01-15' },
        { type: 'expense', amount: 700, date: '2026-02-10' },
      ],
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
  });

  it('returns an empty all-time trend with no range when there is no spend', async () => {
    const body = await fetchOverview('/dashboard/overview');
    expect(body).toEqual({ meta: { kind: 'all', range: null }, trend: [] });
  });
});
