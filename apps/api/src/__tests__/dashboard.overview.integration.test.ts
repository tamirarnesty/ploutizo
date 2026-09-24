import path from 'node:path';
import { config as loadEnv } from 'dotenv';
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
import { dashboardRouter } from '../routes/dashboard';
import { TEST_HOUSEHOLD_PRINCIPAL, createRouteTestApp } from './testUtils';

loadEnv({ path: path.resolve(import.meta.dirname, '../.env') });

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

const insertTxn = async (
  orgId: string,
  accountId: string,
  input: {
    type: (typeof transactions.$inferInsert)['type'];
    amount: number;
    date: string;
    description?: string;
  }
) => {
  await db.insert(transactions).values({
    orgId,
    accountId,
    type: input.type,
    amount: input.amount,
    date: input.date,
    description: input.description ?? input.type,
  });
};

describe.runIf(Boolean(process.env.DATABASE_URL))(
  'GET /api/dashboard/overview integration',
  () => {
    let accountId: string;

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
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'expense',
        amount: 5000,
        date: '2026-03-10',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'refund',
        amount: 1500,
        date: '2026-03-11',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'transfer',
        amount: 9000,
        date: '2026-03-11',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'income',
        amount: 12000,
        date: '2026-03-12',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'settlement',
        amount: 2000,
        date: '2026-03-12',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'contribution',
        amount: 3000,
        date: '2026-03-13',
      });

      const res = await app.request(
        '/dashboard/overview?from=2026-03-01&to=2026-03-31'
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        trend: { bucketStart: string; amountCents: number }[];
      };
      const total = body.trend.reduce((sum, row) => sum + row.amountCents, 0);
      expect(total).toBe(3500);
    });

    it('allows negative bucket totals when refunds exceed expenses', async () => {
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'expense',
        amount: 1000,
        date: '2026-03-05',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'refund',
        amount: 2500,
        date: '2026-03-05',
      });

      const res = await app.request(
        '/dashboard/overview?from=2026-03-01&to=2026-03-31'
      );
      const body = (await res.json()) as {
        trend: { bucketStart: string; amountCents: number }[];
      };
      const day = body.trend.find((row) => row.bucketStart === '2026-03-05');
      expect(day?.amountCents).toBe(-1500);
    });

    it('returns daily grain for short spans and prior MTD clamping metadata', async () => {
      const res = await app.request(
        '/dashboard/overview?from=2026-03-01&to=2026-03-15'
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        meta: {
          range: {
            grain: string;
            priorFrom: string | null;
            priorTo: string | null;
          };
        };
      };
      expect(body.meta.range.grain).toBe('daily');
      expect(body.meta.range.priorFrom).toBe('2026-02-01');
      expect(body.meta.range.priorTo).toBe('2026-02-15');
    });

    it('returns All with no prior amounts', async () => {
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'expense',
        amount: 800,
        date: '2025-11-03',
      });
      const res = await app.request('/dashboard/overview');
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        meta: { range: { from: string | null; priorFrom: string | null } };
        trend: { priorAmountCents: number | null }[];
      };
      expect(body.meta.range.from).toBeNull();
      expect(body.meta.range.priorFrom).toBeNull();
      expect(body.trend.every((row) => row.priorAmountCents === null)).toBe(
        true
      );
    });

    it('scopes results to the active household', async () => {
      const otherAccountId = await seedAccount(OTHER_ORG_ID);
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'expense',
        amount: 100,
        date: '2026-04-01',
      });
      await insertTxn(OTHER_ORG_ID, otherAccountId, {
        type: 'expense',
        amount: 999999,
        date: '2026-04-01',
      });

      const res = await app.request(
        '/dashboard/overview?from=2026-04-01&to=2026-04-30'
      );
      const body = (await res.json()) as {
        trend: { amountCents: number }[];
      };
      const total = body.trend.reduce((sum, row) => sum + row.amountCents, 0);
      expect(total).toBe(100);
    });

    it('rejects partial or invalid date params', async () => {
      const partial = await app.request('/dashboard/overview?from=2026-01-01');
      expect(partial.status).toBe(400);

      const invalid = await app.request(
        '/dashboard/overview?from=2026-13-40&to=2026-01-31'
      );
      expect(invalid.status).toBe(400);
    });

    it('maps prior-period amounts onto the current buckets by index', async () => {
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'expense',
        amount: 400,
        date: '2026-03-03',
      });
      await insertTxn(TEST_HOUSEHOLD_PRINCIPAL.activeHouseholdId, accountId, {
        type: 'expense',
        amount: 900,
        date: '2026-02-03',
      });

      const res = await app.request(
        '/dashboard/overview?from=2026-03-01&to=2026-03-05'
      );
      const body = (await res.json()) as {
        trend: {
          bucketStart: string;
          amountCents: number;
          priorAmountCents: number | null;
        }[];
      };
      const marchThird = body.trend.find(
        (row) => row.bucketStart === '2026-03-03'
      );
      expect(marchThird?.amountCents).toBe(400);
      expect(marchThird?.priorAmountCents).toBe(900);
    });
  }
);
