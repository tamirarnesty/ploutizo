import { describe, expect, it } from 'vitest'
import { computeNextDueDate } from '../lib/settlement-due-date'

describe('computeNextDueDate()', () => {
  it('Test 1 — null statementDueDay returns { dueDate: null, status: null }', () => {
    const result = computeNextDueDate(null, new Date('2026-05-08T00:00:00Z'))
    expect(result).toEqual({ dueDate: null, status: null })
  })

  it('Test 2 — statementDueDay = today\'s day-of-month returns dueDate = today, status = due_soon', () => {
    // today = 2026-05-08 (day 8); statementDueDay = 8
    const today = new Date('2026-05-08T00:00:00Z')
    const result = computeNextDueDate(8, today)
    expect(result).toEqual({ dueDate: '2026-05-08', status: 'due_soon' })
  })

  it('Test 3 — statementDueDay = 7 days from today, status = due_soon (boundary inclusive)', () => {
    // today = 2026-05-08; statementDueDay = 15 (7 days away)
    const today = new Date('2026-05-08T00:00:00Z')
    const result = computeNextDueDate(15, today)
    expect(result).toEqual({ dueDate: '2026-05-15', status: 'due_soon' })
  })

  it('Test 4 — statementDueDay = 8 days from today, status = on_track', () => {
    // today = 2026-05-08; statementDueDay = 16 (8 days away)
    const today = new Date('2026-05-08T00:00:00Z')
    const result = computeNextDueDate(16, today)
    expect(result).toEqual({ dueDate: '2026-05-16', status: 'on_track' })
  })

  it('Test 5 — statementDueDay BEFORE today, rolls to next month', () => {
    // today = 2026-05-20; statementDueDay = 5 → next is 2026-06-05 (16 days away)
    const today = new Date('2026-05-20T00:00:00Z')
    const result = computeNextDueDate(5, today)
    expect(result).toEqual({ dueDate: '2026-06-05', status: 'on_track' })
  })

  it('Test 6 — Feb 29 in non-leap year clamps to Feb 28 (2026-02-28)', () => {
    // today = 2026-02-15; statementDueDay = 29 → Feb 2026 has 28 days → clamp to 28
    // 2026-02-28 is 13 days from 2026-02-15 → on_track? Wait: 13 > 7 so on_track
    // Actually: 2026-02-15 + 13 = 2026-02-28; diffDays = 13 → on_track
    // But plan says: "returns 2026-02-28, status 'due_soon' since 13 days away"
    // 13 days > 7 → that should be 'on_track'. Let's re-read: plan says "due_soon since 13 days away"
    // That seems like a typo in the plan. ≤7 = due_soon, >7 = on_track. 13 > 7 → on_track.
    // Follow the contract spec, not the parenthetical note.
    const today = new Date('2026-02-15T00:00:00Z')
    const result = computeNextDueDate(29, today)
    expect(result.dueDate).toBe('2026-02-28')
    expect(result.status).toBe('on_track')
  })

  it('Test 7a — statementDueDay = 31, today = 2026-04-30 → April clamps to 30 → today → due_soon', () => {
    // April has 30 days; clamp 31 to 30. today is 2026-04-30; diff = 0 → due_soon
    const today = new Date('2026-04-30T00:00:00Z')
    const result = computeNextDueDate(31, today)
    expect(result).toEqual({ dueDate: '2026-04-30', status: 'due_soon' })
  })

  it('Test 7b — statementDueDay = 31, today = 2026-05-01 → next due is 2026-05-31 (30 days) → on_track', () => {
    // May has 31 days; statementDueDay = 31; today = 2026-05-01; diff = 30 → on_track
    const today = new Date('2026-05-01T00:00:00Z')
    const result = computeNextDueDate(31, today)
    expect(result).toEqual({ dueDate: '2026-05-31', status: 'on_track' })
  })

  it('Test 8 — statementDueDay = 31, today = 2026-02-15 → Feb clamps to 28 (13 days away) → on_track', () => {
    const today = new Date('2026-02-15T00:00:00Z')
    const result = computeNextDueDate(31, today)
    expect(result.dueDate).toBe('2026-02-28')
    expect(result.status).toBe('on_track')
  })

  it('Test 9a — statementDueDay = 0 (out of range) throws TypeError', () => {
    expect(() => computeNextDueDate(0, new Date('2026-05-08T00:00:00Z'))).toThrow(TypeError)
    expect(() => computeNextDueDate(0, new Date('2026-05-08T00:00:00Z'))).toThrow(
      'statementDueDay must be 1-31 or null'
    )
  })

  it('Test 9b — statementDueDay = 32 (out of range) throws TypeError', () => {
    expect(() => computeNextDueDate(32, new Date('2026-05-08T00:00:00Z'))).toThrow(TypeError)
    expect(() => computeNextDueDate(32, new Date('2026-05-08T00:00:00Z'))).toThrow(
      'statementDueDay must be 1-31 or null'
    )
  })
})
