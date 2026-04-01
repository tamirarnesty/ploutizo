import { describe, it, expect } from 'vitest'
import {
  createAccountSchema,
  updateAccountSchema,
  updateHouseholdSettingsSchema,
} from './index.js'

describe('createAccountSchema', () => {
  it('accepts valid account payload', () => {
    const result = createAccountSchema.safeParse({ name: 'Chequing', type: 'chequing' })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createAccountSchema.safeParse({ type: 'chequing' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = createAccountSchema.safeParse({ name: '', type: 'chequing' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid account type', () => {
    const result = createAccountSchema.safeParse({ name: 'Test', type: 'bitcoin_wallet' })
    expect(result.success).toBe(false)
  })

  it('rejects missing type', () => {
    const result = createAccountSchema.safeParse({ name: 'Savings' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid account types', () => {
    const types = ['chequing', 'savings', 'credit_card', 'prepaid_cash', 'e_transfer', 'investment', 'other'] as const
    for (const type of types) {
      const result = createAccountSchema.safeParse({ name: 'Test', type })
      expect(result.success).toBe(true)
    }
  })

  it('accepts optional fields', () => {
    const result = createAccountSchema.safeParse({
      name: 'Visa',
      type: 'credit_card',
      institution: 'TD Bank',
      lastFour: '1234',
      eachPersonPaysOwn: true,
      memberIds: ['123e4567-e89b-12d3-a456-426614174000'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects lastFour longer than 4 chars', () => {
    const result = createAccountSchema.safeParse({ name: 'Test', type: 'chequing', lastFour: '12345' })
    expect(result.success).toBe(false)
  })

  it('defaults eachPersonPaysOwn to false', () => {
    const result = createAccountSchema.safeParse({ name: 'Test', type: 'chequing' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.eachPersonPaysOwn).toBe(false)
    }
  })

  it('defaults memberIds to empty array', () => {
    const result = createAccountSchema.safeParse({ name: 'Test', type: 'chequing' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.memberIds).toEqual([])
    }
  })
})

describe('updateAccountSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateAccountSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial update', () => {
    const result = updateAccountSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts archivedAt as ISO datetime string', () => {
    const result = updateAccountSchema.safeParse({ archivedAt: '2024-01-01T00:00:00Z' })
    expect(result.success).toBe(true)
  })

  it('accepts archivedAt as null', () => {
    const result = updateAccountSchema.safeParse({ archivedAt: null })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type in partial update', () => {
    const result = updateAccountSchema.safeParse({ type: 'bad_type' })
    expect(result.success).toBe(false)
  })
})

describe('updateHouseholdSettingsSchema', () => {
  it('accepts valid positive threshold', () => {
    const result = updateHouseholdSettingsSchema.safeParse({ settlementThreshold: 5000 })
    expect(result.success).toBe(true)
  })

  it('accepts zero threshold', () => {
    const result = updateHouseholdSettingsSchema.safeParse({ settlementThreshold: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts null threshold', () => {
    const result = updateHouseholdSettingsSchema.safeParse({ settlementThreshold: null })
    expect(result.success).toBe(true)
  })

  it('rejects negative threshold', () => {
    const result = updateHouseholdSettingsSchema.safeParse({ settlementThreshold: -100 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer threshold', () => {
    const result = updateHouseholdSettingsSchema.safeParse({ settlementThreshold: 49.99 })
    expect(result.success).toBe(false)
  })

  it('rejects missing settlementThreshold', () => {
    const result = updateHouseholdSettingsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
