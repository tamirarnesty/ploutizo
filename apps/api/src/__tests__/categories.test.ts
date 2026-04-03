import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { categoriesRouter } from '../routes/categories.js'

vi.mock('@hono/clerk-auth', () => ({ getAuth: vi.fn(() => ({ orgId: 'org_test123' })) }))
vi.mock('@ploutizo/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'cat_1', orgId: 'org_test123', name: 'Food', icon: 'UtensilsCrossed', colour: 'green-500', sortOrder: 0, archivedAt: null, createdAt: new Date().toISOString() }]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'cat_1', orgId: 'org_test123', name: 'Food Updated', icon: null, colour: null, sortOrder: 0, archivedAt: null, createdAt: new Date().toISOString() }]) }) }) }),
    transaction: vi.fn(async (fn) => fn({ update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }) })),
  },
}))
vi.mock('@ploutizo/db/schema', () => ({ categories: {} }))

const app = new Hono()
app.route('/', categoriesRouter)

describe('GET /api/categories', () => {
  it('returns 200 with data array', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
  })
})

describe('POST /api/categories', () => {
  it('returns 201 with created category', async () => {
    const res = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Food', icon: 'UtensilsCrossed', colour: 'green-500' }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toHaveProperty('id')
  })
  it('returns 400 on missing name', async () => {
    const res = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ icon: 'ShoppingCart' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/categories/reorder', () => {
  it('returns 200 with ok true', async () => {
    const res = await app.request('/reorder', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] }) })
    expect(res.status).toBe(200)
  })
})
