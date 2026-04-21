import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createTransactionSchema, updateTransactionSchema } from '../transactions'

// Shared base payload for all type variants
const baseFields = {
  accountId: '550e8400-e29b-41d4-a716-446655440000',
  amount: 1000,
  date: '2024-01-15',
  description: 'Test transaction',
}

// Helper: find a variant schema by its discriminant value from the discriminated union.
// Zod v4 discriminated unions expose `.options` (array of ZodObject), not `.optionsMap`.
// Each option's shape is accessible via `.shape` (which is an alias for `.def.shape`).
// ZodLiteral.def.values is a plain array (not Set) in Zod v4.
function getVariantShape(discriminantValue: string): Record<string, unknown> {
  const option = createTransactionSchema.options.find(
    (o) => 'type' in o.shape && (o.shape.type as z.ZodLiteral<string>).def.values.includes(discriminantValue)
  )
  if (!option) throw new Error(`No variant found for type="${discriminantValue}"`)
  return option.shape as Record<string, unknown>
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

  it('schema does not declare merchant field on expense variant', () => {
    const shape = getVariantShape('expense')
    expect('merchant' in shape).toBe(false)
  })

  it('schema does not declare merchant on refund variant', () => {
    const shape = getVariantShape('refund')
    expect('merchant' in shape).toBe(false)
  })

  it('schema declares notes on expense variant', () => {
    const shape = getVariantShape('expense')
    expect('notes' in shape).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// VAL-02 — transferTransactionSchema: toAccountId → counterpartAccountId
// ---------------------------------------------------------------------------
describe('VAL-02 — transferTransactionSchema field rename', () => {
  it('rejects transfer payload with old toAccountId field (no counterpartAccountId)', () => {
    // toAccountId is stripped (unknown key) and counterpartAccountId is required → fails
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
    const shape = getVariantShape('transfer')
    expect('counterpartAccountId' in shape).toBe(true)
  })

  it('schema does not declare toAccountId on transfer variant', () => {
    const shape = getVariantShape('transfer')
    expect('toAccountId' in shape).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// VAL-03 — updateTransactionSchema: counterpartAccountId replaces old FK fields
// ---------------------------------------------------------------------------
describe('VAL-03 — updateTransactionSchema field changes', () => {
  it('schema does not declare settledAccountId (old field)', () => {
    expect('settledAccountId' in (updateTransactionSchema.shape as Record<string, unknown>)).toBe(false)
  })

  it('schema does not declare toAccountId (old field)', () => {
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
