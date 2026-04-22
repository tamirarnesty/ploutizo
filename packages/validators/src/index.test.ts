import { describe, it, expect } from 'vitest'
import {
  createAccountSchema,
  updateAccountSchema,
  updateHouseholdSettingsSchema,
  AccountFormSchema,
  CategoryFormSchema,
  RuleFormSchema,
  HouseholdSettingsFormSchema,
  createTransactionSchema,
  updateTransactionSchema,
} from './index'

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

describe('AccountFormSchema', () => {
  it('accepts valid full account form payload', () => {
    const result = AccountFormSchema.safeParse({
      name: 'TD Chequing',
      type: 'chequing',
      ownership: 'personal',
      memberIds: [],
      eachPersonPaysOwn: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name with correct message', () => {
    const result = AccountFormSchema.safeParse({
      name: '',
      type: 'chequing',
      ownership: 'personal',
      memberIds: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
      expect(nameErrors[0]?.message).toBe('Account name is required.')
    }
  })

  it('rejects invalid type with invalid_enum_value error', () => {
    const result = AccountFormSchema.safeParse({
      name: 'x',
      type: 'invalid_type',
      ownership: 'personal',
      memberIds: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const typeErrors = result.error.issues.filter((i) => i.path.includes('type'))
      expect(typeErrors[0]?.code).toBe('invalid_value')
    }
  })

  it('rejects non-uuid memberIds', () => {
    const result = AccountFormSchema.safeParse({
      name: 'x',
      type: 'chequing',
      ownership: 'shared',
      memberIds: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const memberErrors = result.error.issues.filter((i) =>
        i.path.some((p) => p === 'memberIds' || typeof p === 'number')
      )
      expect(memberErrors.length).toBeGreaterThan(0)
    }
  })
})

describe('CategoryFormSchema', () => {
  it('accepts name-only payload', () => {
    const result = CategoryFormSchema.safeParse({ name: 'Food' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name with correct message', () => {
    const result = CategoryFormSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameErrors = result.error.issues.filter((i) => i.path.includes('name'))
      expect(nameErrors[0]?.message).toBe('Category name is required.')
    }
  })

  it('accepts optional icon and colour fields', () => {
    const result = CategoryFormSchema.safeParse({
      name: 'Food',
      icon: 'Utensils',
      colour: '#f00',
    })
    expect(result.success).toBe(true)
  })
})

describe('RuleFormSchema', () => {
  it('accepts valid rule with null categoryId', () => {
    const result = RuleFormSchema.safeParse({
      pattern: 'AMAZON',
      matchType: 'contains',
      renameTo: '',
      categoryId: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty pattern with correct message', () => {
    const result = RuleFormSchema.safeParse({
      pattern: '',
      matchType: 'contains',
      categoryId: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const patternErrors = result.error.issues.filter((i) => i.path.includes('pattern'))
      expect(patternErrors[0]?.message).toBe('Pattern is required.')
    }
  })

  it('accepts valid UUID categoryId', () => {
    const result = RuleFormSchema.safeParse({
      pattern: 'x',
      matchType: 'contains',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })
})

describe('HouseholdSettingsFormSchema', () => {
  it('accepts valid positive dollar string', () => {
    const result = HouseholdSettingsFormSchema.safeParse({ thresholdDollars: '50' })
    expect(result.success).toBe(true)
  })

  it('rejects negative dollar string with correct message', () => {
    const result = HouseholdSettingsFormSchema.safeParse({ thresholdDollars: '-5' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes('thresholdDollars'))
      expect(errors[0]?.message).toBe('Must be a positive number.')
    }
  })

  it('rejects non-numeric string with correct message', () => {
    const result = HouseholdSettingsFormSchema.safeParse({ thresholdDollars: 'abc' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path.includes('thresholdDollars'))
      expect(errors[0]?.message).toBe('Must be a positive number.')
    }
  })

  it('accepts empty object (thresholdDollars is optional)', () => {
    const result = HouseholdSettingsFormSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('createTransactionSchema — common fields', () => {
  const validExpense = {
    type: 'expense' as const,
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1000,
    date: '2024-01-15',
    description: 'Test expense',
  }

  it('accepts valid expense payload', () => {
    expect(createTransactionSchema.safeParse(validExpense).success).toBe(true)
  })

  it('rejects amount=0 (must be positive)', () => {
    expect(createTransactionSchema.safeParse({ ...validExpense, amount: 0 }).success).toBe(false)
  })

  it('rejects negative amount', () => {
    expect(createTransactionSchema.safeParse({ ...validExpense, amount: -100 }).success).toBe(false)
  })

  it('rejects non-integer amount', () => {
    expect(createTransactionSchema.safeParse({ ...validExpense, amount: 1.5 }).success).toBe(false)
  })

  it('rejects ISO datetime as date (must be YYYY-MM-DD only)', () => {
    expect(createTransactionSchema.safeParse({ ...validExpense, date: '2024-01-01T00:00:00Z' }).success).toBe(false)
  })

  it('rejects US-format date MM/DD/YYYY', () => {
    expect(createTransactionSchema.safeParse({ ...validExpense, date: '01/15/2024' }).success).toBe(false)
  })

  it('rejects unknown transaction type', () => {
    expect(createTransactionSchema.safeParse({ ...validExpense, type: 'unknown_type' }).success).toBe(false)
  })
})

describe('createTransactionSchema — per-type branches', () => {
  const baseFields = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 5000,
    date: '2024-03-01',
    description: 'Test transaction',
  }

  it('accepts valid refund payload', () => {
    expect(createTransactionSchema.safeParse({ ...baseFields, type: 'refund' }).success).toBe(true)
  })

  it('accepts refund with optional refundOf uuid', () => {
    expect(createTransactionSchema.safeParse({
      ...baseFields,
      type: 'refund',
      refundOf: '550e8400-e29b-41d4-a716-446655440001',
    }).success).toBe(true)
  })

  it('accepts valid income payload with required incomeType', () => {
    expect(createTransactionSchema.safeParse({
      ...baseFields,
      type: 'income',
      incomeType: 'direct_deposit',
    }).success).toBe(true)
  })

  it('rejects income payload missing incomeType', () => {
    expect(createTransactionSchema.safeParse({ ...baseFields, type: 'income' }).success).toBe(false)
  })

  it('accepts valid transfer payload with required counterpartAccountId', () => {
    expect(createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
    }).success).toBe(true)
  })

  it('rejects transfer payload missing counterpartAccountId', () => {
    expect(createTransactionSchema.safeParse({ ...baseFields, type: 'transfer' }).success).toBe(false)
  })

  it('accepts valid settlement payload', () => {
    expect(createTransactionSchema.safeParse({ ...baseFields, type: 'settlement' }).success).toBe(true)
  })

  it('accepts valid contribution payload', () => {
    expect(createTransactionSchema.safeParse({ ...baseFields, type: 'contribution' }).success).toBe(true)
  })
})

describe('updateTransactionSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(updateTransactionSchema.safeParse({}).success).toBe(true)
  })

  it('accepts partial update with just amount', () => {
    expect(updateTransactionSchema.safeParse({ amount: 2000 }).success).toBe(true)
  })

  it('rejects amount=0 even in partial update', () => {
    expect(updateTransactionSchema.safeParse({ amount: 0 }).success).toBe(false)
  })
})
