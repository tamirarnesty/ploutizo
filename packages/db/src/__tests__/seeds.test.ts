import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db client — we test behavior not actual DB inserts
vi.mock('../client.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}))

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
  it('calls both seedOrgCategories and seedOrgMerchantRules', async () => {
    vi.clearAllMocks()
    const mockValues = vi.fn(() => Promise.resolve())
    vi.mocked(db.insert).mockReturnValue(mockInsertReturn(mockValues))

    const { seedOrg } = await import('../seeds/index.js')
    await seedOrg('org_test123')

    // Should have been called twice — once for categories, once for merchant rules
    expect(db.insert).toHaveBeenCalledTimes(2)
  })
})
