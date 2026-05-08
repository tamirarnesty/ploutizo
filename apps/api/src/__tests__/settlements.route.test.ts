import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { settlementsRouter } from '../routes/settlements'
import { getSettlementBalances } from '../services/settlements'
import type { AppEnv } from '../types'

vi.mock('@clerk/hono', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}))

// Module-level service mock — Vitest hoists this so the imported router
// resolves the mocked service. Service unit tests live in a SEPARATE file
// (settlements.service.test.ts) so this hoist does not pollute them.
vi.mock('../services/settlements', () => ({
  getSettlementBalances: vi.fn().mockResolvedValue({ accounts: [] }),
}))

const app = new Hono<AppEnv>()
// Mount with orgId pre-set via inline middleware to mimic tenantGuard behavior in tests
app.use('/*', async (c, next) => {
  c.set('orgId', 'org_test123')
  await next()
})
app.route('/', settlementsRouter)

describe('GET /api/settlements route', () => {
  beforeEach(() => {
    vi.mocked(getSettlementBalances).mockResolvedValue({ accounts: [] })
  })

  it('GET-SETTLE-01: GET / returns 200 with accounts array shape', async () => {
    const mockAccount = {
      account: {
        id: 'acct_1',
        name: 'Amex Gold',
        type: 'credit_card',
        institution: 'American Express',
        lastFour: '1234',
        statementDueDay: 15,
      },
      totalBalanceCents: 5000,
      members: [
        {
          member: { id: 'mem_1', name: 'Alice', avatarUrl: null },
          balanceCents: 5000,
        },
      ],
      dueDate: '2026-05-15',
      status: 'due_soon' as const,
    }
    vi.mocked(getSettlementBalances).mockResolvedValueOnce({ accounts: [mockAccount] })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = (await res.json()) as { accounts: typeof mockAccount[] }
    expect(body).toHaveProperty('accounts')
    expect(Array.isArray(body.accounts)).toBe(true)
    expect(body.accounts).toHaveLength(1)
    expect(body.accounts[0]).toHaveProperty('account')
    expect(body.accounts[0]).toHaveProperty('totalBalanceCents')
    expect(body.accounts[0]).toHaveProperty('members')
    expect(body.accounts[0]).toHaveProperty('dueDate')
    expect(body.accounts[0]).toHaveProperty('status')
  })

  it('GET-SETTLE-02: service receives the orgId from c.get("orgId")', async () => {
    await app.request('/')
    expect(getSettlementBalances).toHaveBeenCalledWith('org_test123')
  })

  it('GET-SETTLE-03: empty accounts array returned as { accounts: [] } — never undefined', async () => {
    vi.mocked(getSettlementBalances).mockResolvedValueOnce({ accounts: [] })

    const res = await app.request('/')
    expect(res.status).toBe(200)

    const body = (await res.json()) as { accounts: unknown[] }
    expect(body).toHaveProperty('accounts')
    expect(Array.isArray(body.accounts)).toBe(true)
    expect(body.accounts).toHaveLength(0)
  })
})
