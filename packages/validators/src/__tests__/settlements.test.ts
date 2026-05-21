import { describe, expect, it } from 'vitest'
import { createSettlementSchema } from '../settlements'

const memberA = '550e8400-e29b-41d4-a716-446655440001'
const memberB = '550e8400-e29b-41d4-a716-446655440004'

const validPayload = {
  assignees: [{ memberId: memberA }],
  accountId: '550e8400-e29b-41d4-a716-446655440002',
  counterpartAccountId: '550e8400-e29b-41d4-a716-446655440003',
  amountCents: 12_500,
  date: '2026-05-08',
}

describe('createSettlementSchema — notes field (Phase 4.2 extension)', () => {
  it('accepts payload without notes (notes is optional)', () => {
    const result = createSettlementSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts payload with notes as a non-empty string', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      notes: 'paid via Interac transfer',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBe('paid via Interac transfer')
    }
  })

  it('accepts payload with empty string notes', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      notes: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-string notes', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      notes: 123,
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes longer than 1000 characters', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      notes: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts notes exactly 1000 characters', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      notes: 'a'.repeat(1000),
    })
    expect(result.success).toBe(true)
  })
})

describe('createSettlementSchema — assignees', () => {
  it('accepts multiple unique assignees', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      assignees: [{ memberId: memberA }, { memberId: memberB }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty assignees array', () => {
    expect(
      createSettlementSchema.safeParse({ ...validPayload, assignees: [] }).success
    ).toBe(false)
  })

  it('rejects duplicate memberId in assignees', () => {
    const result = createSettlementSchema.safeParse({
      ...validPayload,
      assignees: [{ memberId: memberA }, { memberId: memberA }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-UUID memberId', () => {
    expect(
      createSettlementSchema.safeParse({
        ...validPayload,
        assignees: [{ memberId: 'not-a-uuid' }],
      }).success
    ).toBe(false)
  })
})

describe('createSettlementSchema — pre-existing fields (regression)', () => {
  it('still rejects amountCents <= 0', () => {
    expect(createSettlementSchema.safeParse({ ...validPayload, amountCents: 0 }).success).toBe(false)
    expect(createSettlementSchema.safeParse({ ...validPayload, amountCents: -1 }).success).toBe(false)
  })

  it('still rejects malformed date', () => {
    expect(createSettlementSchema.safeParse({ ...validPayload, date: '05/08/2026' }).success).toBe(false)
  })
})
