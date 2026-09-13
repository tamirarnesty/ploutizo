import { BILL_PAYMENT_CATEGORY_NAME } from '@ploutizo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../client';
import { seedCategoryRowsForOrg } from '../seeds/categories';
import { seedMerchantRuleRowsForOrg } from '../seeds/merchantRules';

vi.mock('../client', () => {
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  }));
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ n: 0 }])),
    })),
  }));
  const mockTx = {
    execute: vi.fn(() => Promise.resolve()),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ n: 0 }])),
      })),
    })),
    insert: mockInsert,
  };
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
        await fn(mockTx);
      }),
    },
  };
});

const mockInsertReturn = (mockValues: ReturnType<typeof vi.fn>) =>
  ({ values: mockValues }) as unknown as ReturnType<typeof db.insert>;

const countSelect = (n: number) =>
  ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ n }])),
    })),
  }) as never;

const lookupSelect = (rows: { id: string }[]) =>
  ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(rows)),
      })),
    })),
  }) as never;

const isCountSelect = (args: unknown) =>
  Boolean(args && typeof args === 'object' && 'n' in args);

const selectByCounts = (counts: number[]) => {
  let i = 0;
  return vi.fn((args?: unknown) => {
    if (isCountSelect(args)) {
      return countSelect(counts[i++] ?? 0);
    }
    return lookupSelect([]);
  });
};

describe('seed rows', () => {
  it('stamps orgId on every category and includes Bill Payment', () => {
    const rows = seedCategoryRowsForOrg('org_test123');
    expect(rows.every((row) => row.orgId === 'org_test123')).toBe(true);
    expect(rows.some((row) => row.name === BILL_PAYMENT_CATEGORY_NAME)).toBe(
      true
    );
  });

  it('inserts the household default spend categories with icons, then Bill Payment', () => {
    const rows = seedCategoryRowsForOrg('org_test123');

    expect(rows.map((row) => ({ name: row.name, icon: row.icon }))).toEqual([
      { name: 'Bills', icon: 'Receipt' },
      { name: 'Entertainment', icon: 'Tv' },
      { name: 'Takeout', icon: 'Pizza' },
      { name: 'Restaurants', icon: 'UtensilsCrossed' },
      { name: 'Drinks & Treats', icon: 'Coffee' },
      { name: 'Groceries', icon: 'ShoppingCart' },
      { name: 'House', icon: 'Home' },
      { name: 'Health & Wellbeing', icon: 'HeartPulse' },
      { name: 'Shopping', icon: 'ShoppingBag' },
      { name: 'Subscriptions', icon: 'Repeat' },
      { name: 'Transport', icon: 'Bus' },
      { name: 'Gas', icon: 'Fuel' },
      { name: 'Travel', icon: 'Plane' },
      { name: 'Gifts', icon: 'Gift' },
      { name: 'Car Maintenance', icon: 'Wrench' },
      { name: 'Other', icon: 'MoreHorizontal' },
      { name: BILL_PAYMENT_CATEGORY_NAME, icon: 'CreditCard' },
    ]);
    expect(rows.map((row) => row.sortOrder)).toEqual(
      rows.map((_, index) => index)
    );
  });

  it('stamps orgId on every merchant rule', () => {
    const rows = seedMerchantRuleRowsForOrg('org_test123');
    expect(rows.every((row) => row.orgId === 'org_test123')).toBe(true);
  });
});

describe('seedOrg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn(vi.fn(() => Promise.resolve()))
    );
  });

  it('takes an advisory lock and inserts categories then merchant rules when empty', async () => {
    const mockExecute = vi.fn((_sqlQuery: unknown) => Promise.resolve());
    const mockTx = {
      execute: mockExecute,
      select: selectByCounts([0, 0]),
      insert: vi.mocked(db.insert),
    };
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never);
    });

    const { seedOrg } = await import('../seeds/index');
    await seedOrg('org_test123');

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(mockExecute).toHaveBeenCalledOnce();
    expect(JSON.stringify(mockExecute.mock.calls[0]?.[0])).toContain(
      'pg_advisory_xact_lock'
    );
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it('ensures Bill Payment and skips full inserts when both tables already have rows', async () => {
    const onConflictDoNothing = vi.fn(() => Promise.resolve());
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn(() => ({ onConflictDoNothing })),
    } as never);

    const mockTx = {
      execute: vi.fn(() => Promise.resolve()),
      select: selectByCounts([12, 6]),
      insert: vi.mocked(db.insert),
    };
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never);
    });

    const { seedOrg } = await import('../seeds/index');
    await seedOrg('org_seeded');

    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(1);
  });
});

describe('ensureOrgSeeded', () => {
  it('does not open a transaction when Bill Payment already exists', async () => {
    vi.clearAllMocks();
    vi.mocked(db.select).mockImplementation((args?: unknown) => {
      if (isCountSelect(args)) return countSelect(12);
      return lookupSelect([{ id: 'exists' }]);
    });

    const { ensureOrgSeeded } = await import('../seeds/index');
    await ensureOrgSeeded('org_already_seeded');

    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('runs seedOrg when categories exist but Bill Payment is missing', async () => {
    vi.clearAllMocks();
    vi.mocked(db.select).mockImplementation((args?: unknown) => {
      if (isCountSelect(args)) return countSelect(15);
      return lookupSelect([]);
    });

    const onConflictDoNothing = vi.fn(() => Promise.resolve());
    const mockTx = {
      execute: vi.fn(() => Promise.resolve()),
      select: selectByCounts([15, 6]),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({ onConflictDoNothing })),
      })),
    };
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never);
    });

    const { ensureOrgSeeded } = await import('../seeds/index');
    await ensureOrgSeeded('org_custom_categories');

    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
