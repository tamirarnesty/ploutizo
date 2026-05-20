import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db client — we test behavior not actual DB inserts
vi.mock('../client.js', () => {
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  }))
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ n: 0 }])),
    })),
  }))
  const mockTx = {
    execute: vi.fn(() => Promise.resolve()),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ n: 0 }])),
      })),
    })),
    insert: mockInsert,
  }
  return {
    db: {
      insert: mockInsert,
      select: mockSelect,
      transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
        await fn(mockTx)
      }),
    },
  }
})

import { db } from '../client'

// Helper to create a mock insert return value (cast via unknown to satisfy Drizzle's strict types)
const mockInsertReturn = (mockValues: ReturnType<typeof vi.fn>) =>
  ({ values: mockValues } as unknown as ReturnType<typeof db.insert>)

describe('seedOrgCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(vi.fn(() => Promise.resolve())))
  })

  it('calls db.insert for categories', async () => {
    const { seedOrgCategories } = await import('../seeds/categories.js')
    await seedOrgCategories('org_test123')
    expect(db.insert).toHaveBeenCalled()
  })

  it('all inserted rows have the provided orgId', async () => {
    const mockValues = vi.fn(() => Promise.resolve())
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues))

    const { seedOrgCategories } = await import('../seeds/categories.js')
    await seedOrgCategories('org_test123')

    const insertedRows = (mockValues.mock.calls[0] as unknown as [{ orgId: string }[]])[0]
    expect(insertedRows.every((row) => row.orgId === 'org_test123')).toBe(true)
    expect(insertedRows.every((row) => row.orgId !== null && row.orgId !== undefined)).toBe(true)
  })
})

describe('seedOrgMerchantRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(vi.fn(() => Promise.resolve())))
  })

  it('all inserted rows have the provided orgId', async () => {
    const mockValues = vi.fn(() => Promise.resolve())
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues))

    const { seedOrgMerchantRules } = await import('../seeds/merchantRules.js')
    await seedOrgMerchantRules('org_test123')

    const insertedRows = (mockValues.mock.calls[0] as unknown as [{ orgId: string }[]])[0]
    expect(insertedRows.every((row) => row.orgId === 'org_test123')).toBe(true)
  })
})

describe('seedOrg', () => {
  it('runs in a transaction, takes an advisory lock, and inserts categories then merchant rules when count is zero', async () => {
    vi.clearAllMocks()
    const mockValues = vi.fn(() => Promise.resolve())
    const mockExecute = vi.fn((_sqlQuery: unknown) => Promise.resolve())
    const mockTx = {
      execute: mockExecute,
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ n: 0 }])),
        })),
      })),
      insert: vi.mocked(db.insert),
    }
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never)
    })
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues))

    const { seedOrg } = await import('../seeds/index.js')
    await seedOrg('org_test123')

    expect(db.transaction).toHaveBeenCalledOnce()
    expect(mockExecute).toHaveBeenCalledOnce()
    const executedSql = mockExecute.mock.calls[0][0] as Record<string, unknown>
    const sqlString = JSON.stringify(executedSql)
    expect(sqlString).toContain('pg_advisory_xact_lock')
    expect(db.insert).toHaveBeenCalledTimes(2)
  })

  it('does not insert when the org already has categories (count under lock)', async () => {
    vi.clearAllMocks()
    const mockInsert = vi.mocked(db.insert)
    const mockTx = {
      execute: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ n: 11 }])),
        })),
      })),
      insert: mockInsert,
    }
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never)
    })

    const { seedOrg } = await import('../seeds/index.js')
    await seedOrg('org_seeded')

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('backfills only the missing table when one table is present and the other is empty', async () => {
    vi.clearAllMocks()
    const mockValues = vi.fn(() => Promise.resolve())
    const mockInsert = vi.mocked(db.insert)
    let callCount = 0
    const mockTx = {
      execute: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          // First call returns count 5 (categories present), second call returns count 0 (merchant rules missing)
          where: vi.fn(() => Promise.resolve([{ n: callCount++ === 0 ? 5 : 0 }])),
        })),
      })),
      insert: mockInsert,
    }
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => {
      await fn(mockTx as never)
    })
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues))

    const { seedOrg } = await import('../seeds/index.js')
    await seedOrg('org_partial')

    // Should insert only once (for merchant rules, not categories)
    expect(mockInsert).toHaveBeenCalledOnce()
  })
})

describe('ensureOrgSeeded', () => {
  it('does not open a transaction when both table counts are already non-zero', async () => {
    vi.clearAllMocks()
    let callCount = 0
    // Return non-zero counts for both categories and merchant rules
    vi.mocked(db.select).mockImplementation(
      () =>
        ({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ n: callCount++ === 0 ? 5 : 3 }])),
          })),
        }) as never
    )

    const { ensureOrgSeeded } = await import('../seeds/index.js')
    await ensureOrgSeeded('org_already_seeded')

    // Transaction should NOT be called (fast path — both counts non-zero)
    expect(db.transaction).not.toHaveBeenCalled()
  })
})
