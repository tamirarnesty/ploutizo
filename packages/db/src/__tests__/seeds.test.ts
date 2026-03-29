import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db client — we test behavior not actual DB inserts
vi.mock('../client.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}))

import { db } from '../client.js'

describe('seedOrgCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockInsert = vi.mocked(db.insert)
    mockInsert.mockReturnValue({ values: vi.fn(() => Promise.resolve()) } as ReturnType<typeof db.insert>)
  })

  it('calls db.insert for categories', async () => {
    const { seedOrgCategories } = await import('../seeds/categories.js')
    await seedOrgCategories('org_test123')
    expect(db.insert).toHaveBeenCalled()
  })

  it('all inserted rows have the provided orgId', async () => {
    const mockValues = vi.fn(() => Promise.resolve())
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as ReturnType<typeof db.insert>)

    const { seedOrgCategories } = await import('../seeds/categories.js')
    await seedOrgCategories('org_test123')

    const [insertedRows] = mockValues.mock.calls[0] as [Array<{ orgId: string }>]
    expect(insertedRows.every((row) => row.orgId === 'org_test123')).toBe(true)
    expect(insertedRows.every((row) => row.orgId !== null && row.orgId !== undefined)).toBe(true)
  })
})

describe('seedOrgMerchantRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.insert).mockReturnValue({ values: vi.fn(() => Promise.resolve()) } as ReturnType<typeof db.insert>)
  })

  it('all inserted rows have the provided orgId', async () => {
    const mockValues = vi.fn(() => Promise.resolve())
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as ReturnType<typeof db.insert>)

    const { seedOrgMerchantRules } = await import('../seeds/merchantRules.js')
    await seedOrgMerchantRules('org_test123')

    const [insertedRows] = mockValues.mock.calls[0] as [Array<{ orgId: string }>]
    expect(insertedRows.every((row) => row.orgId === 'org_test123')).toBe(true)
  })
})

describe('seedOrg', () => {
  it('calls both seedOrgCategories and seedOrgMerchantRules', async () => {
    const mockValues = vi.fn(() => Promise.resolve())
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as ReturnType<typeof db.insert>)

    const { seedOrg } = await import('../seeds/index.js')
    await seedOrg('org_test123')

    // Should have been called twice — once for categories, once for merchant rules
    expect(db.insert).toHaveBeenCalledTimes(2)
  })
})
