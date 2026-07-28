import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../client';

// Mock db client — we test behavior not actual DB inserts
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

// Helper to create a mock insert return value (cast via unknown to satisfy Drizzle's strict types)
const mockInsertReturn = (mockValues: ReturnType<typeof vi.fn>) =>
  ({ values: mockValues }) as unknown as ReturnType<typeof db.insert>;

describe('seedOrgCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn(vi.fn(() => Promise.resolve()))
    );
  });

  it('calls db.insert for categories', async () => {
    const { seedOrgCategories } = await import('../seeds/categories');
    await seedOrgCategories('org_test123');
    expect(db.insert).toHaveBeenCalled();
  });

  it('all inserted rows have the provided orgId', async () => {
    const mockValues = vi.fn(() => Promise.resolve());
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues));

    const { seedOrgCategories } = await import('../seeds/categories');
    await seedOrgCategories('org_test123');

    const insertedRows = (
      mockValues.mock.calls[0] as unknown as [{ orgId: string; name: string }[]]
    )[0];
    expect(insertedRows.every((row) => row.orgId === 'org_test123')).toBe(true);
    expect(insertedRows.some((row) => row.name === 'Bill Payment')).toBe(true);
  });
});

describe('seedOrgMerchantRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.insert).mockReturnValue(
      mockInsertReturn(vi.fn(() => Promise.resolve()))
    );
  });

  it('all inserted rows have the provided orgId', async () => {
    const mockValues = vi.fn(() => Promise.resolve());
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues));

    const { seedOrgMerchantRules } = await import('../seeds/merchantRules');
    await seedOrgMerchantRules('org_test123');

    const insertedRows = (
      mockValues.mock.calls[0] as unknown as [{ orgId: string }[]]
    )[0];
    expect(insertedRows.every((row) => row.orgId === 'org_test123')).toBe(true);
  });
});

describe('seedOrg', () => {
  it('runs in a transaction, takes an advisory lock, and inserts categories then merchant rules when count is zero', async () => {
    vi.clearAllMocks();
    const mockValues = vi.fn(() => Promise.resolve());
    const mockExecute = vi.fn((_sqlQuery: unknown) => Promise.resolve());
    let lookupCall = 0;
    const mockTx = {
      execute: mockExecute,
      select: vi.fn((args?: unknown) => {
        if (args && typeof args === 'object' && 'n' in args) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([{ n: 0 }])),
            })),
          };
        }
        lookupCall += 1;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve(lookupCall === 1 ? [{ id: 'cat_bill' }] : [])
              ),
            })),
          })),
        };
      }),
      insert: vi.mocked(db.insert),
    };
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never);
    });
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues));

    const { seedOrg } = await import('../seeds/index');
    await seedOrg('org_test123');

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(mockExecute).toHaveBeenCalledOnce();
    const executedSql = mockExecute.mock.calls[0][0] as Record<string, unknown>;
    const sqlString = JSON.stringify(executedSql);
    expect(sqlString).toContain('pg_advisory_xact_lock');
    // categories + default merchant rules + bill payment rule
    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it('ensures Bill Payment category and rule when categories already exist', async () => {
    vi.clearAllMocks();
    const mockInsert = vi.mocked(db.insert);
    const onConflictDoNothing = vi.fn(() => Promise.resolve());
    let insertCall = 0;
    mockInsert.mockImplementation(() => {
      insertCall += 1;
      if (insertCall === 1) {
        return {
          values: vi.fn(() => ({ onConflictDoNothing })),
        } as never;
      }
      return mockInsertReturn(vi.fn(() => Promise.resolve()));
    });

    let countCalls = 0;
    let lookupCalls = 0;
    const mockTx = {
      execute: vi.fn(() => Promise.resolve()),
      select: vi.fn((args?: unknown) => {
        if (args && typeof args === 'object' && 'n' in args) {
          countCalls += 1;
          return {
            from: vi.fn(() => ({
              where: vi.fn(() =>
                Promise.resolve([{ n: countCalls === 1 ? 11 : 5 }])
              ),
            })),
          };
        }
        lookupCalls += 1;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve(lookupCalls === 1 ? [{ id: 'cat_bill' }] : [])
              ),
            })),
          })),
        };
      }),
      insert: mockInsert,
    };
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never);
    });

    const { seedOrg } = await import('../seeds/index');
    await seedOrg('org_existing');

    expect(onConflictDoNothing).toHaveBeenCalled();
    // category ensure + bill payment rule insert (no existing rule)
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('skips full category/rule inserts when both tables already have rows, but still ensures Bill Payment', async () => {
    vi.clearAllMocks();
    const mockInsert = vi.mocked(db.insert);
    const onConflictDoNothing = vi.fn(() => Promise.resolve());
    mockInsert.mockReturnValue({
      values: vi.fn(() => ({ onConflictDoNothing })),
    } as never);

    let countCalls = 0;
    let lookupCalls = 0;
    const mockTx = {
      execute: vi.fn(() => Promise.resolve()),
      select: vi.fn((args?: unknown) => {
        if (args && typeof args === 'object' && 'n' in args) {
          countCalls += 1;
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([{ n: 12 }])),
            })),
          };
        }
        lookupCalls += 1;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve(
                  lookupCalls === 1
                    ? [{ id: 'cat_bill' }]
                    : [{ id: 'rule_bill' }]
                )
              ),
            })),
          })),
        };
      }),
      insert: mockInsert,
    };
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never);
    });

    const { seedOrg } = await import('../seeds/index');
    await seedOrg('org_seeded');

    expect(countCalls).toBe(2);
    // Bill Payment category ensure still inserts with onConflictDoNothing
    expect(onConflictDoNothing).toHaveBeenCalled();
    // Existing bill payment rule means no extra rule insert beyond the ensure path
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

describe('ensureOrgSeeded', () => {
  it('does not open a transaction when categories include Bill Payment and rules exist', async () => {
    vi.clearAllMocks();
    let callCount = 0;
    // Return full category count (>=12) and non-zero merchant rules
    vi.mocked(db.select).mockImplementation(
      () =>
        ({
          from: vi.fn(() => ({
            where: vi.fn(() =>
              Promise.resolve([{ n: callCount++ === 0 ? 12 : 6 }])
            ),
          })),
        }) as never
    );

    const { ensureOrgSeeded } = await import('../seeds/index');
    await ensureOrgSeeded('org_already_seeded');

    // Transaction should NOT be called (fast path — both counts non-zero)
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
