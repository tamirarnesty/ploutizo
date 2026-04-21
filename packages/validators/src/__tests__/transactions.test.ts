import { describe, it, expect } from 'vitest'
import { createTransactionSchema, updateTransactionSchema } from '../transactions'

// Shared base payload for all type variants
const baseFields = {
  accountId: '550e8400-e29b-41d4-a716-446655440000',
  amount: 1000,
  date: '2024-01-15',
  description: 'Test transaction',
}

// ---------------------------------------------------------------------------
// VAL-01 — baseTransactionSchema: merchant removed, notes added
// ---------------------------------------------------------------------------
describe('VAL-01 — baseTransactionSchema field changes', () => {
  it('accepts payload without notes (notes is optional)', () => {
    const result = createTransactionSchema.safeParse({ ...baseFields, type: 'expense' })
    expect(result.success).toBe(true)
  })

  it('accepts payload with notes as optional string', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'expense',
      notes: 'coffee run',
    })
    expect(result.success).toBe(true)
  })

  it('schema does not declare merchant field on any variant', () => {
    // Access expense variant shape via Zod v4 discriminated union optionsMap
    const expenseSchema = createTransactionSchema.optionsMap.get('expense')
    expect(expenseSchema).toBeDefined()
    // merchant must NOT be in the shape
    expect('merchant' in (expenseSchema as { shape: Record<string, unknown> }).shape).toBe(false)
  })

  it('schema does not declare merchant on base fields (refund variant check)', () => {
    const refundSchema = createTransactionSchema.optionsMap.get('refund')
    expect(refundSchema).toBeDefined()
    expect('merchant' in (refundSchema as { shape: Record<string, unknown> }).shape).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// VAL-02 — transferTransactionSchema: toAccountId → counterpartAccountId
// ---------------------------------------------------------------------------
describe('VAL-02 — transferTransactionSchema field rename', () => {
  it('rejects transfer payload with old toAccountId field (no counterpartAccountId)', () => {
    // Old field: toAccountId — now counterpartAccountId is required; passing toAccountId alone should fail
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
      toAccountId: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(result.success).toBe(false)
  })

  it('accepts transfer payload with counterpartAccountId', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(result.success).toBe(true)
  })

  it('rejects transfer payload missing counterpartAccountId (it is required)', () => {
    const result = createTransactionSchema.safeParse({
      ...baseFields,
      type: 'transfer',
    })
    expect(result.success).toBe(false)
  })

  it('schema declares counterpartAccountId on transfer variant', () => {
    const transferSchema = createTransactionSchema.optionsMap.get('transfer')
    expect(transferSchema).toBeDefined()
    expect('counterpartAccountId' in (transferSchema as { shape: Record<string, unknown> }).shape).toBe(true)
  })

  it('schema does not declare toAccountId on transfer variant', () => {
    const transferSchema = createTransactionSchema.optionsMap.get('transfer')
    expect(transferSchema).toBeDefined()
    expect('toAccountId' in (transferSchema as { shape: Record<string, unknown> }).shape).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// VAL-03 — updateTransactionSchema: counterpartAccountId replaces old FK fields
// ---------------------------------------------------------------------------
describe('VAL-03 — updateTransactionSchema field changes', () => {
  it('rejects payload with settledAccountId (old field)', () => {
    // settledAccountId must not exist in schema — Zod strips unknown keys so we check shape
    expect('settledAccountId' in (updateTransactionSchema.shape as Record<string, unknown>)).toBe(false)
  })

  it('rejects payload with toAccountId (old field)', () => {
    expect('toAccountId' in (updateTransactionSchema.shape as Record<string, unknown>)).toBe(false)
  })

  it('accepts payload with counterpartAccountId as valid UUID', () => {
    const result = updateTransactionSchema.safeParse({
      counterpartAccountId: '550e8400-e29b-41d4-a716-446655440002',
    })
    expect(result.success).toBe(true)
  })

  it('accepts payload with counterpartAccountId absent (optional)', () => {
    const result = updateTransactionSchema.safeParse({
      amount: 2000,
    })
    expect(result.success).toBe(true)
  })

  it('schema declares counterpartAccountId on updateTransactionSchema', () => {
    expect('counterpartAccountId' in (updateTransactionSchema.shape as Record<string, unknown>)).toBe(true)
  })

  it('schema does not declare investmentType on updateTransactionSchema', () => {
    expect('investmentType' in (updateTransactionSchema.shape as Record<string, unknown>)).toBe(false)
  })

  it('schema does not declare incomeSource on updateTransactionSchema', () => {
    expect('incomeSource' in (updateTransactionSchema.shape as Record<string, unknown>)).toBe(false)
  })
})
