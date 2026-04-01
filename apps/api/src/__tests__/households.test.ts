import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { householdsRouter } from '../routes/households.js'

vi.mock('@hono/clerk-auth', () => ({
  getAuth: vi.fn(() => ({ orgId: 'org_test123' })),
}))

vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ settlementThreshold: 5000 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ settlementThreshold: 10000 }]),
        }),
      }),
    }),
  },
}))

vi.mock('@ploutizo/db/schema', () => ({ orgs: {} }))

const app = new Hono()
app.route('/', householdsRouter)

describe('GET /api/households/settings', () => {
  it('returns 200 with settlementThreshold', async () => {
    const res = await app.request('/settings')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { settlementThreshold: number | null } }
    expect(body.data).toHaveProperty('settlementThreshold')
  })
})

describe('PATCH /api/households/settings', () => {
  it('returns 200 with updated threshold', async () => {
    const res = await app.request('/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementThreshold: 10000 }),
    })
    expect(res.status).toBe(200)
  })

  it('returns 400 on negative threshold', async () => {
    const res = await app.request('/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementThreshold: -100 }),
    })
    expect(res.status).toBe(400)
  })
})
