import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSettlementBalances } from '../lib/queries/settlements'
import { getSettlementBalances } from '../services/settlements'
import type { SettlementBalanceRow } from '../lib/queries/settlements'

// Mock the QUERY layer only. The service module is NOT mocked here —
// the real getSettlementBalances code runs against the mocked query rows.
vi.mock('../lib/queries/settlements', () => ({
  fetchSettlementBalances: vi.fn(),
}))

const baseRow: SettlementBalanceRow = {
  accountId: 'a1',
  accountName: 'Amex',
  accountType: 'credit_card',
  institution: null,
  lastFour: null,
  statementDueDay: null,
  memberId: 'm1',
  memberName: 'Alice',
  memberAvatarUrl: null,
  balanceCents: 0,
}

describe('getSettlementBalances service', () => {
  beforeEach(() => {
    vi.mocked(fetchSettlementBalances).mockReset()
  })

  it('GET-SETTLE-04: omits accounts where all member balances are zero (D-08)', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, memberId: 'm1', memberName: 'Alice', balanceCents: 0 },
      { ...baseRow, memberId: 'm2', memberName: 'Bob', balanceCents: 0 },
    ])
    const r = await getSettlementBalances('org_test123')
    expect(r.accounts).toHaveLength(0)
  })

  it('GET-SETTLE-05: statementDueDay null => dueDate: null, status: null', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, statementDueDay: null, balanceCents: 5000 },
    ])
    const r = await getSettlementBalances('org_test123')
    expect(r.accounts).toHaveLength(1)
    expect(r.accounts[0].dueDate).toBeNull()
    expect(r.accounts[0].status).toBeNull()
  })

  it('GET-SETTLE-06: statementDueDay set, today 5 days before => due_soon', async () => {
    // today = 2026-05-15, statementDueDay = 20 → dueDate = 2026-05-20 (5 days away → due_soon)
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, statementDueDay: 20, balanceCents: 5000 },
    ])
    const now = new Date('2026-05-15T00:00:00Z')
    const r = await getSettlementBalances('org_test123', now)
    expect(r.accounts).toHaveLength(1)
    expect(r.accounts[0].dueDate).toBe('2026-05-20')
    expect(r.accounts[0].status).toBe('due_soon')
  })

  it('GET-SETTLE-07: totalBalanceCents = sum of member balances', async () => {
    vi.mocked(fetchSettlementBalances).mockResolvedValueOnce([
      { ...baseRow, memberId: 'm1', memberName: 'Alice', balanceCents: 5000 },
      { ...baseRow, memberId: 'm2', memberName: 'Bob', balanceCents: -1000 },
    ])
    const r = await getSettlementBalances('org_test123')
    expect(r.accounts).toHaveLength(1)
    expect(r.accounts[0].totalBalanceCents).toBe(4000)
    expect(r.accounts[0].members).toHaveLength(2)
  })
})
